import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useClient } from 'react-supabase';
import { Colors } from '@/constants/theme';
import { useSubscription } from '@/contexts/user-settings-context';
import { useFeatureAccess } from '@/hooks/use-feature-gate';
import { useBikes } from '@/hooks/use-bikes';
import { usePaywall } from '@/hooks/use-paywall';
import SettingsCard from './SettingsCard';
import SettingsRow from './SettingsRow';

export default function SubscriptionSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showPaywall } = usePaywall();
  const { isPro, status, expiresAt, isTrial, isRenewing, loading } = useSubscription();

  const { freeBikeLimit, freeWeeklyTripLimit } = useFeatureAccess();
  const { bikes } = useBikes();
  const supabase = useClient();

  // Track weekly trip count
  const [weeklyTripCount, setWeeklyTripCount] = useState(0);
  const [tripsLoading, setTripsLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyTripCount = async () => {
      setTripsLoading(true);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { count, error } = await supabase
        .schema('recording')
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('started_at', oneWeekAgo.toISOString());

      if (!error && count !== null) {
        setWeeklyTripCount(count);
      }
      setTripsLoading(false);
    };

    fetchWeeklyTripCount();
  }, []); // Empty deps - only fetch once on mount

  const handleManageSubscription = () => {
    // Deep link to system subscription management
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const handleUpgrade = () => {
    showPaywall();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      hour12: true,
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return '#10b981'; // green
      case 'grace_period':
        return '#f59e0b'; // amber
      case 'expired':
      case 'cancelled':
        return '#ef4444'; // red
      default:
        return colors.icon;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'active':
        return isTrial ? 'Trial Active' : 'Active';
      case 'grace_period':
        return 'Grace Period';
      case 'expired':
        return 'Expired';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SettingsCard title="Subscription" icon="workspace-premium">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
        </View>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title={`Subscription: ${isPro ? 'Pro' : 'Free'}`} icon="workspace-premium">
      <View style={styles.content}>
        {/* Current Plan */}
        {/* <SettingsRow
          label="Current Plan"
          description={
            <View style={styles.planValue}>
              <Text style={[styles.planText, { color: colors.text }]}>
                {isPro ? 'SpinRoute Pro' : 'Free'}
              </Text>
              {isPro && (
                <View style={[styles.badge, { backgroundColor: '#10b981' }]}>
                  <Text style={styles.badgeText}>PRO</Text>
                </View>
              )}
            </View>
          }
        /> */}

        {/* Status - only show for Pro users */}
        {isPro && (
          <SettingsRow
            label="Status"
            description={
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusLabel()}
                </Text>
              </View>
            }
            showBorder
          />
        )}

        {/* Renewal/Expiration - only show for Pro users */}
        {isPro && expiresAt && (
          <SettingsRow
            label={isRenewing ? 'Renews' : 'Expires'}
            description={formatDate(expiresAt)}
            showBorder
          />
        )}

        {/* Free Plan Usage - only show for Free users */}
        {!isPro && (
          <View style={styles.usageSection}>
            <Text style={[styles.usageSectionTitle, { color: colors.text }]}>Usage</Text>

            {/* Pro Benefits Teaser */}
            <View style={[styles.proTeaser, { backgroundColor: colors.background }]}>
              <Text style={[styles.proTeaserTitle, { color: colors.text }]}>
                ✨ Go Pro for unlimited access
              </Text>
              <Text style={[styles.proTeaserText, { color: colors.icon }]}>
                Unlimited bikes, trips, and advanced stats
              </Text>
            </View>

            {/* Bikes Usage */}
            <View style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <View style={styles.usageLabelRow}>
                  <MaterialIcons name="pedal-bike" size={18} color={colors.icon} />
                  <Text style={[styles.usageLabel, { color: colors.icon }]}>Bikes</Text>
                </View>
                <Text style={[styles.usageCount, { color: colors.text }]}>
                  {bikes.length} / {freeBikeLimit}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.buttonBorder }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((bikes.length / freeBikeLimit) * 100, 100)}%`,
                      backgroundColor: bikes.length >= freeBikeLimit ? '#f59e0b' : '#10b981',
                    },
                  ]}
                />
              </View>
              {bikes.length >= freeBikeLimit && (
                <Text style={styles.limitReachedText}>Limit reached</Text>
              )}
            </View>

            {/* Weekly Trips Usage */}
            <View style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <View style={styles.usageLabelRow}>
                  <MaterialIcons name="route" size={18} color={colors.icon} />
                  <Text style={[styles.usageLabel, { color: colors.icon }]}>Trips this week</Text>
                </View>
                {tripsLoading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={[styles.usageCount, { color: colors.text }]}>
                    {weeklyTripCount} / {freeWeeklyTripLimit}
                  </Text>
                )}
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.buttonBorder }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((weeklyTripCount / freeWeeklyTripLimit) * 100, 100)}%`,
                      backgroundColor:
                        weeklyTripCount >= freeWeeklyTripLimit ? '#f59e0b' : '#10b981',
                    },
                  ]}
                />
              </View>
              {weeklyTripCount >= freeWeeklyTripLimit && (
                <Text style={styles.limitReachedText}>Limit reached • Resets in 7 days</Text>
              )}
            </View>
          </View>
        )}

        {/* Grace period warning */}
        {status === 'grace_period' && (
          <View style={[styles.warningBanner, { backgroundColor: '#f59e0b20' }]}>
            <MaterialIcons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              Your subscription is in a grace period. Please update your payment method to continue.
            </Text>
          </View>
        )}

        {/* Expired prompt */}
        {status === 'expired' && (
          <View style={[styles.warningBanner, { backgroundColor: '#ef444420' }]}>
            <MaterialIcons name="error-outline" size={20} color="#ef4444" />
            <Text style={[styles.warningText, { color: '#ef4444' }]}>
              Your subscription has expired. Resubscribe to unlock Pro features.
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {isPro ? (
        <TouchableOpacity
          style={[styles.manageButton, { borderColor: colors.buttonBorder }]}
          onPress={handleManageSubscription}
        >
          <Text style={[styles.manageButtonText, { color: colors.buttonIcon }]}>
            Manage Subscription
          </Text>
          <MaterialIcons name="open-in-new" size={16} color={colors.buttonIcon} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: '#007AFF' }]}
          onPress={handleUpgrade}
        >
          <MaterialIcons name="star" size={18} color="#fff" />
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      )}
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  content: {
    gap: 0,
  },
  planValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planText: {
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginVertical: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#f59e0b',
    lineHeight: 18,
  },
  manageButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  upgradeButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Usage section styles
  usageSection: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 16,
  },
  usageSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  usageItem: {
    gap: 6,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usageLabel: {
    fontSize: 14,
  },
  usageCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  limitReachedText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  proTeaser: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  proTeaserTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  proTeaserText: {
    fontSize: 13,
  },
});
