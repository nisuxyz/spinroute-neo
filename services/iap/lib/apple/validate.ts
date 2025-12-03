/**
 * Apple receipt validation and JWS decoding utilities
 */

import { createLogger } from '../logger';
import { config } from '../config';
import type {
  NotificationPayloadV2,
  TransactionInfo,
  RenewalInfo,
  VerifyReceiptResponse,
  ReceiptInApp,
  AppleSubscriptionData,
} from './types';

const logger = createLogger('AppleValidation');

// Apple verification endpoints
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

/**
 * Decode a JWS (JSON Web Signature) payload from Apple.
 *
 * Note: In production, you should verify the signature using Apple's public certificates.
 * For simplicity, this implementation only decodes the payload without signature verification.
 *
 * @param jws - The JWS string from Apple
 * @returns The decoded payload
 */
export function decodeJWS<T>(jws: string): T {
  try {
    // JWS format: header.payload.signature
    const parts = jws.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWS format');
    }

    // Decode the payload (second part)
    const payload = parts[1]!;
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonString = atob(base64);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error('Failed to decode JWS', error);
    throw new Error('Failed to decode Apple JWS payload');
  }
}

/**
 * Decode the notification payload from an Apple webhook
 */
export function decodeNotificationPayload(signedPayload: string): NotificationPayloadV2 {
  return decodeJWS<NotificationPayloadV2>(signedPayload);
}

/**
 * Decode transaction info from a signed transaction JWS
 */
export function decodeTransactionInfo(signedTransactionInfo: string): TransactionInfo {
  return decodeJWS<TransactionInfo>(signedTransactionInfo);
}

/**
 * Decode renewal info from a signed renewal JWS
 */
export function decodeRenewalInfo(signedRenewalInfo: string): RenewalInfo {
  return decodeJWS<RenewalInfo>(signedRenewalInfo);
}

/**
 * Validate a receipt with Apple's verifyReceipt endpoint.
 * Used for initial purchase validation from the mobile app.
 *
 * @param receiptData - Base64-encoded receipt data from the device
 * @returns The Apple verification response
 */
