/**
 * Apple App Store Server Notifications V2 Types
 *
 * Reference: https://developer.apple.com/documentation/appstoreservernotifications
 */

/**
 * Notification types sent by App Store Server Notifications V2
 */
export enum NotificationTypeV2 {
  /** A customer initiated a consented refund or Apple revoked a subscription. */
  CONSUMPTION_REQUEST = 'CONSUMPTION_REQUEST',
  /** A customer renewed a subscription. */
  DID_RENEW = 'DID_RENEW',
  /** A customer changed their subscription plan or renewal preference. */
  DID_CHANGE_RENEWAL_PREF = 'DID_CHANGE_RENEWAL_PREF',
  /** A customer enabled or disabled auto-renewal. */
  DID_CHANGE_RENEWAL_STATUS = 'DID_CHANGE_RENEWAL_STATUS',
  /** A subscription renewal failed due to a billing issue. */
  DID_FAIL_TO_RENEW = 'DID_FAIL_TO_RENEW',
  /** A subscription expired. */
  EXPIRED = 'EXPIRED',
  /** The billing grace period expired without payment. */
  GRACE_PERIOD_EXPIRED = 'GRACE_PERIOD_EXPIRED',
  /** A customer offered an in-app purchase. */
  OFFER_REDEEMED = 'OFFER_REDEEMED',
  /** The App Store extended the subscription renewal date. */
  PRICE_INCREASE = 'PRICE_INCREASE',
  /** Apple refunded a transaction. */
  REFUND = 'REFUND',
  /** Apple reversed a refund. */
  REFUND_REVERSED = 'REFUND_REVERSED',
  /** Apple declined a refund request. */
  REFUND_DECLINED = 'REFUND_DECLINED',
  /** The App Store extended the renewal date for a subscription. */
  RENEWAL_EXTENDED = 'RENEWAL_EXTENDED',
  /** Apple revoked an in-app purchase or subscription. */
  REVOKE = 'REVOKE',
  /** A customer subscribed to a product. */
  SUBSCRIBED = 'SUBSCRIBED',
  /** A test notification for validating webhook endpoint. */
  TEST = 'TEST',
}

/**
 * Subtypes that provide additional detail for notification types
 */
export enum Subtype {
  /** Initial subscription purchase */
  INITIAL_BUY = 'INITIAL_BUY',
  /** Customer resubscribed after letting subscription expire */
  RESUBSCRIBE = 'RESUBSCRIBE',
  /** Customer downgraded their plan (takes effect on next renewal) */
  DOWNGRADE = 'DOWNGRADE',
  /** Customer upgraded their plan (takes effect immediately) */
  UPGRADE = 'UPGRADE',
  /** Customer enabled auto-renewal */
  AUTO_RENEW_ENABLED = 'AUTO_RENEW_ENABLED',
  /** Customer disabled auto-renewal */
  AUTO_RENEW_DISABLED = 'AUTO_RENEW_DISABLED',
  /** Voluntary cancel by user */
  VOLUNTARY = 'VOLUNTARY',
  /** Apple billing retry is in progress */
  BILLING_RETRY = 'BILLING_RETRY',
  /** Subscription is in billing grace period */
  GRACE_PERIOD = 'GRACE_PERIOD',
  /** Price increase was consented */
  ACCEPTED = 'ACCEPTED',
  /** Price increase was not consented (will expire) */
  PENDING = 'PENDING',
  /** Billing recovery succeeded */
  BILLING_RECOVERY = 'BILLING_RECOVERY',
  /** Product not available for renewal */
  PRODUCT_NOT_FOR_SALE = 'PRODUCT_NOT_FOR_SALE',
  /** Failure to accept price increase */
  FAILURE_TO_ACCEPT_PRICE_INCREASE = 'FAILURE_TO_ACCEPT_PRICE_INCREASE',
}

/**
 * The decoded payload from App Store Server Notifications V2
 */
export interface NotificationPayloadV2 {
  /** The type of notification */
  notificationType: NotificationTypeV2;
  /** Additional detail about the notification */
  subtype?: Subtype;
  /** Unique identifier for the notification */
  notificationUUID: string;
  /** Version of the notification */
  version: string;
  /** Timestamp when notification was signed */
  signedDate: number;
  /** The notification data */
  data: NotificationData;
}

/**
 * The data object within a notification payload
 */
export interface NotificationData {
  /** App Apple ID */
  appAppleId?: number;
  /** Bundle identifier */
  bundleId: string;
  /** Bundle version */
  bundleVersion?: string;
  /** Environment (Sandbox or Production) */
  environment: 'Sandbox' | 'Production';
  /** JWS-encoded transaction info */
  signedTransactionInfo: string;
  /** JWS-encoded renewal info */
  signedRenewalInfo: string;
}

/**
 * Decoded transaction info from signedTransactionInfo JWS
 */
