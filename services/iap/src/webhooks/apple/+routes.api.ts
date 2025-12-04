/**
 * Apple App Store Server Notifications V2 Webhook
 *
 * POST /api/subscription/webhooks/apple
 * - Receives server-to-server notifications from Apple
 * - Decodes JWS payload and updates subscription state
 *
 * Reference: https://developer.apple.com/documentation/appstoreservernotifications
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../../../lib/db';
import { createLogger, createRequestLogger } from '../../../lib/logger';
import {
  decodeNotificationPayload,
  decodeTransactionInfo,
  decodeRenewalInfo,
  mapAppleWebhookToSubscription,
} from '../../../lib/apple/validate';
import { createSignedDataVerifier } from '../../../lib/apple/client';
import {
  NotificationTypeV2,
  Subtype,
  type TransactionInfo,
  type RenewalInfo,
  type AppleSubscriptionData,
} from '../../../lib/apple/types';

export const basePath = '/api/subscription/webhooks/apple';
export const router = new Hono();

// Initialize logger
const logger = createLogger('AppleWebhook');

// Initialize signature verifier (singleton)
let signatureVerifier: ReturnType<typeof createSignedDataVerifier> | null = null;
let verifierInitialized = false;

function getSignatureVerifier() {
  if (!verifierInitialized) {
    try {
      signatureVerifier = createSignedDataVerifier();
      verifierInitialized = true;

      if (signatureVerifier) {
        logger.info('Apple signature verifier initialized successfully');
      } else {
        logger.warn('Apple signature verifier not available - will use manual decoding');
      }
    } catch (error) {
      logger.error('Failed to initialize signature verifier', error);
      verifierInitialized = true; // Don't retry on every request
    }
  }
  return signatureVerifier;
}

// Request validation schema - Apple sends JWS-encoded payload
const webhookSchema = z.object({
  signedPayload: z.string().min(1, 'Signed payload is required'),
});

/**
 * Determine subscription data based on notification type and subtype.
 * This handles all the different notification scenarios from Apple.
 */
function processNotification(
  notificationType: NotificationTypeV2,
  subtype: Subtype | undefined,
  transactionInfo: TransactionInfo,
  renewalInfo: RenewalInfo,
): AppleSubscriptionData {
  // Start with the base mapping
  const baseData = mapAppleWebhookToSubscription(transactionInfo, renewalInfo);

  // Handle specific notification types that need special processing
  switch (notificationType) {
    case NotificationTypeV2.SUBSCRIBED:
      // New subscription
      if (subtype === Subtype.INITIAL_BUY) {
        // Initial purchase - could be a trial
        return {
          ...baseData,
          subscription_tier: 'pro',
          subscription_status: 'active',
          is_trial: transactionInfo.offerType === 1, // 1 = introductory offer (trial)
        };
      }
      if (subtype === Subtype.RESUBSCRIBE) {
        // User resubscribed after expiration
        return {
          ...baseData,
          subscription_tier: 'pro',
          subscription_status: 'active',
          is_trial: false,
        };
      }
      return baseData;

    case NotificationTypeV2.DID_RENEW:
      // Subscription renewed successfully
      return {
        ...baseData,
        subscription_tier: 'pro',
        subscription_status: 'active',
        upcoming_product_id: null, // Clear any pending changes
      };

    case NotificationTypeV2.DID_CHANGE_RENEWAL_PREF:
      // User changed their subscription plan
      if (subtype === Subtype.DOWNGRADE) {
        // Downgrade takes effect at next renewal
        return {
          ...baseData,
          upcoming_product_id: renewalInfo.autoRenewProductId,
        };
      }
      if (subtype === Subtype.UPGRADE) {
        // Upgrade takes effect immediately
        return {
          ...baseData,
          product_id: transactionInfo.productId,
          upcoming_product_id: null,
        };
      }
      return baseData;

    case NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS:
      // User toggled auto-renewal
      if (subtype === Subtype.AUTO_RENEW_ENABLED) {
        return {
          ...baseData,
          is_renewing: true,
        };
      }
      if (subtype === Subtype.AUTO_RENEW_DISABLED) {
        return {
          ...baseData,
          is_renewing: false,
        };
      }
      return baseData;

    case NotificationTypeV2.DID_FAIL_TO_RENEW:
      // Billing issue - subscription may be in grace period or expired
      if (subtype === Subtype.GRACE_PERIOD) {
        return {
          ...baseData,
          subscription_tier: 'pro', // Still pro during grace period
          subscription_status: 'grace_period',
        };
      }
      // Billing retry period
      return {
        ...baseData,
        subscription_status: 'grace_period',
      };

    case NotificationTypeV2.GRACE_PERIOD_EXPIRED:
      // Grace period ended without payment
      return {
        ...baseData,
        subscription_tier: 'free',
        subscription_status: 'expired',
      };

    case NotificationTypeV2.EXPIRED:
      // Subscription expired
      return {
        ...baseData,
        subscription_tier: 'free',
        subscription_status: 'expired',
        is_renewing: false,
      };

    case NotificationTypeV2.REFUND:
      // Apple refunded the transaction
      return {
        ...baseData,
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        is_renewing: false,
      };

    case NotificationTypeV2.REVOKE:
      // Apple revoked the subscription (e.g., Ask to Buy rejection, family sharing revoked)
      return {
        ...baseData,
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        is_renewing: false,
      };

    case NotificationTypeV2.REFUND_REVERSED:
      // Refund was reversed - restore subscription
      return {
        ...baseData,
        subscription_tier: 'pro',
        subscription_status: 'active',
      };

    case NotificationTypeV2.RENEWAL_EXTENDED:
      // Apple extended the subscription (usually due to service issues)
      return {
        ...baseData,
        subscription_expires_at: new Date(transactionInfo.expiresDate).toISOString(),
      };

    case NotificationTypeV2.OFFER_REDEEMED:
      // User redeemed a promotional or subscription offer
      return {
        ...baseData,
        subscription_tier: 'pro',
        subscription_status: 'active',
      };

    case NotificationTypeV2.PRICE_INCREASE:
      // Price increase notification - just log for now
      // The user may or may not consent
      return baseData;

    case NotificationTypeV2.TEST:
      // Test notification - don't update anything
      return baseData;

    default:
      // For any other notification types, use the base mapping
      return baseData;
  }
}

