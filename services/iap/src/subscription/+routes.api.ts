/**
 * Subscription validation routes
 *
 * POST /api/subscription/validate-receipt
 * - Validates iOS/Android purchase receipts
 * - Updates user subscription state in database
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/db';
import { createLogger, createRequestLogger } from '../../lib/logger';
import {
  validateAppleReceipt,
  mapAppleReceiptToSubscription,
  decodeTransactionInfo,
} from '../../lib/apple/validate';
import {
  validateGooglePurchase,
  acknowledgeSubscription,
  needsAcknowledgement,
} from '../../lib/google/validate';
import { config } from '../../lib/config';

export const basePath = '/api/subscription';
export const router = new Hono();

// Initialize logger
const logger = createLogger('SubscriptionValidation');

// Request validation schema using discriminated union for platform-specific fields
const validateReceiptSchema = z.discriminatedUnion('platform', [
  z.object({
    platform: z.literal('ios'),
    receiptData: z.string().min(1, 'Receipt data is required'),
    productId: z.string().min(1, 'Product ID is required'),
  }),
  z.object({
    platform: z.literal('android'),
    purchaseToken: z.string().min(1, 'Purchase token is required'),
    productId: z.string().min(1, 'Product ID is required'),
  }),
]);

type ValidateReceiptRequest = z.infer<typeof validateReceiptSchema>;

/**
 * POST /api/subscription/validate-receipt
 *
 * Validates a purchase receipt from iOS or Android and updates the user's
 * subscription state in the database.
 *
 * iOS: Validates receipt with Apple's verifyReceipt endpoint
 * Android: Validates purchase token with Google Play Developer API
 *
 * Requires authentication - user must be logged in
 */
