# Implementation Plan

## Phase 1: Database Schema & RLS Policies ✅ COMPLETED

- [x] 1. Add subscription columns to public.profiles
- [x] 1.1 Create migration to add subscription fields
  - Add subscription_tier column (text, default 'free', check constraint)
  - Add subscription_status column (text, default 'active', check constraint)
  - Add subscription_expires_at column (timestamptz, nullable)
  - Add original_transaction_id column (text, nullable) - for App Store/Play Store linking
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 Create helper functions for subscription checks
  - Create user_has_pro(user_id) function
  - Create get_subscription_tier(user_id) function
  - Set functions as SECURITY DEFINER STABLE
  - _Requirements: 3.4, 4.3, 5.2_

- [x] 1.3 Update profiles RLS to protect subscription fields
  - Create trigger to prevent direct subscription field changes by users
  - Only service role (Edge Functions) should update subscription fields
  - _Requirements: 1.5_

- [x] 1.4 Regenerate Supabase TypeScript types
  - Run supabase gen types command with all schemas
  - Update frontend-expo/supabase/types.ts
  - _Requirements: 1.1_

- [x] 2. Create feature-gating RLS policies
- [x] 2.1 Update vehicles.user_bike insert policy for bike limit
  - Drop existing "Users can insert own bikes" policy
  - Create new policy with 1-bike limit for free users
  - Use user_has_pro() helper function
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 2.2 Update recording.trips insert policy for trip limit
  - Drop existing "Users can insert own trips" policy
  - Create new policy with 1-trip-per-week limit for free users
  - Count only completed trips started within last 7 days toward limit
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 2.3 Update recording.trip_advanced_stats select policy for pro only
  - Drop existing policy if it exists
  - Create new policy requiring pro subscription
  - _Requirements: 5.2_

## Phase 1B: Extended Database Schema for Webhooks ✅ COMPLETED

- [x] 1B.1 Add extended subscription columns
  - Add purchase_uuid column (uuid, default gen_random_uuid()) - for linking purchases to users
  - Add product_id column (text, nullable) - current subscription product
  - Add upcoming_product_id column (text, nullable) - for pending downgrades
  - Add is_trial column (boolean, default false)
  - Add is_renewing column (boolean, default false)
  - Add transaction_id column (text, nullable) - iOS current transaction
  - Add purchase_token column (text, nullable) - Android purchase token
  - Add linked_purchase_token column (text, nullable) - Android upgrade/downgrade linking
  - _Requirements: 2.1_

- [x] 1B.2 Create indexes for webhook lookups
  - Create index on purchase_uuid for webhook user lookups
  - Create partial index on original_transaction_id (iOS)
  - Create partial index on purchase_token (Android)
  - _Requirements: 2.1_

## Phase 2: Subscription Microservice (services/iap)

### 2A: Service Scaffold ✅ COMPLETED

- [x] 3. Create subscription microservice structure
- [x] 3.1 Initialize service from service-template
  - Copy services/service-template to services/iap
  - Update package.json name and scripts
  - Update Containerfile and compose.yaml
  - _Requirements: 2.1_

- [x] 3.2 Create library modules
  - Create lib/config.ts for environment configuration
  - Create lib/logger.ts (copy from routing service)
  - Create lib/db.ts for Supabase service role client
  - _Requirements: 2.1_

- [x] 3.3 Create Apple validation library
  - Create lib/apple/types.ts with NotificationTypeV2, Subtype, TransactionInfo, RenewalInfo
  - Create lib/apple/validate.ts with decodeJWS, validateAppleReceipt, mapAppleToSubscription
  - _Requirements: 2.2_

- [x] 3.4 Create Google validation library
  - Create lib/google/types.ts with GoogleNotificationType
  - Create lib/google/validate.ts with getGoogleAuthClient, getSubscriptionDetails, acknowledgeSubscription
  - _Requirements: 2.2_

### 2B: Validate Receipt Endpoint

- [x] 4. Create POST /api/subscription/validate-receipt endpoint
- [x] 4.1 Create route file structure
  - Create src/subscription/+routes.api.ts
  - Export basePath = '/api/subscription' and router
  - Apply requireAuth() middleware
  - _Requirements: 2.1_

