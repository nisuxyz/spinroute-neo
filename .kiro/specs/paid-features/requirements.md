# Requirements Document

## Introduction

The Paid Features system enables SpinRoute Neo to offer premium functionality through subscription tiers, gating advanced capabilities behind a paid plan while providing a complete and valuable free experience. The system leverages **expo-iap** for native iOS/Android in-app purchase management via StoreKit 2 and Google Play Billing, Supabase for subscription state storage, and Row-Level Security (RLS) policies for server-side feature enforcement.

This specification covers the complete subscription lifecycle: purchase flow, receipt validation, feature gating, and subscription management. The initial implementation targets iOS with App Store subscriptions, with Android support planned for a future iteration.

## Glossary

- **Subscription Tier**: The user's plan level ('free' or 'premium')
- **Subscription Status**: The current state of a subscription ('active', 'expired', 'cancelled', 'grace_period')
- **expo-iap**: Open-source library for handling in-app purchases in Expo/React Native apps
- **StoreKit 2**: Apple's modern framework for in-app purchases on iOS
- **Paywall**: UI component displayed when a user attempts to access premium features
- **Feature Gate**: Logic that restricts access to functionality based on subscription tier
- **RLS Policy**: Row-Level Security policy in PostgreSQL that enforces access control at the database level
- **Receipt Validation**: Server-side verification of purchase receipts with Apple/Google servers
- **Original Transaction ID**: Unique identifier from App Store linking all transactions in a subscription

## Requirements

### Subscription Data Model

### Requirement 1

**User Story:** As a developer, I want subscription state stored in the database, so that feature gating can be enforced at the database level via RLS policies

#### Acceptance Criteria

1. THE Database SHALL store subscription_tier on the public.profiles table with values 'free' or 'pro', defaulting to 'free'
2. THE Database SHALL store subscription_status on the public.profiles table with values 'active', 'expired', 'cancelled', or 'grace_period', defaulting to 'active'
3. THE Database SHALL store subscription_expires_at as a nullable timestamp on public.profiles for tracking subscription end dates
4. THE Database SHALL store original_transaction_id as a nullable text field on public.profiles to link Supabase users to App Store subscriptions
5. THE Database SHALL enforce that users cannot directly update subscription_tier, subscription_status, or subscription_expires_at via RLS policies (only service role can update)

### Requirement 2

**User Story:** As a system administrator, I want subscription state validated and synchronized via server-side receipt validation, so that the database reflects the current subscription status

#### Acceptance Criteria

1. WHEN a purchase is completed in the app, THE System SHALL validate the receipt with Apple's verifyReceipt endpoint via an Edge Function
2. THE Edge Function SHALL use the App Store Shared Secret for receipt validation
3. THE Edge Function SHALL update the user's subscription fields in public.profiles based on validation results
4. WHEN a subscription expires, THE Edge Function SHALL set subscription_status to 'expired' and subscription_tier to 'free'
5. WHEN a subscription is in billing retry (grace period), THE Edge Function SHALL set subscription_status to 'grace_period' while maintaining subscription_tier as 'premium'

### Feature Gating - Database Level

### Requirement 3

**User Story:** As a free user, I want to add 1 bike, so that I can use the core bike tracking functionality

#### Acceptance Criteria

1. THE Database RLS policy on vehicles.user_bike SHALL allow INSERT when the user has subscription_tier = 'pro' OR the user has fewer than 1 existing bike
2. WHEN a free user attempts to insert a 2nd bike, THE Database SHALL reject the insert with a policy violation error
3. THE Mobile App SHALL display an upgrade prompt when a free user attempts to add a bike beyond the limit
4. THE RLS policy SHALL query public.profiles to determine the user's subscription_tier

### Requirement 4

**User Story:** As a free user, I want to record 1 trip per week, so that I can use the core trip recording functionality

#### Acceptance Criteria

1. THE Database RLS policy on recording.trips SHALL allow INSERT when the user has subscription_tier = 'pro' OR the user has fewer than 1 completed trip in the past 7 days
2. WHEN a free user attempts to start a 2nd trip in the same week, THE Database SHALL reject the insert with a policy violation error
3. THE Mobile App SHALL display an upgrade prompt when a free user attempts to record a trip beyond the limit
4. THE RLS policy SHALL count only trips with status 'completed' started within the last 7 days toward the limit

### Requirement 5

**User Story:** As a free user, I want access to basic trip statistics, so that I have valuable functionality without upgrading

#### Acceptance Criteria

1. THE Database RLS policy on recording.trip_basic_stats SHALL allow SELECT for all authenticated users viewing their own trip stats
2. THE Database RLS policy on recording.trip_advanced_stats SHALL allow SELECT only when the user has subscription_tier = 'pro'
3. THE Mobile App SHALL display a locked/upgrade indicator on advanced statistics for free users
4. THE Mobile App SHALL show basic statistics (distance, duration, average speed, max speed) to all users

