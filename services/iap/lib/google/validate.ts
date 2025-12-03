/**
 * Google Play Developer API validation utilities
 */

import { createLogger } from '../logger';
import { config } from '../config';
import type {
  PubSubMessage,
  DeveloperNotification,
  SubscriptionPurchaseV2,
  SubscriptionPurchaseV1,
  GoogleSubscriptionData,
  GoogleNotificationType,
} from './types';

const logger = createLogger('GoogleValidation');

// Google Play Developer API endpoints
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANDROID_PUBLISHER_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

/**
 * Cache for the Google OAuth access token
 */
let tokenCache: {
  accessToken: string;
  expiresAt: number;
} | null = null;

/**
 * Decode a base64-encoded Pub/Sub message
 */
export function decodePubSubMessage(pubSubMessage: PubSubMessage): DeveloperNotification {
  try {
    const data = pubSubMessage.message.data;
    const decoded = Buffer.from(data, 'base64').toString('utf8');
    return JSON.parse(decoded) as DeveloperNotification;
  } catch (error) {
    logger.error('Failed to decode Pub/Sub message', error);
    throw new Error('Failed to decode Google Pub/Sub message');
  }
}

/**
 * Create a JWT for Google service account authentication
 */
function createServiceAccountJWT(): string {
  const clientEmail = config.google?.clientEmail;
  const privateKey = config.google?.privateKey;

  if (!clientEmail || !privateKey) {
    throw new Error('Google service account credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: expiry,
  };

  // Base64URL encode header and payload
  const base64UrlEncode = (obj: object): string => {
    const json = JSON.stringify(obj);
    const base64 = Buffer.from(json).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with the private key
  // Note: In Bun, we can use the native crypto API
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey.replace(/\\n/g, '\n'), 'base64');
  const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get an OAuth2 access token for Google APIs.
 * Uses service account JWT authentication.
 * Caches the token until it expires.
 */
export async function getGoogleAccessToken(): Promise<string> {
  // Check cache
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.accessToken;
  }

  const jwt = createServiceAccountJWT();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get Google access token', undefined, { error });
    throw new Error('Failed to authenticate with Google');
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  // Cache the token
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Get subscription details from Google Play Developer API (v2)
 */
export async function getSubscriptionDetailsV2(
  packageName: string,
  token: string,
): Promise<SubscriptionPurchaseV2> {
  const accessToken = await getGoogleAccessToken();

  const url = `${ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/subscriptionsv2/tokens/${token}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get subscription details (v2)', undefined, {
      status: response.status,
      error,
    });
    throw new Error(`Failed to get subscription details: ${response.status}`);
  }

  return (await response.json()) as SubscriptionPurchaseV2;
}

/**
 * Get subscription details from Google Play Developer API (v1 - legacy)
 * Still needed for some operations like acknowledgement
 */
export async function getSubscriptionDetailsV1(
  packageName: string,
  subscriptionId: string,
  token: string,
): Promise<SubscriptionPurchaseV1> {
  const accessToken = await getGoogleAccessToken();

  const url = `${ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${token}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get subscription details (v1)', undefined, {
      status: response.status,
      error,
    });
    throw new Error(`Failed to get subscription details: ${response.status}`);
  }

  return (await response.json()) as SubscriptionPurchaseV1;
}

/**
 * Acknowledge a subscription purchase.
 * Must be done within 3 days or the purchase will be automatically refunded.
 */
export async function acknowledgeSubscription(
  packageName: string,
  subscriptionId: string,
  token: string,
): Promise<void> {
  const accessToken = await getGoogleAccessToken();

  const url = `${ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${token}:acknowledge`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to acknowledge subscription', undefined, {
      status: response.status,
      error,
    });
    throw new Error(`Failed to acknowledge subscription: ${response.status}`);
  }

  logger.info('Subscription acknowledged', { packageName, subscriptionId });
}

/**
 * Map Google Play subscription purchase (v2) to our subscription data model.
 *
 * @param purchase - The Google Play subscription purchase response
 * @param purchaseToken - The purchase token
 * @returns Subscription data for database update
 */