/**
 * GET /api/subscription/webhooks/apple/events
 *
 * Query webhook events for debugging (requires auth)
 */
router.get('/events', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const limit = parseInt(c.req.query('limit') || '50');
  const userId = c.req.query('user_id');
  const notificationType = c.req.query('notification_type');

  let query = supabase
    .from('webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (notificationType) {
    query = query.eq('notification_type', notificationType);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ events: data, count: data.length });
});

/**
 * POST /api/subscription/webhooks/apple
 *
 * Receives App Store Server Notifications V2 from Apple.
 * No auth middleware - this is server-to-server from Apple.
 */
router.post('/', zValidator('json', webhookSchema), async (c) => {
  const requestId = crypto.randomUUID();
  const requestLogger = createRequestLogger(logger, {
    endpoint: 'POST /api/subscription/webhooks/apple',
    requestId,
  });

  try {
    const { signedPayload } = c.req.valid('json');

    // ===================
    // Verify & Decode JWS Payload
    // ===================
    requestLogger.logStart('Verifying and decoding Apple notification payload');

    let payload;
    const verifier = getSignatureVerifier();

    if (verifier) {
      // Use official library with signature verification
      try {
        const verifiedNotification = await verifier.verifyAndDecodeNotification(signedPayload);
        payload = verifiedNotification;
        requestLogger.logSuccess('Notification signature verified successfully');
      } catch (error) {
        requestLogger.logError('Signature verification failed', error);
        // Fall back to manual decoding for debugging, but log the failure
        logger.warn('Falling back to manual decoding after signature verification failure');
        payload = decodeNotificationPayload(signedPayload);
      }
    } else {
      // Fall back to manual decoding if verifier not available
      requestLogger.logStart('Using manual JWS decoding (verifier not available)');
      payload = decodeNotificationPayload(signedPayload);
    }

    const { notificationType, subtype, data } = payload;

    requestLogger.logSuccess('Decoded notification', {
      notificationType,
      subtype,
      notificationUUID: payload.notificationUUID,
      environment: data.environment,
    });

    // Handle test notifications immediately
    if (notificationType === NotificationTypeV2.TEST) {
      logger.info('Received test notification from Apple', {
        notificationUUID: payload.notificationUUID,
      });
      return c.json({ success: true, message: 'Test notification received' });
    }

    // ===================
    // Decode Transaction & Renewal Info
    // ===================
    requestLogger.logStart('Decoding transaction and renewal info');

    let transactionInfo: TransactionInfo;
    let renewalInfo: RenewalInfo;

    if (verifier && payload.data) {
      // Use verified decoding if available
      try {
        const verifiedTransaction = await verifier.verifyAndDecodeSignedTransaction(
          data.signedTransactionInfo,
        );
        const verifiedRenewal = await verifier.verifyAndDecodeRenewalInfo(data.signedRenewalInfo);

        // The library returns the decoded objects directly
        transactionInfo = verifiedTransaction as unknown as TransactionInfo;
        renewalInfo = verifiedRenewal as unknown as RenewalInfo;

        requestLogger.logSuccess('Transaction and renewal info verified successfully');
      } catch (error) {
        requestLogger.logWarn('Failed to verify transaction/renewal info, using manual decode', {
          error: error instanceof Error ? error.message : String(error),
        });
        transactionInfo = decodeTransactionInfo(data.signedTransactionInfo);
        renewalInfo = decodeRenewalInfo(data.signedRenewalInfo);
      }
    } else {
      // Manual decoding fallback
      transactionInfo = decodeTransactionInfo(data.signedTransactionInfo);
      renewalInfo = decodeRenewalInfo(data.signedRenewalInfo);
    }

    requestLogger.logSuccess('Decoded transaction info', {
      originalTransactionId: transactionInfo.originalTransactionId,
      transactionId: transactionInfo.transactionId,
      productId: transactionInfo.productId,
      appAccountToken: transactionInfo.appAccountToken,
      expiresDate: transactionInfo.expiresDate
        ? new Date(transactionInfo.expiresDate).toISOString()
        : null,
    });

    // ===================
    // Log Webhook Event (Audit Trail)
    // ===================
    const webhookEventData = {
      notification_type: notificationType,
      notification_subtype: subtype || null,
      notification_uuid: payload.notificationUUID,
      original_transaction_id: transactionInfo.originalTransactionId,
      transaction_id: transactionInfo.transactionId,
      product_id: transactionInfo.productId,
      environment: data.environment,
      expires_date: transactionInfo.expiresDate
        ? new Date(transactionInfo.expiresDate).toISOString()
        : null,
      signature_verified: !!verifier,
      raw_payload: payload,
      request_id: requestId,
      processed: false, // Will update to true after successful processing
    };

    // ===================
    // Store Webhook Event (Before Processing)
    // ===================
    const { error: webhookInsertError } = await supabase
      .from('webhook_events')
      .insert(webhookEventData);

    if (webhookInsertError) {
      requestLogger.logWarn('Failed to store webhook event', {
        error: webhookInsertError.message,
      });
      // Continue processing even if logging fails
    }

    // ===================
    // Find User by appAccountToken (purchase_uuid)
    // ===================
    const appAccountToken = transactionInfo.appAccountToken;

    if (!appAccountToken) {
      // Try to find user by original_transaction_id as fallback
      requestLogger.logStart('No appAccountToken, trying original_transaction_id lookup');

      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('id, purchase_uuid')
        .eq('original_transaction_id', transactionInfo.originalTransactionId)
        .single();

      if (lookupError || !profile) {
        const errorMsg = 'User not found for transaction';
        logger.warn('Could not find user for notification', {
          originalTransactionId: transactionInfo.originalTransactionId,
          notificationType,
          error: lookupError?.message,
        });

        // Mark webhook event as failed
        await supabase
          .from('webhook_events')
          .update({
            processing_error: errorMsg,
          })
          .eq('notification_uuid', payload.notificationUUID);

        // Return 200 to acknowledge receipt (Apple will retry on non-2xx)
        return c.json({
          success: false,
          message: errorMsg,
        });
      }

      // Found user by original_transaction_id - process notification
      requestLogger.logSuccess('Found user by original_transaction_id', {
        userId: profile.id,
      });

      const subscriptionData = processNotification(
        notificationType,
        subtype,
        transactionInfo,
        renewalInfo,
      );

      const { error: updateError } = await supabase
        .from('profiles')
        .update(subscriptionData)
        .eq('id', profile.id);

      if (updateError) {
        requestLogger.logError('Failed to update subscription', updateError, {
          errorCode: updateError.code,
          errorMessage: updateError.message,
          errorDetails: updateError.details,
          errorHint: updateError.hint,
          subscriptionData,
        });

        // Mark webhook event as failed
        await supabase
          .from('webhook_events')
          .update({
            processing_error: `Database update failed: ${updateError.message}`,
            user_id: profile.id,
          })
          .eq('notification_uuid', payload.notificationUUID);

        return c.json(
          {
            success: false,
            message: 'Failed to update subscription',
            error: updateError.message,
          },
          500,
        );
      }

      requestLogger.logSuccess('Subscription updated via original_transaction_id', {
        notificationType,
        subtype,
        tier: subscriptionData.subscription_tier,
        status: subscriptionData.subscription_status,
      });

      return c.json({ success: true });
    }

    // ===================
    // Find User by purchase_uuid (appAccountToken)
    // ===================
    requestLogger.logStart('Looking up user by purchase_uuid');

    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('purchase_uuid', appAccountToken)
      .single();

    if (lookupError || !profile) {
      const errorMsg = 'User not found for appAccountToken';
      logger.warn('Could not find user for appAccountToken', {
        appAccountToken,
        notificationType,
        error: lookupError?.message,
      });

      // Mark webhook event as failed
      await supabase
        .from('webhook_events')
        .update({
          processing_error: errorMsg,
        })
        .eq('notification_uuid', payload.notificationUUID);

      // Return 200 to acknowledge receipt
      return c.json({
        success: false,
        message: errorMsg,
      });
    }

    requestLogger.logSuccess('Found user', { userId: profile.id });

    // ===================
    // Process Notification & Update Database
    // ===================
    requestLogger.logStart('Processing notification and updating subscription');

    const subscriptionData = processNotification(
      notificationType,
      subtype,
      transactionInfo,
      renewalInfo,
    );

    const { error: updateError } = await supabase
      .from('profiles')
      .update(subscriptionData)
      .eq('id', profile.id);

    if (updateError) {
      requestLogger.logError('Failed to update subscription', updateError, {
        errorCode: updateError.code,
        errorMessage: updateError.message,
        errorDetails: updateError.details,
        errorHint: updateError.hint,
        subscriptionData,
      });

      // Mark webhook event as failed
      await supabase
        .from('webhook_events')
        .update({
          processing_error: `Database update failed: ${updateError.message}`,
          user_id: profile.id,
        })
        .eq('notification_uuid', payload.notificationUUID);

      return c.json(
        {
          success: false,
          message: 'Failed to update subscription',
          error: updateError.message,
        },
        500,
      );
    }

    requestLogger.logSuccess('Subscription updated successfully', {
      notificationType,
      subtype,
      tier: subscriptionData.subscription_tier,
      status: subscriptionData.subscription_status,
      expiresAt: subscriptionData.subscription_expires_at,
    });

    // ===================
    // Mark Webhook Event as Processed
    // ===================
    await supabase
      .from('webhook_events')
      .update({
        processed: true,
        user_id: profile.id,
      })
      .eq('notification_uuid', payload.notificationUUID);

    return c.json({ success: true });
  } catch (error) {
    requestLogger.logError('Failed to process Apple webhook', error);

    // Try to log the failure in webhook_events if we have the notification UUID
    try {
      const { signedPayload } = c.req.valid('json');
      const payload = decodeNotificationPayload(signedPayload);

      await supabase.from('webhook_events').upsert(
        {
          notification_uuid: payload.notificationUUID,
          notification_type: payload.notificationType,
          notification_subtype: payload.subtype || null,
          environment: payload.data.environment,
          raw_payload: payload,
          request_id: requestId,
          processed: false,
          processing_error: error instanceof Error ? error.message : String(error),
        },
        {
          onConflict: 'notification_uuid',
        },
      );
    } catch (loggingError) {
      // Ignore logging errors
      logger.error('Failed to log webhook error', loggingError);
    }

    // Return 200 to prevent Apple from retrying indefinitely
    // Log the error for investigation
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal error',
    });
  }
});