- [x] 4.2 Implement iOS receipt validation
  - POST to Apple's verifyReceipt endpoint (production first, sandbox fallback on 21007)
  - Parse latest_receipt_info for subscription details
  - Extract expires_date, original_transaction_id, product_id
  - Handle status codes (0 = success, 21007 = use sandbox)
  - _Requirements: 2.2_

- [x] 4.3 Implement Android receipt validation
  - Use Google Play Developer API to validate purchaseToken
  - Extract subscription details (expiryTimeMillis, paymentState, etc.)
  - Call acknowledgeSubscription if acknowledgementState === 0
  - _Requirements: 2.2_

- [x] 4.4 Implement subscription state mapping
  - Map Apple/Google response to subscription_tier and subscription_status
  - Handle active, expired, grace_period states
  - Calculate subscription_expires_at from expires_date_ms
  - Set is_trial based on is_trial_period/paymentState flag
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 4.5 Implement database update
  - Use Supabase service role client to bypass RLS
  - Update profiles table with subscription state
  - Store platform-specific identifiers (original_transaction_id, purchase_token)
  - _Requirements: 2.1_

### 2C: Apple Webhook Endpoint

- [x] 5. Create POST /api/subscription/webhooks/apple endpoint
- [x] 5.1 Create route file structure
  - Create src/webhooks/apple/+routes.api.ts
  - Export basePath = '/api/subscription/webhooks/apple' and router
  - No auth middleware (server-to-server)
  - _Requirements: 2.1_

- [x] 5.2 Implement JWS payload decoding
  - Extract signedPayload from request body
  - Decode JWS to get notificationType, subtype, and data
  - Decode signedTransactionInfo and signedRenewalInfo
  - Extract appAccountToken (our purchase_uuid) to find user
  - _Requirements: 2.1_

- [x] 5.3 Implement notification type handlers
  - SUBSCRIBED + INITIAL_BUY: Set premium, active, is_trial=true
  - SUBSCRIBED + RESUBSCRIBE: Set premium, active, is_trial=false
  - DID_RENEW: Update expiration, clear upcoming_product_id
  - DID_CHANGE_RENEWAL_PREF + DOWNGRADE: Set upcoming_product_id
  - DID_CHANGE_RENEWAL_PREF + UPGRADE: Update immediately
  - DID_CHANGE_RENEWAL_STATUS: Toggle is_renewing
  - DID_FAIL_TO_RENEW + GRACE_PERIOD: Set grace_period status
  - EXPIRED: Set free tier, expired status
  - REFUND: Set free tier, cancelled status
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 5.4 Implement user lookup and database update
  - Find user by purchase_uuid matching appAccountToken
  - Use service role client to update profiles table
  - Return appropriate HTTP status codes
  - _Requirements: 2.1_

### 2D: Google Webhook Endpoint (SKIPPED FOR NOW)

- [ ] 6. Create POST /api/subscription/webhooks/google endpoint (SKIPPED)
- [ ] 6.1 Create route file structure (SKIPPED)
- [ ] 6.2 Implement Pub/Sub message decoding (SKIPPED)
- [ ] 6.3 Implement Google Play Developer API client (SKIPPED)
- [ ] 6.4 Implement notification type handlers (SKIPPED)
- [ ] 6.5 Implement purchase acknowledgment (SKIPPED)

### 2E: Deployment & Configuration

- [x] 7. Deploy subscription microservice
- [x] 7.1 Create deployment configuration
  - Using fly.toml for Fly.io deployment
  - _Requirements: 2.1_

- [x] 7.2 Set up environment variables
  - [x] SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (added to Fly)
  - [x] APPLE_SHARED_SECRET (added to Fly)
  - [x] APPLE_BUNDLE_ID (added to Fly)
  - [ ] ~~GOOGLE_PACKAGE_NAME, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY~~ (skipped)
  - _Requirements: 2.1_

- [x] 7.3 Configure App Store Connect webhook URL
  - Set webhook URL to https://your-domain/api/subscription/webhooks/apple
  - Enable App Store Server Notifications V2
  - _Requirements: 2.1_

- [ ] 7.4 Configure Google Cloud Pub/Sub (SKIPPED FOR NOW)
  - Link topic to Play Console
  - _Requirements: 2.1_

