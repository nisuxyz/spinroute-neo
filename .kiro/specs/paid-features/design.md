# Design Document

## Overview

The Paid Features system provides subscription-based access to premium functionality in SpinRoute Neo. The design leverages **expo-iap** for native in-app purchase management via StoreKit 2 (iOS) and Google Play Billing (Android), Supabase for subscription state storage and RLS-based feature gating, and **server-side webhook handlers** to keep subscription state synchronized with the app stores.

The architecture follows the project's database-first philosophy: most feature gating is enforced at the PostgreSQL level via RLS policies that check subscription_tier, while the mobile app provides UI-level gating for a smooth user experience. Unlike RevenueCat, expo-iap gives us direct control over the purchase flow without third-party subscription management fees, but requires us to implement our own webhook handlers for subscription lifecycle events.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SpinRoute Neo Mobile App                          │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   IAPProvider    │  │ SubscriptionCtx  │  │     Feature Gates        │  │
│  │   (expo-iap)     │──│   (useContext)   │──│  (BikeGate, TripGate)    │  │
│  │                  │  │                  │  │                          │  │
│  │ • useIAP hook    │  │ • isPremium      │  │ • Check subscription     │  │
│  │ • fetchProducts  │  │ • tier           │  │ • Show paywall/upgrade   │  │
│  │ • requestPurchase│  │ • refresh()      │  │ • Allow/deny action      │  │
│  │ • appAccountToken│  │ • realtime sub   │  │ • Handle RLS errors      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────────────┘  │
│           │                     │                                           │
└───────────┼─────────────────────┼───────────────────────────────────────────┘
            │                     │
            │ Purchase +          │ Realtime subscription
            │ Receipt Data        │ to profiles table
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Subscription Microservice                             │
│                    (services/iap - Hono + Bun)                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Endpoints (Hono routes)                                             │   │
│  │                                                                     │   │
│  │ POST /api/subscription/validate-receipt  ← Auth required (mobile)   │   │
│  │      • Validate iOS/Android purchase receipt                        │   │
│  │      • Update profiles table with subscription state                │   │
│  │                                                                     │   │
│  │ POST /api/subscription/webhooks/apple    ← No auth (server-to-server)│  │
│  │      • App Store Server Notifications V2                            │   │
│  │      • Handle renewals, cancellations, upgrades                     │   │
│  │                                                                     │   │
│  │ POST /api/subscription/webhooks/google   ← No auth (Pub/Sub)        │   │
│  │      • Real-time Developer Notifications                            │   │
│  │      • Handle subscription lifecycle events                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│            │ Service Role Client                                            │
│            ▼                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Supabase                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       public.profiles                                │   │
│  │  • subscription_tier (free/premium)                                  │   │
│  │  • subscription_status (active/expired/cancelled/grace_period)       │   │
│  │  • subscription_expires_at                                           │   │
│  │  • purchase_uuid (for webhook user lookup)                           │   │
│  │  • original_transaction_id (iOS)                                     │   │
│  │  • purchase_token (Android)                                          │   │
│  │  • is_trial, is_renewing, product_id, upcoming_product_id            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RLS Policies enforce feature limits:                                       │
│  • vehicles.user_bike: 1 bike limit (free)                                  │
│  • recording.trips: 1/week limit (free)                                     │
│  • recording.trip_advanced_stats: premium only                              │
└─────────────────────────────────────────────────────────────────────────────┘
            ▲                               ▲
            │                               │
            │ Server Notifications          │ Pub/Sub Messages
            │                               │