router.post(
  '/validate-receipt',
  requireAuth(),
  zValidator('json', validateReceiptSchema),
  async (c) => {
    const body = c.req.valid('json') as ValidateReceiptRequest;
    const user = c.get('user');

    if (!user) {
      return c.json({ code: 'Unauthorized', message: 'User not found' }, 401);
    }

    const requestLogger = createRequestLogger(logger, {
      endpoint: 'POST /api/subscription/validate-receipt',
      userId: user.id,
      platform: body.platform,
      productId: body.productId,
    });

    requestLogger.logStart('Receipt validation request received');

    try {
      let subscriptionData: Record<string, unknown>;

      if (body.platform === 'ios') {
        // ===================
        // iOS Receipt Validation
        // ===================
        requestLogger.logStart('Validating iOS receipt with Apple');

        // Check if this is a JWS token (StoreKit 2) or base64 receipt (StoreKit 1)
        // JWS tokens have the format: header.payload.signature
        const isJWS = body.receiptData.split('.').length === 3;

        let appleData: any;

        if (isJWS) {
          // StoreKit 2: Decode JWS token directly
          requestLogger.logStart('Decoding StoreKit 2 JWS token');
          try {
            const transactionInfo = decodeTransactionInfo(body.receiptData);

            // Check if subscription is expired
            const expiresAt = transactionInfo.expiresDate
              ? new Date(transactionInfo.expiresDate).toISOString()
              : null;
            const isExpired =
              transactionInfo.expiresDate && transactionInfo.expiresDate < Date.now();
            const isRevoked = !!transactionInfo.revocationDate;

            // Determine status and tier based on expiry
            let status: 'active' | 'expired' | 'cancelled';
            let tier: 'pro' | 'free';

            if (isRevoked) {
              status = 'cancelled';
              tier = 'free';
            } else if (isExpired) {
              status = 'expired';
              tier = 'free';
            } else {
              status = 'active';
              tier = 'pro';
            }

            appleData = {
              subscription_tier: tier,
              subscription_status: status,
              subscription_expires_at: expiresAt,
              product_id: transactionInfo.productId,
              upcoming_product_id: null,
              is_trial: transactionInfo.offerType === 1 || transactionInfo.offerType === 2,
              is_renewing: !isExpired && !isRevoked, // Only renewing if not expired/revoked
              original_transaction_id: transactionInfo.originalTransactionId,
              transaction_id: transactionInfo.transactionId,
            };

            requestLogger.logSuccess('StoreKit 2 JWS decoded successfully', {
              isExpired,
              isRevoked,
              tier,
              status,
            });
          } catch (error) {
            requestLogger.logError('Failed to decode JWS token', error);
            throw new Error('Invalid JWS token');
          }
        } else {
          // StoreKit 1: Use legacy verifyReceipt endpoint
          requestLogger.logStart('Using legacy verifyReceipt endpoint');
          const appleResponse = await validateAppleReceipt(body.receiptData);
          appleData = mapAppleReceiptToSubscription(appleResponse);
        }

        subscriptionData = {
          subscription_tier: appleData.subscription_tier,
          subscription_status: appleData.subscription_status,
          subscription_expires_at: appleData.subscription_expires_at,
          product_id: appleData.product_id,
          upcoming_product_id: appleData.upcoming_product_id,
          is_trial: appleData.is_trial,
          is_renewing: appleData.is_renewing,
          original_transaction_id: appleData.original_transaction_id,
          transaction_id: appleData.transaction_id,
          // Clear Android-specific fields
          purchase_token: null,
          linked_purchase_token: null,
        };

        requestLogger.logSuccess('iOS receipt validated successfully', {
          tier: appleData.subscription_tier,
          status: appleData.subscription_status,
          expiresAt: appleData.subscription_expires_at,
        });
      } else {
        // ===================
        // Android Receipt Validation
        // ===================
        requestLogger.logStart('Validating Android purchase with Google');

        // Validate purchase token with Google Play Developer API
        const googleData = await validateGooglePurchase(body.purchaseToken, body.productId);

        // Acknowledge purchase if needed (must be done within 3 days)
        if (needsAcknowledgement(googleData.acknowledgementState)) {
          requestLogger.logStart('Acknowledging Android purchase');
          const packageName = config.google?.packageName;
          if (packageName) {
            await acknowledgeSubscription(packageName, body.productId, body.purchaseToken);
            requestLogger.logSuccess('Android purchase acknowledged');
          }
        }

        subscriptionData = {
          subscription_tier: googleData.subscription_tier,
          subscription_status: googleData.subscription_status,
          subscription_expires_at: googleData.subscription_expires_at,
          product_id: googleData.product_id || body.productId,
          upcoming_product_id: googleData.upcoming_product_id,
          is_trial: googleData.is_trial,
          is_renewing: googleData.is_renewing,
          purchase_token: googleData.purchase_token,
          linked_purchase_token: googleData.linked_purchase_token,
          // Clear iOS-specific fields
          original_transaction_id: null,
          transaction_id: null,
        };

        requestLogger.logSuccess('Android purchase validated successfully', {
          tier: googleData.subscription_tier,
          status: googleData.subscription_status,
          expiresAt: googleData.subscription_expires_at,
        });
      }

      // ===================
      // Update Database
      // ===================
      requestLogger.logStart('Updating user subscription in database');

      const { error: updateError } = await supabase
        .from('profiles')
        .update(subscriptionData)
        .eq('id', user.id);

      if (updateError) {
        requestLogger.logError('Failed to update subscription in database', updateError);
        return c.json(
          {
            code: 'DatabaseError',
            message: 'Failed to update subscription state',
          },
          500,
        );
      }

      requestLogger.logSuccess('Subscription updated successfully', {
        tier: subscriptionData.subscription_tier,
        status: subscriptionData.subscription_status,
      });

      // Return success with subscription details
      return c.json({
        success: true,
        subscription: {
          tier: subscriptionData.subscription_tier,
          status: subscriptionData.subscription_status,
          expiresAt: subscriptionData.subscription_expires_at,
          productId: subscriptionData.product_id,
          isTrial: subscriptionData.is_trial,
          isRenewing: subscriptionData.is_renewing,
        },
      });
    } catch (error) {
      requestLogger.logError('Receipt validation failed', error);

      // Determine appropriate error response
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('APPLE_SHARED_SECRET')) {
          return c.json(
            {
              code: 'ConfigurationError',
              message: 'Server configuration error',
            },
            500,
          );
        }
        if (error.message.includes('GOOGLE_')) {
          return c.json(
            {
              code: 'ConfigurationError',
              message: 'Server configuration error',
            },
            500,
          );
        }
        if (error.message.includes('validation failed')) {
          return c.json(
            {
              code: 'ValidationError',
              message: 'Receipt validation failed - invalid or expired receipt',
            },
            400,
          );
        }
        if (error.message.includes('authenticate with Google')) {
          return c.json(
            {
              code: 'ValidationError',
              message: 'Failed to validate purchase with store',
            },
            502,
          );
        }
      }

      // Generic error response
      return c.json(
        {
          code: 'ValidationError',
          message: 'Receipt validation failed',
        },
        400,
      );
    }
  },
);

/**
 * GET /api/subscription/status
 *
 * Returns the current subscription status for the authenticated user.
 * Useful for checking subscription state without validating a new receipt.
 */
router.get('/status', requireAuth(), async (c) => {
  const user = c.get('user');

  if (!user) {
    return c.json({ code: 'Unauthorized', message: 'User not found' }, 401);
  }

  const requestLogger = createRequestLogger(logger, {
    endpoint: 'GET /api/subscription/status',
    userId: user.id,
  });

  try {
    requestLogger.logStart('Fetching subscription status');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        `
        subscription_tier,
        subscription_status,
        subscription_expires_at,
        product_id,
        is_trial,
        is_renewing,
        purchase_uuid
      `,
      )
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      requestLogger.logError('Failed to fetch subscription status', error);
      return c.json(
        {
          code: 'NotFound',
          message: 'User profile not found',
        },
        404,
      );
    }

    requestLogger.logSuccess('Subscription status fetched', {
      tier: profile.subscription_tier,
      status: profile.subscription_status,
    });

    return c.json({
      tier: profile.subscription_tier,
      status: profile.subscription_status,
      expiresAt: profile.subscription_expires_at,
      productId: profile.product_id,
      isTrial: profile.is_trial,
      isRenewing: profile.is_renewing,
      purchaseUUID: profile.purchase_uuid,
    });
  } catch (error) {
    requestLogger.logError('Error fetching subscription status', error);
    return c.json(
      {
        code: 'Error',
        message: 'Failed to fetch subscription status',
      },
      500,
    );
  }
});