### Feature Gating - Routing Service

### Requirement 6

**User Story:** As a free user, I want access to 1-2 routing providers, so that I can plan routes without upgrading

#### Acceptance Criteria

1. THE Routing Service SHALL query the user's subscription_tier from public.profiles when processing route requests
2. WHEN a free user requests a route from a premium-only provider, THE Routing Service SHALL return a 403 Forbidden error with an upgrade message
3. THE Routing Service SHALL mark providers as requiresPaidPlan: true or false in provider capabilities
4. THE Mobile App SHALL display provider availability based on user's subscription tier, showing locked indicators for premium providers
5. THE Free tier SHALL include access to at least Mapbox and OpenRouteService providers

### Paywall and Purchase Flow

### Requirement 7

**User Story:** As a user, I want to view available subscription plans and purchase a subscription, so that I can unlock premium features

#### Acceptance Criteria

1. THE Mobile App SHALL display a paywall screen showing available subscription products fetched via expo-iap
2. THE Paywall SHALL display subscription price, billing frequency, and included features
3. WHEN the user initiates a purchase, THE Mobile App SHALL use expo-iap requestPurchase to process the App Store transaction
4. UPON successful purchase, THE Mobile App SHALL validate the receipt with the server and update local state
5. THE Paywall SHALL handle purchase errors gracefully and display appropriate error messages
6. THE Paywall SHALL include a "Restore Purchases" button for users who have previously subscribed

### Requirement 8

**User Story:** As a user, I want my subscription status reflected immediately after purchase, so that I can access premium features without delay

#### Acceptance Criteria

1. WHEN expo-iap reports a successful purchase, THE Mobile App SHALL send the receipt to the validation Edge Function
2. THE Mobile App SHALL re-fetch the user's profile from Supabase to verify subscription_tier after validation
3. THE Mobile App SHALL poll for subscription status updates if validation is delayed (max 10 seconds, 2-second intervals)
4. WHEN subscription status is confirmed, THE Mobile App SHALL dismiss the paywall and unlock premium features

### Subscription Management

### Requirement 9

**User Story:** As a premium user, I want to view and manage my subscription, so that I can cancel or change my plan

#### Acceptance Criteria

1. THE Mobile App SHALL display current subscription tier, status, and renewal/expiration date in settings
2. THE Mobile App SHALL provide a link to manage subscription via App Store (iOS) settings using expo-iap's deepLinkToSubscriptions
3. WHEN subscription is in grace_period status, THE Mobile App SHALL display a warning about upcoming expiration
4. WHEN subscription has expired, THE Mobile App SHALL display a prompt to resubscribe

### Requirement 10

**User Story:** As a user, I want my subscription to persist across app reinstalls and device changes, so that I don't lose access to premium features

#### Acceptance Criteria

1. WHEN a user logs in, THE Mobile App SHALL call expo-iap's getActiveSubscriptions to check for existing subscriptions
2. THE Mobile App SHALL validate any restored subscriptions with the server and update the database
3. THE Mobile App SHALL sync subscription status with local state on each app launch
4. IF a discrepancy exists between App Store and database subscription_tier, THE Mobile App SHALL re-validate the receipt

### iOS App Store Requirements

### Requirement 11

**User Story:** As a developer, I want the app properly configured for App Store review, so that the subscription feature is approved

#### Acceptance Criteria

1. THE app.config.ts SHALL include expo-iap plugin and expo-build-properties with Kotlin 2.1.20+
2. THE eas.json SHALL be configured with production Apple credentials for App Store submission
3. THE App Store Connect account SHALL have a subscription product configured (e.g., com.itsnisu.spinrouteneo.premium.monthly)
4. THE Supabase project SHALL have an Edge Function for receipt validation with App Store Shared Secret
5. THE App SHALL include links to Terms of Service and Privacy Policy accessible from the paywall
6. THE App SHALL restore purchases when user taps "Restore Purchases" button

### Premium Feature Summary

### Requirement 12

**User Story:** As a product owner, I want clear differentiation between free and premium tiers, so that users understand the value of upgrading

#### Acceptance Criteria

**Free Tier includes:**

1. 1 bike in vehicles.user_bike
2. 1 recorded trip per week in recording.trips
3. Basic trip statistics (distance, duration, average/max speed)
4. Access to Mapbox and OpenRouteService routing providers
5. Standard cycling profile routing only

**Pro Tier includes:**

1. Unlimited bikes
2. Unlimited recorded trips
3. Advanced trip statistics (elevation, speed percentiles, heart rate zones)
4. All routing providers (including premium providers like Google Maps)
5. Multiple cycling profiles (road, mountain, e-bike)
6. Crash/fall detection (future)
7. Advanced location sharing (future)
