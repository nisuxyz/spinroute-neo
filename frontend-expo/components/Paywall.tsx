import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Linking,
  useColorScheme,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  TouchableOpacity,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useIAPContext, SUBSCRIPTION_SKUS } from '@/hooks/use-iap';
import { useSubscription } from '@/hooks/use-subscription';
import { Colors, electricPurple, Spacing, BorderRadius, Typography } from '@/constants/theme';
import type { ProductSubscription } from 'expo-iap';

const TERMS_URL = 'https://spinroute.app/terms';
const PRIVACY_URL = 'https://spinroute.app/privacy';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
}

export function Paywall({ visible, onClose }: PaywallProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const {
    connected,
    subscriptions,
    productsLoading,
    purchasing,
    restoring,
    purchaseSubscription,
    restorePurchases,
  } = useIAPContext();

  const { isPro } = useSubscription();

  // Snap points - smaller for pro status, larger for purchase flow
  const snapPoints = useMemo(() => (isPro ? ['40%'] : ['90%']), [isPro]);

  // Present modal when visible becomes true
  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    }
  }, [visible]);

  // Sort subscriptions by duration (weekly, monthly, yearly)
  const sortedSubscriptions = useMemo(() => {
    const order = [SUBSCRIPTION_SKUS.WEEKLY, SUBSCRIPTION_SKUS.MONTHLY, SUBSCRIPTION_SKUS.YEARLY];
    return [...subscriptions].sort((a, b) => {
      return (
        order.indexOf(a.id as (typeof order)[number]) -
        order.indexOf(b.id as (typeof order)[number])
      );
    });
  }, [subscriptions]);

  const handlePurchase = useCallback(
    (productId: string) => {
      purchaseSubscription(productId);
    },
    [purchaseSubscription],
  );

  const getSubscriptionLabel = (productId: string): string => {
    if (productId.includes('weekly')) return 'Weekly';
    if (productId.includes('monthly')) return 'Monthly';
    if (productId.includes('yearly')) return 'Yearly';
    return 'Subscription';
  };

  const getBadgeColor = (productId: string): string => {
    if (productId.includes('yearly')) return '#10b981';
    return electricPurple;
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  // Pro user content
  if (isPro) {
    return (
      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        onDismiss={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.icon }}
      >
        <View style={styles.proContainer}>
          <View style={styles.proIconContainer}>
            <MaterialIcons name="workspace-premium" size={64} color={electricPurple} />
          </View>
          <Text style={[styles.proTitle, { color: colors.text }]}>You're a Pro! 🎉</Text>
          <Text style={[styles.proSubtitle, { color: colors.icon }]}>
            You have full access to all SpinRoute features.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: electricPurple }]}
            onPress={onClose}
          >
            <Text style={styles.primaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    );
  }

  // Purchase flow content
  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.icon }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="workspace-premium" size={48} color={electricPurple} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Upgrade to Pro</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Unlock unlimited bikes, trips, and advanced analytics
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.buttonBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What you'll get</Text>
          <View style={styles.featuresList}>
            <FeatureItem icon="pedal-bike" text="Unlimited bikes" colors={colors} />
            <FeatureItem icon="route" text="Unlimited trip recording" colors={colors} />
            <FeatureItem icon="analytics" text="Advanced statistics" colors={colors} />
            <FeatureItem icon="map" text="Expanded route providers" colors={colors} />
          </View>
        </View>

        {/* Connection Error */}
        {!connected && (
          <View style={[styles.errorContainer, { backgroundColor: colors.buttonBackground }]}>
            <MaterialIcons name="wifi-off" size={20} color="#ef4444" />
            <Text style={styles.errorText}>
              Unable to connect to the App Store. Please check your connection.
            </Text>
          </View>
        )}

        {/* Plans */}
        {productsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={electricPurple} />
            <Text style={[styles.loadingText, { color: colors.icon }]}>Loading plans...</Text>
          </View>
        ) : (
          <View style={styles.plans}>
            {sortedSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                label={getSubscriptionLabel(subscription.id)}
                badgeColor={getBadgeColor(subscription.id)}
                onPress={() => handlePurchase(subscription.id)}
                disabled={purchasing || restoring || !connected}
                loading={purchasing}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={restorePurchases}
          disabled={restoring || purchasing || !connected}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={electricPurple} />
          ) : (
            <Text style={[styles.restoreButtonText, { color: electricPurple }]}>
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>

        {/* Maybe Later */}
        <TouchableOpacity style={styles.skipButton} onPress={onClose}>
          <Text style={[styles.skipButtonText, { color: colors.icon }]}>Maybe Later</Text>
        </TouchableOpacity>

        {/* Legal Text */}
        <Text style={[styles.legal, { color: colors.icon }]}>
          Payment will be charged to your Apple ID account at confirmation of purchase. Subscription
          automatically renews unless canceled at least 24 hours before the end of the current
          period. Your account will be charged for renewal within 24 hours prior to the end of the
          current period.
        </Text>

        {/* Legal Links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[styles.legalLink, { color: electricPurple }]}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={[styles.legalSeparator, { color: colors.icon }]}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={[styles.legalLink, { color: electricPurple }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

interface FeatureItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
  colors: typeof Colors.light;
}

function FeatureItem({ icon, text, colors }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconContainer, { backgroundColor: `${electricPurple}15` }]}>
        <MaterialIcons name={icon} size={20} color={electricPurple} />
      </View>
      <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

interface SubscriptionCardProps {
  subscription: ProductSubscription;
  label: string;
  badgeColor: string;
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  colors: typeof Colors.light;
}

function SubscriptionCard({
  subscription,
  label,
  badgeColor,
  onPress,
  disabled,
  loading,
  colors,
}: SubscriptionCardProps) {
  const isYearly = label === 'Yearly';

  return (
    <TouchableOpacity
      style={[
        styles.planCard,
        { backgroundColor: colors.buttonBackground },
        isYearly && styles.planCardHighlighted,
        disabled && styles.planCardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {isYearly && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>Best Value</Text>
        </View>
      )}
      <View style={styles.planContent}>
        <View style={styles.planInfo}>
          <Text style={[styles.planLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.planPeriod, { color: colors.icon }]}>
            {label === 'Weekly' && 'per week'}
            {label === 'Monthly' && 'per month'}
            {label === 'Yearly' && 'per year'}
          </Text>
        </View>
        <View style={styles.planPriceContainer}>
          <Text style={[styles.planPrice, { color: colors.text }]}>
            {subscription.displayPrice}
          </Text>
          {loading && (
            <ActivityIndicator style={styles.planLoading} size="small" color={electricPurple} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Pro content
  proContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  proIconContainer: {
    marginBottom: Spacing.lg,
  },
  proTitle: {
    ...Typography.displayMedium,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  proSubtitle: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  // Purchase flow
  scrollContent: {
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${electricPurple}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.displayLarge,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  // Features
  featuresCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h2,
    marginBottom: Spacing.lg,
  },
  featuresList: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    ...Typography.bodyLarge,
  },
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyMedium,
  },
  // Plans
  plans: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  planCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  planCardHighlighted: {
    borderWidth: 2,
    borderColor: electricPurple,
  },
  planCardDisabled: {
    opacity: 0.6,
  },
  planContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    ...Typography.h2,
    marginBottom: 2,
  },
  planPeriod: {
    ...Typography.bodySmall,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  planLoading: {
    marginLeft: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Buttons
  primaryButton: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    ...Typography.bodyLarge,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  restoreButtonText: {
    ...Typography.bodyMedium,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  skipButtonText: {
    ...Typography.bodyMedium,
  },
  // Legal
  legal: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  legalLink: {
    ...Typography.bodySmall,
  },
  legalSeparator: {
    ...Typography.bodySmall,
  },
});
