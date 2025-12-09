import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useClient } from 'react-supabase';
import { useUserSettings } from '@/contexts/user-settings-context';
import { useEnv } from '@/hooks/use-env';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

interface Provider {
  name: string;
  displayName: string;
  capabilities?: {
    profiles: string[];
    bikeTypes?: string[];
    multiModal: boolean;
    requiresPaidPlan: boolean;
  };
  available: boolean;
}

interface ProvidersResponse {
  providers: Provider[];
  defaultProvider: string;
}

interface ProviderPickerProps {
  visible: boolean;
  currentProvider: string | null;
  onClose: () => void;
}

export default function ProviderPicker({ visible, currentProvider, onClose }: ProviderPickerProps) {
  const supabase = useClient();
  const { updateSettings } = useUserSettings();
  const { ROUTING_SERVICE } = useEnv();
  const sheetRef = useRef<BaseSheetRef>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchProviders();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${ROUTING_SERVICE}/api/routing/providers`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.statusText}`);
      }

      const data: ProvidersResponse = await response.json();
      setProviders(data.providers);
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = async (providerName: string | null) => {
    const success = await updateSettings({ preferred_routing_provider: providerName });
    if (success) {
      onClose();
    } else {
      Alert.alert('Error', 'Failed to update provider preference');
    }
  };

  const handleDismiss = () => {
    onClose();
  };

  return (
    <BaseSheet
      ref={sheetRef}
      name="ProviderPickerSheet"
      detents={[0.35, 0.85]}
      onDismiss={handleDismiss}
      scrollable
      grabberVisible
    >
      {/* Header */}
      <View className="flex-row justify-between items-center p-4">
        <Text className="text-lg font-semibold">Routing Provider</Text>
        <Button variant="ghost" size="sm" onPress={onClose}>
          <Text className="text-base text-muted-foreground">Close</Text>
        </Button>
      </View>

      {/* Loading State */}
      {loading && (
        <View className="px-4 gap-3">
          {[1, 2, 3].map((i) => (
            <View key={i} className="flex-row items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Skeleton className="h-8 w-8 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Error State */}
      {error && (
        <View className="items-center py-10 px-4">
          <Icon name="error-outline" size={48} color="mutedForeground" />
          <Text className="mt-3 text-center text-muted-foreground">{error}</Text>
          <Button variant="outline" className="mt-4" onPress={fetchProviders}>
            <Text>Retry</Text>
          </Button>
        </View>
      )}

      {/* Provider List */}
      {!loading && !error && (
        <ScrollView className="px-4 pt-4" showsVerticalScrollIndicator={false}>
          {/* Auto option */}
          <TouchableOpacity
            className={cn(
              'flex-row items-center gap-3 p-3 rounded-lg mb-2',
              currentProvider === null ? 'bg-primary/50' : 'bg-muted/10',
            )}
            onPress={() => handleSelectProvider(null)}
            activeOpacity={0.7}
          >
            <View className="w-8 items-center">
              <Icon name="auto-awesome" size={28} color="foreground" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold">Auto</Text>
              <Text variant="small" className="text-muted-foreground">
                Select best available provider
              </Text>
            </View>
            {currentProvider === null && <Icon name="check" size={24} color="primary" />}
          </TouchableOpacity>

          {/* Provider options */}
          {providers.map((provider) => {
            const isSelected = provider.name === currentProvider;
            const requiresPaidPlan = provider.capabilities?.requiresPaidPlan ?? false;
            return (
              <TouchableOpacity
                key={provider.name}
                className={cn(
                  'flex-row items-center gap-3 p-3 rounded-lg mb-2',
                  isSelected ? 'bg-primary/50' : 'bg-muted/10',
                )}
                onPress={() => handleSelectProvider(provider.name)}
                activeOpacity={0.7}
              >
                <View className="w-8 items-center relative">
                  <Icon name="route" size={28} color="foreground" />
                  <View
                    className={cn(
                      'absolute -top-0.5 -right-2 w-2.5 h-2.5 rounded-full border-2 border-background',
                      provider.available ? 'bg-green-400' : 'bg-red-500',
                    )}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-semibold">{provider.displayName}</Text>
                    {requiresPaidPlan && (
                      <View className="bg-primary px-2 py-0.5 rounded">
                        <Text className="text-[10px] font-semibold text-primary-foreground">
                          Premium
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text variant="small" className="text-muted-foreground">
                    {provider.available ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
                {isSelected && <Icon name="check" size={24} color="primary" />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </BaseSheet>
  );
}