export function mapGoogleSubscriptionV2ToData(
  purchase: SubscriptionPurchaseV2,
  purchaseToken: string,
): GoogleSubscriptionData {
  // Get the first line item (most subscriptions have one)
  const lineItem = purchase.lineItems?.[0];

  if (!lineItem) {
    return {
      subscription_tier: 'free',
      subscription_status: 'expired',
      subscription_expires_at: null,
      product_id: null,
      upcoming_product_id: null,
      is_trial: false,
      is_renewing: false,
      purchase_token: purchaseToken,
      linked_purchase_token: purchase.linkedPurchaseToken || null,
    };
  }

  const expiresAt = purchase.expiryTime ? new Date(purchase.expiryTime).toISOString() : null;
  const isRenewing = lineItem.autoRenewingPlan?.autoRenewEnabled ?? false;

  // Map subscription state to our status
  let status: GoogleSubscriptionData['subscription_status'];
  let tier: GoogleSubscriptionData['subscription_tier'];

  switch (purchase.subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      status = 'active';
      tier = 'pro';
      break;
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      status = 'grace_period';
      tier = 'pro';
      break;
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PAUSED':
      status = 'grace_period';
      tier = 'pro'; // Still give access during hold/pause
      break;
    case 'SUBSCRIPTION_STATE_CANCELED':
      // Canceled but not yet expired - still has access until expiry
      status = 'active';
      tier = 'pro';
      break;
    case 'SUBSCRIPTION_STATE_EXPIRED':
    case 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED':
      status = 'expired';
      tier = 'free';
      break;
    default:
      status = 'expired';
      tier = 'free';
  }

  // Check if it's a trial (based on offer type - would need to check offerDetails)
  const isTrial = lineItem.offerDetails?.offerId?.includes('trial') ?? false;

  return {
    subscription_tier: tier,
    subscription_status: status,
    subscription_expires_at: expiresAt,
    product_id: lineItem.productId,
    upcoming_product_id: null, // Would need additional logic to detect upgrades/downgrades
    is_trial: isTrial,
    is_renewing: isRenewing,
    purchase_token: purchaseToken,
    linked_purchase_token: purchase.linkedPurchaseToken || null,
  };
}

/**
 * Map Google Play subscription purchase (v1) to our subscription data model.
 * Used as fallback for receipt validation from mobile app.
 *
 * @param purchase - The Google Play subscription purchase response (v1)
 * @param purchaseToken - The purchase token
 * @returns Subscription data for database update
 */
export function mapGoogleSubscriptionV1ToData(
  purchase: SubscriptionPurchaseV1,
  purchaseToken: string,
): GoogleSubscriptionData {
  const expiresMs = parseInt(purchase.expiryTimeMillis, 10);
  const expiresAt = expiresMs > 0 ? new Date(expiresMs).toISOString() : null;
  const isExpired = expiresMs > 0 && expiresMs < Date.now();
  const isCanceled = purchase.cancelReason !== undefined;

  // Payment state: 0 = pending, 1 = received, 2 = free trial, 3 = deferred
  const isTrial = purchase.paymentState === 2;
  const isRenewing = purchase.autoRenewing;

  // Determine status
  let status: GoogleSubscriptionData['subscription_status'];
  let tier: GoogleSubscriptionData['subscription_tier'];

  if (isExpired) {
    status = 'expired';
    tier = 'free';
  } else if (isCanceled && !isRenewing) {
    // Canceled but not yet expired
    status = 'active';
    tier = 'pro';
  } else {
    status = 'active';
    tier = 'pro';
  }

  return {
    subscription_tier: tier,
    subscription_status: status,
    subscription_expires_at: expiresAt,
    product_id: null, // v1 API doesn't include product ID in get response
    upcoming_product_id: null,
    is_trial: isTrial,
    is_renewing: isRenewing,
    purchase_token: purchaseToken,
    linked_purchase_token: purchase.linkedPurchaseToken || null,
  };
}

/**
 * Validate a Google Play purchase and return subscription data.
 * Used for initial receipt validation from the mobile app.
 *
 * @param purchaseToken - The purchase token from the client
 * @param productId - The subscription product ID
 * @returns Subscription data for database update
 */
export async function validateGooglePurchase(
  purchaseToken: string,
  productId: string,
): Promise<
  GoogleSubscriptionData & { obfuscatedExternalAccountId?: string; acknowledgementState: number }
> {
  const packageName = config.google?.packageName;

  if (!packageName) {
    throw new Error('GOOGLE_PACKAGE_NAME not configured');
  }

  // Try v2 API first (newer, more detailed)
  try {
    const purchaseV2 = await getSubscriptionDetailsV2(packageName, purchaseToken);
    const data = mapGoogleSubscriptionV2ToData(purchaseV2, purchaseToken);

    // Determine acknowledgement state
    const acknowledgementState =
      purchaseV2.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' ? 1 : 0;

    return {
      ...data,
      product_id: productId, // Use the provided product ID
      obfuscatedExternalAccountId:
        purchaseV2.externalAccountIdentifiers?.obfuscatedExternalAccountId,
      acknowledgementState,
    };
  } catch (v2Error) {
    logger.warn('V2 API failed, falling back to V1', { error: v2Error });
  }

  // Fallback to v1 API
  const purchaseV1 = await getSubscriptionDetailsV1(packageName, productId, purchaseToken);
  const data = mapGoogleSubscriptionV1ToData(purchaseV1, purchaseToken);

  return {
    ...data,
    product_id: productId,
    obfuscatedExternalAccountId: purchaseV1.obfuscatedExternalAccountId,
    acknowledgementState: purchaseV1.acknowledgementState,
  };
}

/**
 * Check if a subscription needs acknowledgement
 */
export function needsAcknowledgement(acknowledgementState: number): boolean {
  return acknowledgementState === 0;
}
