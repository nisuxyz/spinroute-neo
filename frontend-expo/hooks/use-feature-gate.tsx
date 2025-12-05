import { useSubscription } from '@/contexts/user-settings-context';

/**
 * Feature gates for controlling access to premium features
 */
export type FeatureGate =
  | 'unlimited_bikes'
  | 'unlimited_trips'
  | 'advanced_stats'
  | 'export_data'
  | 'priority_support';

/**
 * Hook to check if a user has access to a specific feature
 */
export function useFeatureGate(feature: FeatureGate): {
  hasAccess: boolean;
  loading: boolean;
  isPro: boolean;
} {
  const { isPro, loading } = useSubscription();

  // Define which features require Pro subscription
  const proFeatures: Set<FeatureGate> = new Set([
    'unlimited_bikes',
    'unlimited_trips',
    'advanced_stats',
    'export_data',
    'priority_support',
  ]);

  const hasAccess = proFeatures.has(feature) ? isPro : true;

  return {
    hasAccess,
    loading,
    isPro,
  };
}

/**
 * Hook to get all feature access states at once
 */
export function useFeatureAccess() {
  const { isPro, loading, tier, status, isTrial, expiresAt } = useSubscription();

  return {
    // Feature flags
    canAddUnlimitedBikes: isPro,
    canRecordUnlimitedTrips: isPro,
    canViewAdvancedStats: isPro,
    canExportData: isPro,
    hasPrioritySupport: isPro,

    // Subscription info
    isPro,
    tier,
    status,
    isTrial,
    expiresAt,
    loading,

    // Free tier limits
    freeBikeLimit: 1,
    freeWeeklyTripLimit: 1,
  };
}