┌───────────┴───────────┐       ┌───────────┴───────────┐
│   App Store Connect   │       │   Google Cloud        │
│                       │       │   Pub/Sub             │
│ • Subscription events │       │                       │
│ • Renewal, cancel,    │       │ • Subscription events │
│   upgrade, downgrade  │       │ • From Play Console   │
└───────────────────────┘       └───────────────────────┘
```

### Data Flow

1. **Initial Purchase Flow**:
   - User opens paywall → expo-iap fetches products from Store
   - User initiates purchase with `appAccountToken` (iOS) or `obfuscatedAccountIdAndroid` (Android) set to `purchase_uuid`
   - StoreKit/Play Billing processes payment
   - `onPurchaseSuccess` callback fires → Validate receipt with Edge Function
   - Edge Function updates Supabase profiles → `finishTransaction`
   - Mobile app receives realtime update and refreshes UI

2. **Subscription Lifecycle (via Webhooks)**:
   - App Store/Google Play sends server notification for renewal, cancellation, upgrade, etc.
   - Webhook endpoint in subscription microservice receives and validates notification
   - Extract `appAccountToken`/`obfuscatedExternalAccountId` to find user in database
   - Update profiles table with new subscription state
   - Mobile app receives realtime update automatically

3. **Feature Gate (Database)**: User attempts action → Supabase RLS checks subscription_tier in profiles → Allow or deny operation

4. **Subscription Restore**: App launch → `getAvailablePurchases()` → Validate any active purchases with server → Update profiles table

### Technology Stack

- **In-App Purchases**: expo-iap (StoreKit 2 / Google Play Billing v8)
- **Payment Processing**: Apple App Store, Google Play Store
- **Subscription State**: Supabase PostgreSQL (public.profiles)
- **Server Functions**: Subscription Microservice (Bun + Hono)
  - Located at: `services/iap/`
  - `POST /api/subscription/validate-receipt`: Initial purchase validation
  - `POST /api/subscription/webhooks/apple`: App Store Server Notifications V2
  - `POST /api/subscription/webhooks/google`: Real-time Developer Notifications (via Pub/Sub)
- **Feature Gating**: PostgreSQL RLS policies + application-level checks
- **Mobile Client**: React Native with Expo (SDK 54+)

## Key expo-iap Concepts

### Event-Driven Purchase Flow

expo-iap uses an event-driven model rather than promises for purchases. This is critical because:

1. Purchases are inter-session asynchronous - they may complete after the app is closed
2. Multiple responses can occur for a single purchase request
3. Purchases may be pending (e.g., parental approval, payment processing)

```typescript
const { requestPurchase, finishTransaction } = useIAP({
  onPurchaseSuccess: async (purchase) => {
    // 1. Validate receipt on server FIRST
    const isValid = await validateReceiptOnServer(purchase);

    // 2. Only finish transaction after successful validation
    if (isValid) {
      await finishTransaction({ purchase, isConsumable: false });
    }
  },
  onPurchaseError: (error) => {
    if (error.code !== ErrorCode.UserCancelled) {
      // Handle error
    }
  },
});
```

### Linking Purchases to Users

Critical for matching webhook notifications to users in your database:

**iOS**: Use `appAccountToken` when requesting subscription

```typescript
await requestSubscription({
  sku: subscription.productId,
  appAccountToken: currentInAppSubscription.purchaseUUID,
});
```

**Android**: Use `obfuscatedAccountIdAndroid`

```typescript
await requestSubscription({
  sku: productId,
  obfuscatedAccountIdAndroid: currentInAppSubscription.purchaseUUID,
  purchaseTokenAndroid: isActiveSubscription
    ? currentInAppSubscription.android?.purchaseToken
    : undefined,
  subscriptionOffers: [{ sku: productId, offerToken }],
});
```

### Platform-Specific Purchase Requests (v2.7.0+)

```typescript
await requestPurchase({
  request: {
    ios: {
      sku: productId,
      andDangerouslyFinishTransactionAutomatically: false,
      appAccountToken: purchaseUUID,
    },
    android: {
      skus: [productId],
      obfuscatedAccountIdAndroid: purchaseUUID,
      subscriptionOffers: [{ sku: productId, offerToken }],
    },
  },
  type: "subs",
});
```

## Database Schema

### Subscription Data Model

Based on the react-native-iap guide, we need a comprehensive subscription model:

```typescript
type InAppSubscription = {
  // Core subscription state
  subscription_tier: "free" | "pro";
  subscription_status: "active" | "expired" | "cancelled" | "grace_period";
  subscription_expires_at: Date | null;

  // Linking purchases to users (critical for webhooks)
  purchase_uuid: string; // Generated when user account created, used as appAccountToken/obfuscatedAccountId

  // Current subscription details
  product_id: string | null; // e.g., 'com.itsnisu.spinrouteneo.premium.monthly'
  upcoming_product_id: string | null; // For downgrades scheduled on next renewal
  is_trial: boolean;
  is_renewing: boolean;

  // Platform-specific identifiers
  original_transaction_id: string | null; // iOS: links all transactions for a subscription
  transaction_id: string | null; // iOS: current transaction
  purchase_token: string | null; // Android: unique purchase identifier
  linked_purchase_token: string | null; // Android: previous purchase for upgrade/downgrade
};
```

### profiles Table Extensions

```sql
-- Add subscription columns to profiles
ALTER TABLE public.profiles
ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free'
  CHECK (subscription_tier IN ('free', 'pro')),