export interface TransactionInfo {
  /** The UUID we set via appAccountToken - links purchase to our user */
  appAccountToken?: string;
  /** Bundle identifier */
  bundleId: string;
  /** Environment */
  environment: 'Sandbox' | 'Production';
  /** Expiration date in milliseconds */
  expiresDate: number;
  /** Whether the subscription is in a billing retry state */
  inAppOwnershipType: 'PURCHASED' | 'FAMILY_SHARED';
  /** Whether this is an upgraded transaction */
  isUpgraded?: boolean;
  /** Offer identifier */
  offerIdentifier?: string;
  /** Offer type (1=intro, 2=promo, 3=subscription offer) */
  offerType?: number;
  /** Original purchase date in milliseconds */
  originalPurchaseDate: number;
  /** Original transaction ID - groups all transactions for a subscription */
  originalTransactionId: string;
  /** Product identifier */
  productId: string;
  /** Purchase date in milliseconds */
  purchaseDate: number;
  /** Quantity purchased */
  quantity: number;
  /** Revocation date if revoked */
  revocationDate?: number;
  /** Revocation reason */
  revocationReason?: number;
  /** Signed date */
  signedDate: number;
  /** Storefront (country code) */
  storefront: string;
  /** Storefront ID */
  storefrontId: string;
  /** Subscription group identifier */
  subscriptionGroupIdentifier: string;
  /** Current transaction ID */
  transactionId: string;
  /** Transaction reason (PURCHASE, RENEWAL) */
  transactionReason: 'PURCHASE' | 'RENEWAL';
  /** Type of product */
  type:
    | 'Auto-Renewable Subscription'
    | 'Non-Consumable'
    | 'Consumable'
    | 'Non-Renewing Subscription';
  /** Web order line item ID */
  webOrderLineItemId?: string;
}

/**
 * Decoded renewal info from signedRenewalInfo JWS
 */
export interface RenewalInfo {
  /** Auto-renew product ID */
  autoRenewProductId: string;
  /** Auto-renew status: 1 = will renew, 0 = won't renew */
  autoRenewStatus: 0 | 1;
  /** Environment */
  environment: 'Sandbox' | 'Production';
  /** Expiration intent if not renewing */
  expirationIntent?: 1 | 2 | 3 | 4 | 5;
  /** Grace period expiration date */
  gracePeriodExpiresDate?: number;
  /** Whether in billing retry period */
  isInBillingRetryPeriod?: boolean;
  /** Offer identifier */
  offerIdentifier?: string;
  /** Offer type */
  offerType?: number;
  /** Original transaction ID */
  originalTransactionId: string;
  /** Price consent status */
  priceIncreaseStatus?: 0 | 1;
  /** Product ID */
  productId: string;
  /** Recent subscription start date */
  recentSubscriptionStartDate: number;
  /** Signed date */
  signedDate: number;
}

/**
 * The root response from Apple's webhook
 */
export interface WebhookRequestBody {
  /** JWS-encoded signed payload */
  signedPayload: string;
}

/**
 * Apple verifyReceipt API response (for receipt validation)
 * Used for initial purchase validation from mobile app
 */
export interface VerifyReceiptResponse {
  /** Status code (0 = valid) */
  status: number;
  /** Environment */
  environment: 'Sandbox' | 'Production';
  /** Receipt data */
  receipt?: {
    bundle_id: string;
    in_app: ReceiptInApp[];
  };
  /** Latest receipt info for auto-renewable subscriptions */
  latest_receipt_info?: ReceiptInApp[];
  /** Pending renewal info */
  pending_renewal_info?: PendingRenewalInfo[];
}

/**
 * In-app purchase receipt info
 */
export interface ReceiptInApp {
  /** Product identifier */
  product_id: string;
  /** Transaction ID */
  transaction_id: string;
  /** Original transaction ID */
  original_transaction_id: string;
  /** Purchase date in ms */
  purchase_date_ms: string;
  /** Original purchase date in ms */
  original_purchase_date_ms: string;
  /** Subscription expiration date in ms */
  expires_date_ms?: string;
  /** Whether in trial period */
  is_trial_period?: string;
  /** Whether in intro offer period */
  is_in_intro_offer_period?: string;
  /** Cancellation date in ms */
  cancellation_date_ms?: string;
  /** Cancellation reason */
  cancellation_reason?: string;
}

/**
 * Pending renewal info for subscriptions
 */
export interface PendingRenewalInfo {
  /** Product ID */
  product_id: string;
  /** Auto-renew product ID */
  auto_renew_product_id: string;
  /** Original transaction ID */
  original_transaction_id: string;
  /** Auto-renew status: "1" = will renew, "0" = won't renew */
  auto_renew_status: '0' | '1';
  /** Expiration intent */
  expiration_intent?: string;
  /** Whether in billing retry period */
  is_in_billing_retry_period?: string;
  /** Grace period expiration date in ms */
  grace_period_expires_date_ms?: string;
}

/**
 * Mapped subscription data for database update
 */
export interface AppleSubscriptionData {
  subscription_tier: 'free' | 'pro';
  subscription_status: 'active' | 'expired' | 'cancelled' | 'grace_period';
  subscription_expires_at: string | null;
  product_id: string | null;
  upcoming_product_id: string | null;
  is_trial: boolean;
  is_renewing: boolean;
  original_transaction_id: string | null;
  transaction_id: string | null;
}
