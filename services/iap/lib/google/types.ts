/**
 * Google Play Real-time Developer Notifications Types
 *
 * Reference: https://developer.android.com/google/play/billing/rtdn-reference
 */

/**
 * Subscription notification types from Google Play RTDN
 */
export enum GoogleNotificationType {
  /** Subscription was recovered from account hold */
  SUBSCRIPTION_RECOVERED = 1,
  /** Active subscription was renewed */
  SUBSCRIPTION_RENEWED = 2,
  /** Subscription was either voluntarily or involuntarily cancelled */
  SUBSCRIPTION_CANCELED = 3,
  /** New subscription was purchased */
  SUBSCRIPTION_PURCHASED = 4,
  /** Subscription entered account hold (billing retry) */
  SUBSCRIPTION_ON_HOLD = 5,
  /** Subscription entered grace period */
  SUBSCRIPTION_IN_GRACE_PERIOD = 6,
  /** User reactivated subscription from Play > Account > Subscriptions */
  SUBSCRIPTION_RESTARTED = 7,
  /** Subscription price change was confirmed by user */
  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED = 8,
  /** Subscription renewal time was extended */
  SUBSCRIPTION_DEFERRED = 9,
  /** Subscription was paused */
  SUBSCRIPTION_PAUSED = 10,
  /** Subscription pause schedule was changed */
  SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED = 11,
  /** Subscription was revoked from user before expiration */
  SUBSCRIPTION_REVOKED = 12,
  /** Subscription expired */
  SUBSCRIPTION_EXPIRED = 13,
  /** Subscription pending purchase was canceled */
  SUBSCRIPTION_PENDING_PURCHASE_CANCELED = 20,
}

/**
 * Root message from Google Cloud Pub/Sub
 */
export interface PubSubMessage {
  message: {
    /** Base64-encoded message data */
    data: string;
    /** Message ID */
    messageId: string;
    /** Message attributes */
    attributes?: Record<string, string>;
    /** Publish time */
    publishTime: string;
  };
  /** Subscription name */
  subscription: string;
}

/**
 * Decoded RTDN message data
 */
export interface DeveloperNotification {
  /** Version of the notification */
  version: string;
  /** Package name of the application */
  packageName: string;
  /** Timestamp when the event occurred (ms since epoch) */
  eventTimeMillis: string;
  /** Subscription notification (present for subscription events) */
  subscriptionNotification?: SubscriptionNotification;
  /** One-time product notification (present for one-time purchases) */
  oneTimeProductNotification?: OneTimeProductNotification;
  /** Voided purchase notification */
  voidedPurchaseNotification?: VoidedPurchaseNotification;
  /** Test notification */
  testNotification?: TestNotification;
}

/**
 * Subscription-specific notification data
 */
export interface SubscriptionNotification {
  /** Version of the notification */
  version: string;
  /** Type of notification */
  notificationType: GoogleNotificationType;
  /** Purchase token for the subscription */
  purchaseToken: string;
  /** Subscription ID (product ID) */
  subscriptionId: string;
}

/**
 * One-time product notification (not used for subscriptions)
 */
export interface OneTimeProductNotification {
  version: string;
  notificationType: number;
  purchaseToken: string;
  sku: string;
}

/**
 * Voided purchase notification
 */
export interface VoidedPurchaseNotification {
  purchaseToken: string;
  orderId: string;
  productType: number;
  refundType: number;
}

/**
 * Test notification for webhook verification
 */
export interface TestNotification {
  version: string;
}

/**
 * Google Play Developer API subscription purchase response
 * From purchases.subscriptionsv2.get
 */