export async function validateAppleReceipt(receiptData: string): Promise<VerifyReceiptResponse> {
  const sharedSecret = config.apple?.sharedSecret;

  if (!sharedSecret) {
    throw new Error('APPLE_SHARED_SECRET not configured');
  }

  const requestBody = {
    'receipt-data': receiptData,
    password: sharedSecret,
    'exclude-old-transactions': true,
  };

  // Try production first
  let response = await fetch(APPLE_PRODUCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  let result = (await response.json()) as VerifyReceiptResponse;

  // Status 21007 means this is a sandbox receipt, retry with sandbox URL
  if (result.status === 21007) {
    logger.info('Sandbox receipt detected, retrying with sandbox URL');
    response = await fetch(APPLE_SANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    result = (await response.json()) as VerifyReceiptResponse;
  }

  if (result.status !== 0) {
    logger.error('Apple receipt validation failed', undefined, {
      status: result.status,
    });
    throw new Error(`Apple receipt validation failed with status ${result.status}`);
  }

  return result;
}

/**
 * Extract the latest subscription info from a receipt response.
 * Returns the most recent subscription transaction.
 */
export function getLatestSubscriptionInfo(response: VerifyReceiptResponse): ReceiptInApp | null {
  const subscriptions = response.latest_receipt_info || [];

  if (subscriptions.length === 0) {
    return null;
  }

  // Sort by expires_date_ms descending to get the latest
  const sorted = [...subscriptions].sort((a, b) => {
    const expiresA = parseInt(a.expires_date_ms || '0', 10);
    const expiresB = parseInt(b.expires_date_ms || '0', 10);
    return expiresB - expiresA;
  });

  return sorted[0] ?? null;
}

/**
 * Map Apple receipt/verification response to our subscription data model.
 * Used after validating a receipt from the mobile app.
 *
 * @param response - The Apple verifyReceipt response
 * @returns Subscription data for database update
 */
export function mapAppleReceiptToSubscription(
  response: VerifyReceiptResponse,
): AppleSubscriptionData {
  const latestInfo = getLatestSubscriptionInfo(response);
  const pendingRenewal = response.pending_renewal_info?.[0];

  if (!latestInfo) {
    // No subscription found - return free tier
    return {
      subscription_tier: 'free',
      subscription_status: 'expired',
      subscription_expires_at: null,
      product_id: null,
      upcoming_product_id: null,
      is_trial: false,
      is_renewing: false,
      original_transaction_id: null,
      transaction_id: null,
    };
  }

  const expiresMs = parseInt(latestInfo.expires_date_ms || '0', 10);
  const expiresAt = expiresMs > 0 ? new Date(expiresMs).toISOString() : null;
  const isExpired = expiresMs > 0 && expiresMs < Date.now();
  const isCancelled = !!latestInfo.cancellation_date_ms;
  const isTrial = latestInfo.is_trial_period === 'true';
  const isRenewing = pendingRenewal?.auto_renew_status === '1';

  // Determine subscription status
  let status: AppleSubscriptionData['subscription_status'];
  if (isCancelled) {
    status = 'cancelled';
  } else if (isExpired) {
    // Check if in grace period
    const gracePeriodExpires = pendingRenewal?.grace_period_expires_date_ms;
    if (gracePeriodExpires && parseInt(gracePeriodExpires, 10) > Date.now()) {
      status = 'grace_period';
    } else {
      status = 'expired';
    }
  } else {
    status = 'active';
  }

  // Determine tier based on status
  const tier = status === 'active' || status === 'grace_period' ? 'pro' : 'free';

  // Check for upcoming product change (downgrade scheduled for next renewal)
  const upcomingProductId =
    pendingRenewal?.auto_renew_product_id !== latestInfo.product_id
      ? pendingRenewal?.auto_renew_product_id || null
      : null;

  return {
    subscription_tier: tier,
    subscription_status: status,
    subscription_expires_at: expiresAt,
    product_id: latestInfo.product_id,
    upcoming_product_id: upcomingProductId,
    is_trial: isTrial,
    is_renewing: isRenewing,
    original_transaction_id: latestInfo.original_transaction_id,
    transaction_id: latestInfo.transaction_id,
  };
}

/**
 * Map App Store Server Notification V2 transaction/renewal info to subscription data.
 * Used when processing webhook notifications.
 *
 * @param transactionInfo - Decoded transaction info from webhook
 * @param renewalInfo - Decoded renewal info from webhook
 * @returns Subscription data for database update
 */
export function mapAppleWebhookToSubscription(
  transactionInfo: TransactionInfo,
  renewalInfo: RenewalInfo,
): AppleSubscriptionData {
  const expiresAt = transactionInfo.expiresDate
    ? new Date(transactionInfo.expiresDate).toISOString()
    : null;

  const isExpired = transactionInfo.expiresDate && transactionInfo.expiresDate < Date.now();
  const isRevoked = !!transactionInfo.revocationDate;
  const isRenewing = renewalInfo.autoRenewStatus === 1;
  const isInGracePeriod =
    renewalInfo.gracePeriodExpiresDate && renewalInfo.gracePeriodExpiresDate > Date.now();

  // Check if in trial or intro offer
  const isTrial = transactionInfo.offerType === 1 || transactionInfo.offerType === 2;

  // Determine status
  let status: AppleSubscriptionData['subscription_status'];
  if (isRevoked) {
    status = 'cancelled';
  } else if (isExpired) {
    status = isInGracePeriod ? 'grace_period' : 'expired';
  } else {
    status = 'active';
  }

  // Determine tier
  const tier = status === 'active' || status === 'grace_period' ? 'pro' : 'free';

  // Check for upcoming product change
  const upcomingProductId =
    renewalInfo.autoRenewProductId !== transactionInfo.productId
      ? renewalInfo.autoRenewProductId
      : null;

  return {
    subscription_tier: tier,
    subscription_status: status,
    subscription_expires_at: expiresAt,
    product_id: transactionInfo.productId,
    upcoming_product_id: upcomingProductId,
    is_trial: isTrial,
    is_renewing: isRenewing,
    original_transaction_id: transactionInfo.originalTransactionId,
    transaction_id: transactionInfo.transactionId,
  };
}