- [ ] 7.5 Test with sandbox/test environments
  - [x] Test Apple webhook with sandbox TEST notification ✅
  - [ ] Test iOS purchase flow with sandbox account (requires mobile app)
  - [ ] ~~Test Android with test license~~ (skipped)
  - _Requirements: 2.1_

## Phase 3: Mobile App expo-iap Integration

- [x] 6. Install and configure expo-iap
- [x] 6.1 Add expo-iap dependencies
  - Run: npx expo install expo-iap
  - expo-iap requires expo-dev-client (already installed)
  - _Requirements: 7.1_

- [x] 6.2 Configure build properties for Android
  - Add expo-build-properties plugin to app.config.ts
  - Set kotlinVersion to 2.1.20+ (required for Google Play Billing v8)
  - _Requirements: 11.1_

- [x] 6.3 Create development build with IAP support
  - IAP requires native code, cannot run in Expo Go
  - Run: npx expo prebuild (if needed)
  - Run: npx expo run:ios or eas build --profile development
  - _Requirements: 11.1_

- [x] 7. Create IAP Context and hooks
- [x] 7.1 Create SubscriptionContext provider
  - Created frontend-expo/hooks/use-subscription.tsx
  - Query profiles table for subscription state including purchase_uuid
  - Implement refresh() to re-fetch subscription
  - **Set up realtime subscription to profiles table** for webhook updates
  - Export isPro, tier, status, expiresAt, purchaseUUID, isTrial, isRenewing
  - _Requirements: 8.1, 8.2_

- [x] 7.2 Create IAPContext provider
  - Created frontend-expo/hooks/use-iap.tsx
  - Uses useIAP hook with onPurchaseSuccess/onPurchaseError callbacks
  - **Pass purchaseUUID as appAccountToken (iOS) / obfuscatedAccountIdAndroid (Android)**
  - Handle receipt validation in onPurchaseSuccess
  - Call finishTransaction only after successful validation
  - _Requirements: 7.3, 8.1_

- [x] 7.3 Implement platform-specific subscription requests
  - iOS: pass appAccountToken
  - Android: Pass obfuscatedAccountIdAndroid, subscriptionOffers
  - _Requirements: 7.3_

- [x] 7.4 Create useSubscription hook
  - Created frontend-expo/hooks/use-subscription.tsx (combined with provider)
  - Export hook that consumes SubscriptionContext
  - _Requirements: 7.1_

- [x] 7.5 Create useFeatureGate hook
  - Created frontend-expo/hooks/use-feature-gate.tsx
  - useFeatureGate(feature) - returns hasAccess, loading, isPro
  - useFeatureAccess() - returns all feature flags and limits
  - _Requirements: 3.3, 4.3_

- [x] 7.6 Wrap app with providers
  - Add SubscriptionProvider and IAPProvider to app/\_layout.tsx
  - SubscriptionProvider is parent (provides purchaseUUID to IAPProvider)
  - Initialize after auth is resolved
  - _Requirements: 10.3_

- [x] 8. Create Paywall component
- [x] 8.1 Create Paywall UI component
  - Created frontend-expo/components/Paywall.tsx
  - Display feature benefits list
  - Fetch and display products from expo-iap
  - Show product title, description, displayPrice
  - Handle platform differences in subscription display
  - _Requirements: 7.1, 7.2_

- [x] 8.2 Implement purchase flow
  - Call requestPurchase with platform-specific options
  - **purchaseUUID passed for webhook user matching**
  - Handle loading state during purchase
  - Subscription updates arrive via realtime after webhook processes
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 8.3 Implement restore purchases
  - Added "Restore Purchases" button
  - Call getAvailablePurchases()
  - Validate each purchase with validate-receipt endpoint
  - Subscription state updated via the service
  - _Requirements: 7.6, 11.6_

