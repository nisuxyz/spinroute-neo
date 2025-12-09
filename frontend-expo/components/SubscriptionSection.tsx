import React, { useEffect, useState } from 'react';
import { View, Linking, Platform } from 'react-native';
import { Icon } from './icon';
import { useClient } from 'react-supabase';
import { useSubscription } from '@/contexts/user-settings-context';
import { useFeatureAccess } from '@/hooks/use-feature-gate';
import { useBikes } from '@/hooks/use-bikes';
import { usePaywall } from '@/hooks/use-paywall';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Label } from './ui/label';
import { Text } from './ui/text';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

export default function SubscriptionSection() {
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
        return 'text-green-500 bg-green-500/20';
      case 'grace_period':
        return 'text-amber-500 bg-amber-500/20';
      case 'expired':
      case 'cancelled':
        return 'text-red-500 bg-red-500/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusDotColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'grace_period':
        return 'bg-amber-500';
      case 'expired':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-muted-foreground';
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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex-row">
        <View className="flex-1 gap-1.5">
          <CardTitle variant="large">Subscription</CardTitle>
        </View>
      </CardHeader>
      <CardContent>
        {loading ? (
          <View className="w-full justify-center gap-8">
            <View className="gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </View>
            <View className="gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-2 w-full rounded-full" />
            </View>
            <View className="gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-2 w-full rounded-full" />
            </View>
          </View>
        ) : (
          <View className="w-full justify-center gap-8">
            <View className="gap-2">
              <Label htmlFor="email">Current Plan</Label>
              <Text variant="small" className="text-gray-500">
                {isPro ? 'Pro' : 'Free'}
              </Text>
            </View>

            <View className="gap-2">
              <Label htmlFor="name">
                Bikes: {bikes.length} / {freeBikeLimit}
              </Label>
              <Progress
                value={(bikes.length / freeBikeLimit) * 100}
                className="mt-1"
                indicatorClassName={bikes.length / freeBikeLimit > 1 ? 'bg-yellow-500' : ''}
              />
            </View>

            <View className="gap-2">
              <Label htmlFor="name">
                Trips: {weeklyTripCount} / {freeWeeklyTripLimit}
              </Label>
              <Progress
                value={(weeklyTripCount / freeWeeklyTripLimit) * 100}
                className="mt-1"
                indicatorClassName={
                  weeklyTripCount / freeWeeklyTripLimit > 1 ? 'bg-yellow-500' : ''
                }
              />
            </View>
            {/* Subscription status + expiry (Pro users) */}
            {isPro && (
              <View className="mt-3">
                <Label>Subscription Status</Label>
                <View className="mt-3">
                  <View
                    className={cn(
                      'flex-row items-center px-2.5 py-1 rounded-xl gap-1.5',
                      getStatusColor(),
                    )}
                  >
                    <View className={cn('w-1.5 h-1.5 rounded-full', getStatusDotColor())} />
                    <Text className={cn('text-sm font-semibold', getStatusColor().split(' ')[0])}>
                      {getStatusLabel()}
                    </Text>
                  </View>
                </View>

                {expiresAt && (
                  <View className="mt-3">
                    <Label>{isRenewing ? 'Renews' : 'Expires'}</Label>
                    <Text variant="small" className="mt-2 text-gray-500">
                      {formatDate(expiresAt)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {status === 'expired' && (
          <View className="mt-2 bg-rose-500/20 rounded-md p-3 flex-row gap-2 items-center">
            <Icon name="error" size={20} color="#f43f5e" />
            <Text className="flex-1 text-sm text-rose-500 leading-[18px]">
              Your subscription has expired. Resubscribe to unlock Pro features.
            </Text>
          </View>
          // <View className='mt-1 bg-destructive rounded-md p-3 mx-4 flex-row gap-2 items-center'>
          //   <Icon name="error-outline" size={20} color='text-destructive-foreground' />
          //   <Text className='text-sm text-destructive-foreground'>Your subscription has expired. Resubscribe to unlock Pro features.</Text>
          // </View>
        )}

        {/* Grace / Expired warnings */}
        {status === 'grace_period' && (
          <View className="mt-2 bg-amber-500/20 rounded-md p-3 flex-row gap-2 items-center">
            <Icon name="warning" size={20} color="#f59e0b" />
            <Text className="flex-1 text-sm text-amber-500 leading-[18px]">
              Your subscription is in a grace period. Please update your payment method to continue.
            </Text>
          </View>
        )}
        {isPro ? (
          <Button variant="outline" size="xl" className="w-full" onPress={handleManageSubscription}>
            <Text className="text-[15px] font-semibold text-muted-foreground">
              Manage Subscription
            </Text>
            <Icon name="open-in-new" size={16} color="mutedForeground" />
          </Button>
        ) : (
          <Button size="xl" className="w-full" onPress={handleUpgrade}>
            <View>
              <Text>✨ Go Pro for unlimited access</Text>
            </View>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