export interface SubscriptionPurchaseV2 {
  /** Kind of the resource */
  kind: string;
  /** Region code where the subscription was purchased */
  regionCode: string;
  /** Expiration time in milliseconds */
  expiryTime: string;
  /** Start time in milliseconds */
  startTime: string;
  /** Line items of the subscription */
  lineItems: SubscriptionLineItem[];
  /** Subscription state */
  subscriptionState:
    | 'SUBSCRIPTION_STATE_UNSPECIFIED'
    | 'SUBSCRIPTION_STATE_PENDING'
    | 'SUBSCRIPTION_STATE_ACTIVE'
    | 'SUBSCRIPTION_STATE_PAUSED'
    | 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
    | 'SUBSCRIPTION_STATE_ON_HOLD'
    | 'SUBSCRIPTION_STATE_CANCELED'
    | 'SUBSCRIPTION_STATE_EXPIRED'
    | 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED';
  /** Token linking to the previous subscription for upgrade/downgrade */
  linkedPurchaseToken?: string;
  /** Pause info if subscription is paused */
  pausedStateContext?: {
    autoResumeTime: string;
  };
  /** Cancellation info if subscription is canceled */
  canceledStateContext?: {
    userInitiatedCancellation?: {
      cancelSurveyResult?: {
        reason: number;
        reasonUserInput?: string;
      };
      cancelTime: string;
    };
    systemInitiatedCancellation?: {
      cancelReason: number;
    };
    developerInitiatedCancellation?: {
      cancelTime: string;
    };
    replacementCancellation?: {
      purchaseToken: string;
    };
  };
  /** Test purchase info */
  testPurchase?: {
    purchaseTime: string;
  };
  /** Acknowledgement state: 0 = not ack'd, 1 = ack'd */
  acknowledgementState:
    | 'ACKNOWLEDGEMENT_STATE_UNSPECIFIED'
    | 'ACKNOWLEDGEMENT_STATE_PENDING'
    | 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
  /** External account identifiers */
  externalAccountIdentifiers?: ExternalAccountIdentifiers;
  /** Subscribe with Google info */
  subscribeWithGoogleInfo?: {
    emailAddress: string;
    familyName: string;
    givenName: string;
    profileId: string;
    profileName: string;
  };
}

/**
 * External account identifiers set during purchase
 */
export interface ExternalAccountIdentifiers {
  /** Our purchase_uuid - set via obfuscatedExternalAccountId */
  obfuscatedExternalAccountId?: string;
  /** External profile ID */
  obfuscatedExternalProfileId?: string;
}

/**
 * Line item in a subscription purchase
 */
export interface SubscriptionLineItem {
  /** Product ID */
  productId: string;
  /** Expiration time */
  expiryTime: string;
  /** Auto-renewing plan info */
  autoRenewingPlan?: {
    autoRenewEnabled: boolean;
    priceChangeDetails?: {
      newPrice: {
        priceMicros: string;
        currency: string;
      };
      priceChangeState: string;
      priceChangeMode: string;
      expectedNewPriceChargeTime: string;
    };
  };
  /** Prepaid plan info */
  prepaidPlan?: {
    allowExtendAfterTime: string;
  };
  /** Offer details */
  offerDetails?: {
    offerTags: string[];
    basePlanId: string;
    offerId?: string;
  };
}

/**
 * Legacy purchases.subscriptions.get response (v1 API)
 * Still used in some scenarios
 */
export interface SubscriptionPurchaseV1 {
  /** Kind of the resource */
  kind: string;
  /** Start time in ms */
  startTimeMillis: string;
  /** Expiry time in ms */
  expiryTimeMillis: string;
  /**
   * Auto-renewing: true = will renew, false = won't renew
   */
  autoRenewing: boolean;
  /** Price currency code */
  priceCurrencyCode: string;
  /** Price in micros */
  priceAmountMicros: string;
  /** Country code */
  countryCode: string;
  /** Developer payload */
  developerPayload: string;
  /**
   * Payment state: 0 = pending, 1 = received, 2 = free trial, 3 = deferred
   */
  paymentState?: number;
  /**
   * Cancel reason: 0 = user canceled, 1 = billing issue, 2 = new sub, 3 = dev canceled
   */
  cancelReason?: number;
  /** User cancellation time in ms */
  userCancellationTimeMillis?: string;
  /** Cancel survey result */
  cancelSurveyResult?: {
    cancelSurveyReason: number;
    userInputCancelReason?: string;
  };
  /** Order ID */
  orderId: string;
  /** Linked purchase token (for upgrades/downgrades) */
  linkedPurchaseToken?: string;
  /** Purchase type: 0 = test, 1 = promo */
  purchaseType?: number;
  /**
   * Acknowledgement state: 0 = not ack'd, 1 = ack'd
   */
  acknowledgementState: number;
  /** External account ID (our purchase_uuid) */
  obfuscatedExternalAccountId?: string;
  /** External profile ID */
  obfuscatedExternalProfileId?: string;
  /** Promo type */
  promotionType?: number;
  /** Promo code */
  promotionCode?: string;
}

/**
 * Mapped subscription data for database update
 */
export interface GoogleSubscriptionData {
  subscription_tier: 'free' | 'pro';
  subscription_status: 'active' | 'expired' | 'cancelled' | 'grace_period';
  subscription_expires_at: string | null;
  product_id: string | null;
  upcoming_product_id: string | null;
  is_trial: boolean;
  is_renewing: boolean;
  purchase_token: string | null;
  linked_purchase_token: string | null;
}