- [x] 8.4 Add legal links
  - Added Terms of Service link (https://spinroute.app/terms)
  - Added Privacy Policy link (https://spinroute.app/privacy)
  - Required for App Store approval
  - _Requirements: 11.5_

## Phase 4: Feature Gates in Mobile App

- [x] 9. Implement bike limit gate
- [x] 9.1 Add limit check before bike creation
  - Use useFeatureAccess() hook in app/bikes/index.tsx
  - Check canAddUnlimitedBikes or bikes.length < freeBikeLimit
  - If not allowed, show paywall
  - _Requirements: 3.3_

- [x] 9.2 Handle RLS violation error
  - Catch RLS error in app/bikes/new.tsx
  - Present paywall on limit exceeded
  - _Requirements: 3.2, 3.3_

- [x] 10. Implement trip limit gate
- [x] 10.1 Add limit check before trip start
  - Use useFeatureAccess() hook in MainMapView.tsx
  - Check canRecordUnlimitedTrips before starting recording
  - Query completed trip count in last 7 days
  - If count >= freeWeeklyTripLimit and not pro, show paywall
  - _Requirements: 4.3_

- [x] 10.2 Handle RLS violation error
  - Check tripError for policy violation
  - Present paywall on limit exceeded
  - _Requirements: 4.2, 4.3_

- [x] 11. Implement advanced stats gate
- [x] 11.1 Update trip detail view
  - Added isPro check from subscription context
  - Free users see locked indicator with PRO badge on advanced stats section
  - Tapping locked section navigates to paywall
  - Shows preview of available stats (Elevation Gain, Median Speed)
  - _Requirements: 5.3, 5.4_

- [ ] 12. Implement routing provider gate
- [ ] 12.1 Update provider picker UI
  - Check isPro from subscription context
  - Show lock icon on premium providers
  - Show paywall when tapping locked provider
  - _Requirements: 6.4_

## Phase 5: Routing Service Integration

- [ ] 13. Update routing service to fetch actual subscription tier
- [ ] 13.1 Create getUserPlan helper function
  - Query profiles table for subscription_tier and subscription_status
  - Return 'paid' if premium and active/grace_period
  - Return 'free' otherwise
  - _Requirements: 6.1_

- [ ] 13.2 Update route request handler
  - Replace hardcoded userPlan: 'free'
  - Call getUserPlan with authenticated user ID
  - _Requirements: 6.1, 6.2_

- [ ] 13.3 Verify provider gating works
  - Test request with free user to premium provider
  - Verify 403 response with upgrade message
  - _Requirements: 6.2, 6.3_

## Phase 6: Subscription Management UI

- [x] 14. Add subscription info to settings
- [x] 14.1 Create subscription status section
  - Created frontend-expo/components/SubscriptionSection.tsx
  - Display current tier (Free/SpinRoute Pro)
  - Display subscription status (Active/Trial/Grace Period/Expired)
  - Display renewal/expiration date if applicable
  - Show is_trial indicator if in trial period
  - _Requirements: 9.1_

- [x] 14.2 Add manage subscription link
  - Opens Linking.openURL to App Store/Play Store subscription management
  - Opens native subscription management (App Store/Play Store)
  - _Requirements: 9.2_

- [x] 14.3 Add grace period warning
  - Check subscription_status for 'grace_period'
  - Display warning banner about upcoming expiration
  - Link to update payment method
  - _Requirements: 9.3_

- [x] 14.4 Add resubscribe prompt for expired
  - Check subscription_status for 'expired'
  - Display prompt to resubscribe with paywall link
  - _Requirements: 9.4_

## Phase 7: App Store & Play Console Configuration

### 7A: iOS App Store Connect Setup ✅ COMPLETED

- [x] 15. Configure App Store Connect
- [x] 15.1 Create subscription products
  - Product IDs:
    - `xyz.itsnisu.spinroute.pro.weekly.v1` ($1.99/week)
    - `xyz.itsnisu.spinroute.pro.monthly.v1` ($4.99/month)
    - `xyz.itsnisu.spinroute.pro.yearly.v1` ($39.99/year)
  - Configure subscription group (SpinRoute Pro)
  - Add localized description and benefits
  - Set up 3-day free trial offer
  - _Requirements: 11.3_

- [x] 15.2 Generate App Store Shared Secret
  - App Store Connect > App > App Information > Shared Secret
  - Added to Fly.io service as APPLE_SHARED_SECRET
  - _Requirements: 2.2_

- [x] 15.3 **Configure App Store Server Notifications V2**
  - App Store Connect > App > App Information > App Store Server Notifications
  - Sandbox Server URL: https://iap-service.fly.dev/api/subscription/webhooks/apple
  - Production Server URL: https://iap-service.fly.dev/api/subscription/webhooks/apple
  - Version 2 notifications enabled ✅
  - Test notification received successfully ✅
  - _Requirements: 2.1_

- [ ] 15.4 Create sandbox tester account
  - App Store Connect > Users and Access > Sandbox > Testers
  - Create test account for purchase testing
  - _Requirements: 10.1_

### 7B: Google Play Console Setup (SKIPPED FOR NOW)

- [ ] 16. Configure Google Play Console (SKIPPED)
- [ ] 16.1 Create subscription product (SKIPPED)
  - Product ID: xyz.itsnisu.spinroute.pro.monthly.v1
  - Configure base plan with monthly billing
  - Set up 3-day free trial offer
  - Add localized description
  - _Requirements: 11.3_

- [ ] 16.2 **Set up Real-time Developer Notifications** (SKIPPED)
  - Google Cloud Console > Pub/Sub > Create Topic
  - Configure Push Subscription to: https://iap-service.fly.dev/api/subscription/webhooks/google
  - _Requirements: 2.1_

- [ ] 16.3 Configure Google Cloud service account (SKIPPED)
- [ ] 16.4 Set up license testers (SKIPPED)

### 7C: EAS & Production Build Configuration

- [ ] 17. Configure EAS for production
- [ ] 17.1 Update eas.json with iOS build profiles
  - Set credentialsSource to "remote" for production
  - Configure Apple Team ID
  - _Requirements: 11.2_

- [ ] 17.2 Set up EAS secrets
  - Add EXPO_PUBLIC_SUPABASE_URL
  - Add EXPO_PUBLIC_SUPABASE_ANON_KEY
  - Add EXPO_PUBLIC_IAP_SERVICE_URL=https://iap-service.fly.dev
  - _Requirements: 7.1_

- [x] 17.3 Set up IAP service secrets (on Fly.io)
  - APPLE_SHARED_SECRET ✅
  - APPLE_BUNDLE_ID ✅
  - SUPABASE_URL ✅
  - SUPABASE_SERVICE_ROLE_KEY ✅
  - _Requirements: 2.1_

- [ ] 18. Build and submit
- [ ] 18.1 Build production iOS app
  - Run: eas build --platform ios --profile production
  - Verify app includes IAP capability
  - _Requirements: 11.1, 11.2_

- [ ] 18.2 Build production Android app
  - Run: eas build --platform android --profile production
  - Upload to internal testing track first
  - _Requirements: 11.1, 11.2_

- [ ] 18.3 Submit to App Store
  - Run: eas submit --platform ios
  - Include subscription description in metadata
  - Add screenshots of paywall
  - Submit for review
  - _Requirements: 11.5_

## Phase 8: Testing & Validation

- [ ] 19. Database testing
- [ ] 19.1 Test RLS policies with free user
  - Verify can add 1 bike
  - Verify 2nd bike insert fails with error
  - Verify can record 1 trip per week
  - Verify 2nd trip in same week fails
  - Verify cannot view advanced stats
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 5.2_

- [ ] 19.2 Test RLS policies with pro user
  - Verify unlimited bikes
  - Verify unlimited trips
  - Verify can view advanced stats
  - _Requirements: 3.1, 4.1, 5.1_

- [ ] 20. Webhook testing
- [ ] 20.1 Test Apple webhook with sandbox notifications
  - Trigger purchase in sandbox
  - Verify IAP service (iap-service.fly.dev) receives notification
  - Verify user profile updated correctly
  - Verify app receives realtime update
  - _Requirements: 2.1_

- [ ] 20.2 Test Google webhook with test notifications (SKIPPED FOR NOW)
  - Deferred until Android implementation
  - _Requirements: 2.1_

- [ ] 21. End-to-end sandbox testing
- [ ] 21.1 Test iOS purchase flow in sandbox
  - Use sandbox Apple ID
  - Complete purchase flow with appAccountToken
  - Verify receipt validation succeeds
  - Verify webhook fires and updates database
  - Verify app reflects pro status via realtime
  - _Requirements: 7.3, 7.4, 8.1_

- [ ] 21.2 Test Android purchase flow (SKIPPED FOR NOW)
  - Deferred until Android implementation
  - _Requirements: 7.3, 7.4, 8.1_

- [ ] 21.3 Test subscription lifecycle (iOS)
  - Test renewal (sandbox: 5 minutes for monthly)
  - Verify DID_RENEW webhook updates expiration
  - Test cancellation (disable auto-renew)
  - Verify DID_CHANGE_RENEWAL_STATUS updates is_renewing
  - Test expiration after cancellation
  - Test grace period behavior (DID_FAIL_TO_RENEW)
  - _Requirements: 2.4, 2.5, 9.3, 9.4_

- [ ] 21.4 Test subscription lifecycle (Android) (SKIPPED FOR NOW)
  - Deferred until Android implementation
  - _Requirements: 2.4, 2.5_

- [ ] 21.5 Test restore purchases
  - Sign out and sign in with same account
  - Tap restore purchases
  - Verify subscription restored via validate-receipt
  - Test on fresh device/simulator
  - _Requirements: 7.6, 10.1, 10.2, 10.3_

- [ ] 21.6 Test error scenarios
  - Test network failure during purchase
  - Test invalid receipt handling
  - Test user cancellation (should not show error)
  - Test webhook with unknown appAccountToken (should log error)
  - _Requirements: 7.5_

## Notes

### Architecture: IAP Microservice on Fly.io

The subscription handling is implemented as a standalone microservice (`services/iap`) deployed to Fly.io at `iap-service.fly.dev`:

- **Validate Receipt Endpoint**: `POST https://iap-service.fly.dev/api/subscription/validate-receipt`
- **Apple Webhook**: `POST https://iap-service.fly.dev/api/subscription/webhooks/apple`
- **Google Webhook**: (Not yet implemented) `POST https://iap-service.fly.dev/api/subscription/webhooks/google`

### Server-Side Webhooks Are Essential

The react-native-iap guide makes clear that **server-side webhook handlers are required** for proper subscription management:

1. **iOS: App Store Server Notifications V2** - Apple sends notifications for all subscription events (renewal, cancellation, upgrade, downgrade, grace period, expiration, refund)
2. **Android: Real-time Developer Notifications via Pub/Sub** - Google Play sends notifications through Cloud Pub/Sub

Without webhooks, you cannot properly handle:

- Subscription renewals (happens automatically, no client interaction)
- Cancellations made outside the app
- Grace periods and billing retry
- Upgrades/downgrades
- Refunds

### Critical: Linking Purchases to Users

The `appAccountToken` (iOS) and `obfuscatedAccountIdAndroid` (Android) are **critical** for matching webhook notifications to users:

1. Generate a unique `purchase_uuid` for each user when their account is created
2. Pass this UUID when requesting subscriptions
3. Webhook handlers use this UUID to find the user in the database

### Important expo-iap Patterns

1. **Never finish transaction before server validation**: Use `andDangerouslyFinishTransactionAutomatically: false`
2. **Event-driven purchases**: Use `onPurchaseSuccess`/`onPurchaseError` callbacks, not promises
3. **Restore on app launch**: Call `getAvailablePurchases()` to restore entitlements
4. **Platform-specific request format**: iOS and Android have different request structures
5. **Clear iOS transactions**: Call `clearTransactionIOS()` before requesting new subscription to handle stale transactions
6. **Android acknowledgment**: Purchases must be acknowledged within 3 days or they are automatically refunded

### Subscription Tiers

The app uses two tiers:

- **free**: Default tier, limited features (1 bike, 1 trip/week, no advanced stats)
- **pro**: Paid tier, all features unlocked (unlimited bikes, unlimited trips, advanced stats)

Note: The spec originally used "premium" but was updated to "pro" to match the implementation.

### Product IDs

| Platform    | Product ID                             |
| ----------- | -------------------------------------- |
| iOS Weekly  | `xyz.itsnisu.spinroute.pro.weekly.v1`  |
| iOS Monthly | `xyz.itsnisu.spinroute.pro.monthly.v1` |
| iOS Yearly  | `xyz.itsnisu.spinroute.pro.yearly.v1`  |

### Sandbox Testing Notes

- iOS sandbox subscriptions renew every 5 minutes (monthly) / 1 hour (yearly)
- Create dedicated sandbox tester account in App Store Connect
- Sign out of personal Apple ID before testing
- Sandbox purchases don't charge real money
- Android license testers can be added in Play Console
- Use physical devices for most reliable testing
