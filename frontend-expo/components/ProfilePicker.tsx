import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserSettings } from '@/contexts/user-settings-context';
import {
  useProviderProfiles,
  groupProfilesByCategory,
  ProfileCategory,
} from '@/hooks/use-provider-profiles';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

// Map profile categories to icons
const CATEGORY_ICONS: Record<ProfileCategory, keyof typeof MaterialIcons.glyphMap> = {
  [ProfileCategory.CYCLING]: 'directions-bike',
  [ProfileCategory.WALKING]: 'directions-walk',
  [ProfileCategory.DRIVING]: 'directions-car',
  [ProfileCategory.OTHER]: 'more-horiz',
};

interface ProfilePickerProps {
  visible: boolean;
  currentProfile: string | null;
  currentProvider: string | null;
  onClose: () => void;
}

export default function ProfilePicker({
  visible,
  currentProfile,
  currentProvider,
  onClose,
}: ProfilePickerProps) {
  const { updateSettings } = useUserSettings();
  const sheetRef = useRef<BaseSheetRef>(null);

  // Use the provider profiles hook
  const { profiles, defaultProfile, loading, error, refetch } =
    useProviderProfiles(currentProvider);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSelectProfile = async (profileId: string) => {
    const success = await updateSettings({ preferred_routing_profile: profileId });
    if (success) {
      onClose();
    } else {
      Alert.alert('Error', 'Failed to update profile preference');
    }
  };

  const handleDismiss = () => {
    onClose();
  };

  // Group profiles by category for better organization
  const groupedProfiles = groupProfilesByCategory(profiles);
  const categories = Object.values(ProfileCategory).filter(
    (cat) => groupedProfiles[cat].length > 0,
  );

  return (
    <BaseSheet
      ref={sheetRef}
      name="ProfilePickerSheet"
      detents={[0.5, 0.85]}
      onDismiss={handleDismiss}
      scrollable
      grabberVisible
    >
      {/* Header */}
      <View className="flex-row justify-between items-center p-4">
        <Text className="text-lg font-semibold">Routing Profile</Text>
        <Button variant="ghost" size="sm" onPress={onClose}>
          <Text className="text-base text-muted-foreground">Close</Text>
        </Button>
      </View>

      {/* Loading State */}
      {loading && (
        <View className="px-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="flex-row items-center gap-3 p-3 rounded-lg bg-muted/10">
              <Skeleton className="h-8 w-8 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
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
          <Button variant="outline" className="mt-4" onPress={refetch}>
            <Text>Retry</Text>
          </Button>
        </View>
      )}

      {/* Profile List */}
      {!loading && !error && (
        <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
          {categories.map((category) => (
            <View key={category} className="mb-4">
              {/* Category Header */}
              <Text className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                {category}
              </Text>

              {/* Profiles in Category */}
              {groupedProfiles[category].map((profile) => {
                const isSelected = profile.id === (currentProfile || defaultProfile);
                return (
                  <TouchableOpacity
                    key={profile.id}
                    className={cn(
                      'flex-row items-center gap-3 p-3 rounded-lg mb-2',
                      isSelected ? 'bg-primary/50' : 'bg-muted/10',
                    )}
                    onPress={() => handleSelectProfile(profile.id)}
                    activeOpacity={0.7}
                  >
                    <View className="w-8 items-center">
                      <Icon
                        name={CATEGORY_ICONS[category] || 'more-horiz'}
                        size={28}
                        color="foreground"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold">{profile.title}</Text>
                      {profile.description && (
                        <Text variant="small" className="text-muted-foreground">
                          {profile.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Icon name="check" size={24} color="primary" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </BaseSheet>
  );
}