ADD COLUMN subscription_status text NOT NULL DEFAULT 'active'
  CHECK (subscription_status IN ('active', 'expired', 'cancelled', 'grace_period')),
ADD COLUMN subscription_expires_at timestamptz,
ADD COLUMN purchase_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN product_id text,
ADD COLUMN upcoming_product_id text,
ADD COLUMN is_trial boolean NOT NULL DEFAULT false,
ADD COLUMN is_renewing boolean NOT NULL DEFAULT false,
ADD COLUMN original_transaction_id text,  -- iOS
ADD COLUMN transaction_id text,           -- iOS
ADD COLUMN purchase_token text,           -- Android
ADD COLUMN linked_purchase_token text;    -- Android

-- Index for webhook lookups by purchase_uuid
CREATE INDEX idx_profiles_purchase_uuid ON public.profiles(purchase_uuid);

-- Index for iOS webhook lookups
CREATE INDEX idx_profiles_original_transaction_id
  ON public.profiles(original_transaction_id)
  WHERE original_transaction_id IS NOT NULL;

-- Index for Android webhook lookups
CREATE INDEX idx_profiles_purchase_token
  ON public.profiles(purchase_token)
  WHERE purchase_token IS NOT NULL;
```

### Helper Functions (Already Implemented)

```sql
-- Function to check if user has premium subscription
CREATE OR REPLACE FUNCTION public.user_has_premium(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND subscription_tier = 'premium'
    AND subscription_status IN ('active', 'grace_period')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

## Server-Side Components (Subscription Microservice)

The subscription functionality is implemented as a standalone microservice at `services/iap/`, following the same patterns as `services/routing/` and `services/service-template/`.

### Service Structure

```
services/iap/
├── src/
│   ├── index.ts              # Hono app entry point with auto-route loading
│   ├── subscription/
│   │   └── +routes.api.ts    # Main subscription endpoints
│   └── webhooks/
│       ├── apple/
│       │   └── +routes.api.ts  # Apple webhook endpoint
│       └── google/
│           └── +routes.api.ts  # Google webhook endpoint
├── lib/
│   ├── auth.ts               # Auth middleware (from service-template)
│   ├── db.ts                 # Supabase service role client
│   ├── config.ts             # Environment configuration
│   ├── logger.ts             # Logging utilities
│   └── apple/
│   │   ├── validate.ts       # Apple receipt validation
│   │   └── types.ts          # App Store Server Notifications V2 types
│   └── google/
│       ├── validate.ts       # Google Play validation
│       └── types.ts          # RTDN types
├── package.json
├── Containerfile
├── Containerfile.dev
└── compose.yaml
```

### 1. POST /api/subscription/validate-receipt

Called by the mobile app after initial purchase to validate receipt and set up subscription:

```typescript
// services/iap/src/subscription/+routes.api.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../lib/auth";
import { getServiceClient } from "../../lib/db";
import {
  validateAppleReceipt,
  mapAppleToSubscription,
} from "../../lib/apple/validate";
import {
  validateGooglePurchase,
  mapGoogleToSubscription,
} from "../../lib/google/validate";
import { createLogger } from "../../lib/logger";

const logger = createLogger("ValidateReceipt");

export const basePath = "/api/subscription";
export const router = new Hono();

const validateReceiptSchema = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal("ios"),
    receiptData: z.string(),
    productId: z.string(),
  }),
  z.object({
    platform: z.literal("android"),
    purchaseToken: z.string(),
    productId: z.string(),
  }),
]);

// Requires authentication - user must be logged in
router.post(
  "/validate-receipt",
  requireAuth(),
  zValidator("json", validateReceiptSchema),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");

    logger.info("Receipt validation request", {
      userId: user.id,
      platform: body.platform,
    });

    const db = getServiceClient();

    try {
      let subscriptionData: Record<string, any>;

      if (body.platform === "ios") {
        // Validate with Apple
        const appleData = await validateAppleReceipt(body.receiptData);
        subscriptionData = mapAppleToSubscription(appleData);
      } else {
        // Validate with Google Play Developer API
        const googleData = await validateGooglePurchase(
          body.purchaseToken,
          body.productId
        );

        // Acknowledge purchase (required within 3 days)
        if (googleData.acknowledgementState === 0) {
          await acknowledgeGooglePurchase(body.purchaseToken, body.productId);
        }

        subscriptionData = mapGoogleToSubscription(googleData);
      }

      // Update user profile using service role client (bypasses RLS)
      const { error } = await db
        .from("profiles")
        .update(subscriptionData)
        .eq("id", user.id);

      if (error) {
        logger.error("Database update failed", { error, userId: user.id });
        return c.json(
          { code: "DatabaseError", message: "Failed to update subscription" },
          500
        );
      }

      logger.info("Subscription validated successfully", {
        userId: user.id,
        tier: subscriptionData.subscription_tier,
      });
      return c.json({ success: true, subscription: subscriptionData });
    } catch (error) {
      logger.error("Receipt validation failed", { error, userId: user.id });
      return c.json(
        { code: "ValidationError", message: "Receipt validation failed" },
        400
      );
    }
  }
);
```

### 2. POST /api/subscription/webhooks/apple

Handles App Store Server Notifications V2 for subscription lifecycle events:

```typescript
// services/iap/src/webhooks/apple/+routes.api.ts
import { Hono } from "hono";
import { getServiceClient } from "../../../lib/db";
import { decodeJWS } from "../../../lib/apple/validate";
import {
  NotificationTypeV2,
  Subtype,
  type TransactionInfo,
  type RenewalInfo,
} from "../../../lib/apple/types";
import { createLogger } from "../../../lib/logger";

const logger = createLogger("AppleWebhook");

export const basePath = "/api/subscription/webhooks/apple";
export const router = new Hono();

// No authentication - Apple sends server-to-server notifications
router.post("/", async (c) => {
  const { signedPayload } = await c.req.json<{ signedPayload: string }>();

  if (!signedPayload) {
    return c.text("No signed payload", 400);
  }

  // Decode the JWS payload (in production, verify signature with Apple's public key)
  const payload = decodeJWS(signedPayload);
  const { notificationType, subtype, data } = payload;

  if (!data?.signedRenewalInfo || !data?.signedTransactionInfo) {
    return c.text("Missing data in payload", 400);
  }

  // Decode transaction and renewal info
  const transactionInfo: TransactionInfo = decodeJWS(
    data.signedTransactionInfo
  );
  const renewalInfo: RenewalInfo = decodeJWS(data.signedRenewalInfo);

  const {
    appAccountToken,
    productId,
    originalTransactionId,
    transactionId,
    expiresDate,
  } = transactionInfo;
  const { autoRenewProductId, autoRenewStatus } = renewalInfo;

  if (!appAccountToken) {
    logger.warn("Missing appAccountToken in webhook");
    return c.text("Missing appAccountToken", 400);
  }

  // Find user by purchase_uuid
  const db = getServiceClient();
  const { data: profile, error } = await db
    .from("profiles")
    .select("id")
    .eq("purchase_uuid", appAccountToken)
    .single();

  if (error || !profile) {
    logger.error("User not found for appAccountToken", { appAccountToken });
    return c.text("User not found", 404);
  }

  // Map notification to subscription state
  let updateData: Record<string, any> = {};

  switch (notificationType) {
    case NotificationTypeV2.SUBSCRIBED:
      updateData = {
        subscription_tier: "premium",
        subscription_status: "active",
        subscription_expires_at: new Date(expiresDate).toISOString(),
        product_id: productId,
        is_trial: subtype === Subtype.INITIAL_BUY,
        is_renewing: autoRenewStatus === 1,
        original_transaction_id: originalTransactionId,
        transaction_id: transactionId,
      };
      break;

    case NotificationTypeV2.DID_RENEW:
      updateData = {
        subscription_tier: "premium",
        subscription_status: "active",
        subscription_expires_at: new Date(expiresDate).toISOString(),
        product_id: productId,
        upcoming_product_id: null,
        is_trial: false,
        original_transaction_id: originalTransactionId,
        transaction_id: transactionId,
      };
      break;

    case NotificationTypeV2.DID_CHANGE_RENEWAL_PREF:
      if (subtype === Subtype.DOWNGRADE) {
        updateData = { upcoming_product_id: autoRenewProductId };
      } else if (subtype === Subtype.UPGRADE) {
        updateData = {
          subscription_tier: "premium",
          subscription_status: "active",
          subscription_expires_at: new Date(expiresDate).toISOString(),
          product_id: productId,
          upcoming_product_id: null,
          is_renewing: autoRenewStatus === 1,
          original_transaction_id: originalTransactionId,
          transaction_id: transactionId,
        };
      } else {
        updateData = { upcoming_product_id: null };
      }
      break;

    case NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS:
      updateData = { is_renewing: subtype === Subtype.AUTO_RENEW_ENABLED };
      break;

    case NotificationTypeV2.DID_FAIL_TO_RENEW:
      if (subtype === Subtype.GRACE_PERIOD) {
        updateData = { subscription_status: "grace_period" };
      }
      break;

    case NotificationTypeV2.EXPIRED:
    case NotificationTypeV2.GRACE_PERIOD_EXPIRED:
      updateData = {
        subscription_tier: "free",
        subscription_status: "expired",
        is_renewing: false,
      };
      break;

    case NotificationTypeV2.REFUND:
      updateData = {
        subscription_tier: "free",
        subscription_status: "cancelled",
        is_renewing: false,
      };
      break;
  }

  // Update the user's profile
  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await db
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (updateError) {
      logger.error("Failed to update subscription", {
        error: updateError,
        userId: profile.id,
      });
      return c.text("Database error", 500);
    }

    logger.info("Apple webhook processed", {
      notificationType,
      subtype,
      userId: profile.id,
    });
  }

  return c.text("OK", 200);
});
```

### 3. POST /api/subscription/webhooks/google

Handles Google Play Real-time Developer Notifications via Cloud Pub/Sub:

```typescript
// services/iap/src/webhooks/google/+routes.api.ts
import { Hono } from "hono";
import { getServiceClient } from "../../../lib/db";
import {
  getGoogleAuthClient,
  getSubscriptionDetails,
  acknowledgeSubscription,
} from "../../../lib/google/validate";
import { GoogleNotificationType } from "../../../lib/google/types";
import { createLogger } from "../../../lib/logger";

const logger = createLogger("GoogleWebhook");

export const basePath = "/api/subscription/webhooks/google";
export const router = new Hono();

// No authentication - Pub/Sub sends server-to-server notifications
router.post("/", async (c) => {
  // Pub/Sub sends base64-encoded data
  const pubSubMessage = await c.req.json();
  const messageData = Buffer.from(
    pubSubMessage.message.data,
    "base64"
  ).toString("utf8");
  const { subscriptionNotification, packageName } = JSON.parse(messageData);

  if (!subscriptionNotification) {
    return c.text("Not a subscription notification", 200);
  }

  const { notificationType, purchaseToken, subscriptionId } =
    subscriptionNotification;

  // Get subscription details from Google Play Developer API
  const authClient = await getGoogleAuthClient();
  const subscriptionData = await getSubscriptionDetails({
    packageName,
    purchaseToken,
    subscriptionId,
    auth: authClient,
  });

  const {
    obfuscatedExternalAccountId, // Our purchase_uuid
    expiryTimeMillis,
    paymentState,
    autoRenewing,
    linkedPurchaseToken,
    acknowledgementState,
  } = subscriptionData;

  if (!obfuscatedExternalAccountId) {
    logger.warn("Missing obfuscatedExternalAccountId");
    return c.text("Missing account ID", 400);
  }

  // Find user by purchase_uuid
  const db = getServiceClient();
  const { data: profile, error } = await db
    .from("profiles")
    .select("id")
    .eq("purchase_uuid", obfuscatedExternalAccountId)
    .single();

  if (error || !profile) {
    logger.error("User not found for obfuscatedExternalAccountId", {
      obfuscatedExternalAccountId,
    });
    return c.text("User not found", 404);
  }

  let updateData: Record<string, any> = {
    purchase_token: purchaseToken,
    linked_purchase_token: linkedPurchaseToken || null,
  };

  // Handle different notification types
  switch (notificationType) {
    case GoogleNotificationType.SUBSCRIPTION_PURCHASED:
    case GoogleNotificationType.SUBSCRIPTION_RENEWED:
    case GoogleNotificationType.SUBSCRIPTION_RECOVERED:
    case GoogleNotificationType.SUBSCRIPTION_RESTARTED:
      updateData = {
        ...updateData,
        subscription_tier: "premium",
        subscription_status: "active",
        subscription_expires_at: new Date(
          Number(expiryTimeMillis)
        ).toISOString(),
        product_id: subscriptionId,
        is_trial: paymentState === 2, // 2 = free trial
        is_renewing: !!autoRenewing,
      };
      break;

    case GoogleNotificationType.SUBSCRIPTION_IN_GRACE_PERIOD:
      updateData = { ...updateData, subscription_status: "grace_period" };
      break;

    case GoogleNotificationType.SUBSCRIPTION_ON_HOLD:
    case GoogleNotificationType.SUBSCRIPTION_PAUSED:
      updateData = {
        ...updateData,
        subscription_status: "grace_period",
        is_renewing: false,
      };
      break;

    case GoogleNotificationType.SUBSCRIPTION_CANCELED:
      updateData = { ...updateData, is_renewing: false };
      break;

    case GoogleNotificationType.SUBSCRIPTION_EXPIRED:
    case GoogleNotificationType.SUBSCRIPTION_REVOKED:
      updateData = {
        ...updateData,
        subscription_tier: "free",
        subscription_status: "expired",
        is_renewing: false,
      };
      break;
  }

  // Update the user's profile
  const { error: updateError } = await db
    .from("profiles")
    .update(updateData)
    .eq("id", profile.id);

  if (updateError) {
    logger.error("Failed to update subscription", {
      error: updateError,
      userId: profile.id,
    });
    return c.text("Database error", 500);
  }

  // Acknowledge purchase if needed (must be done within 3 days)
  if (acknowledgementState === 0) {
    await acknowledgeSubscription({
      packageName,
      purchaseToken,
      subscriptionId,
      auth: authClient,
    });
  }

  logger.info("Google webhook processed", {
    notificationType,
    userId: profile.id,
  });
  return c.text("OK", 200);
});
```

### Service Entry Point

```typescript
// services/iap/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { supabaseMiddleware } from "../../shared/supabase-hono";
import { Glob } from "bun";
import { config } from "../lib/config";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", supabaseMiddleware());

// Auto-load all route files matching +routes.api.ts
const glob = new Glob("**/*.api.ts");
for await (const file of glob.scan({ cwd: "./src", absolute: true })) {
  const route = await import(file);
  if (route.router && route.basePath) {
    app.route(route.basePath, route.router);
  }
}

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

console.log(`IAP service running on port ${config.port}`);

export default {
  port: config.port,
  fetch: app.fetch,
};
```

### Environment Configuration

```typescript
// services/iap/lib/config.ts
export const config = {
  port: process.env.PORT || 3003,

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,

  // Apple
  appleSharedSecret: process.env.APPLE_SHARED_SECRET!,
  appleBundleId: process.env.APPLE_BUNDLE_ID || "com.itsnisu.spinrouteneo",

  // Google
  googlePackageName:
    process.env.GOOGLE_PACKAGE_NAME || "com.itsnisu.spinrouteneo",
  googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL!,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY!,
};
```

````

## Mobile App Components

### SubscriptionContext with Realtime Updates

```typescript
// frontend-expo/contexts/SubscriptionContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface SubscriptionState {
  tier: 'free' | 'premium';
  status: 'active' | 'expired' | 'cancelled' | 'grace_period';
  expiresAt: Date | null;
  isPremium: boolean;
  isLoading: boolean;
  purchaseUUID: string | null;
  isTrial: boolean;
  isRenewing: boolean;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [state, setState] = useState<SubscriptionState>(/* ... */);

  const refresh = useCallback(async () => {
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select(`
        subscription_tier,
        subscription_status,
        subscription_expires_at,
        purchase_uuid,
        is_trial,
        is_renewing
      `)
      .eq('id', session.user.id)
      .single();

    // Update state from database
    setState(/* ... */);
  }, [session?.user?.id]);

  // Listen for realtime updates from webhook-triggered changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          // Webhook updated our subscription - refresh state
          console.log('Subscription updated via webhook:', payload.new);
          refresh();
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [session?.user?.id, refresh]);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SubscriptionContext.Provider value={{ ...state, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
````

### IAPContext with User Linking

```typescript
// frontend-expo/contexts/IAPContext.tsx
import { useIAP, withIAPContext, clearTransactionIOS } from "expo-iap";
import { useSubscription } from "./SubscriptionContext";

function IAPProviderInner({ children }) {
  const { purchaseUUID } = useSubscription();

  // iOS subscription request
  const requestSubscriptionIOS = async (subscription) => {
    if (!purchaseUUID) {
      throw new Error("Missing purchaseUUID");
    }

    // Clear any pending transactions first
    await clearTransactionIOS();

    await requestSubscription({
      sku: subscription.productId,
      appAccountToken: purchaseUUID, // Links purchase to our user
    });
  };

  // Android subscription request
  const requestSubscriptionAndroid = async (subscription) => {
    if (!purchaseUUID) {
      throw new Error("Missing purchaseUUID");
    }

    const offerDetail = subscription.subscriptionOfferDetails?.find(
      (offer) => offer.offerId === "free-trial" || !offer.offerId
    );

    await requestSubscription({
      sku: subscription.productId,
      obfuscatedAccountIdAndroid: purchaseUUID, // Links purchase to our user
      subscriptionOffers: offerDetail?.offerToken
        ? [{ sku: subscription.productId, offerToken: offerDetail.offerToken }]
        : undefined,
    });
  };

  const { requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Validate and update database
      await validateReceiptOnServer(purchase);
      // Finish transaction
      await finishTransaction({ purchase, isConsumable: false });
    },
    onPurchaseError: (error) => {
      // Handle error
    },
  });

  // ... rest of provider
}
```

## Configuration Requirements

### App Store Connect Setup

1. Create subscription product(s) in App Store Connect
2. Configure subscription group
3. **Configure App Store Server Notifications V2**:
   - App Store Connect > App > App Information > App Store Server Notifications
   - Add Sandbox Server URL: `https://<project-ref>.supabase.co/functions/v1/apple-webhook`
   - Add Production Server URL (when ready)

### Google Play Console Setup

1. Create subscription product(s) in Play Console
2. **Configure Real-time Developer Notifications**:
   - Google Cloud Console > Pub/Sub > Create Topic
   - Add `google-play-developer-notifications@system.gserviceaccount.com` as Pub/Sub Publisher
   - Play Console > Monetize > Monetization setup > Enter topic name
   - Create Push Subscription pointing to: `https://<project-ref>.supabase.co/functions/v1/google-webhook`
3. Set up service account for Google Play Developer API
4. Enable Google Play Android Developer API

### Environment Variables

```
# Supabase Edge Functions
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Apple
APPLE_SHARED_SECRET=<from-app-store-connect>

# Google
GOOGLE_CLIENT_EMAIL=<service-account-email>
GOOGLE_PRIVATE_KEY=<service-account-private-key>
```

## Security Considerations

1. **Webhook Verification**: In production, verify Apple webhook signatures using Apple's public certificates
2. **Service Role Protection**: Subscription fields can only be updated by Edge Functions using service role
3. **RLS Enforcement**: Feature limits are enforced at database level via RLS policies
4. **JWT Verification**: Edge Functions verify user identity via Supabase Auth JWT
5. **Transaction Finishing**: Transactions are only finished after successful server validation
6. **Acknowledgment**: Android purchases must be acknowledged within 3 days

## Error Handling

| Error Scenario                | Client Handling         | Server Handling                       |
| ----------------------------- | ----------------------- | ------------------------------------- |
| Purchase cancelled by user    | Silent dismiss          | N/A                                   |
| Network error during purchase | Retry prompt            | Transaction pending until app reopens |
| Invalid receipt               | Error message           | Log and reject                        |
| Webhook user not found        | N/A                     | Log error, return 404                 |
| Subscription expired          | UI updates via realtime | Webhook updates DB                    |
| Grace period                  | Show warning banner     | Maintain premium access               |
| Refund issued                 | N/A                     | Revoke premium via webhook            |

## Testing Strategy

### Sandbox Testing

1. **iOS**: Create sandbox tester in App Store Connect
   - Subscriptions renew every 5 minutes (monthly)
   - Test all notification types
2. **Android**: Add license testers in Play Console
   - Use internal testing track
3. **Webhook Testing**: Use store testing tools to trigger notifications
