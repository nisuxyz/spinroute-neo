import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { useClient } from 'react-supabase';
import { useAuth } from '@/hooks/use-auth';
import type { Database } from '@/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

// Subscription-related fields from profile
interface SubscriptionData {
  tier: Profile['subscription_tier'];
  status: Profile['subscription_status'];
  expiresAt: Date | null;
  purchaseUUID: string | null;
  productId: string | null;
  isTrial: boolean;
  isRenewing: boolean;
  isPro: boolean;
}

// Dev settings (local only, not persisted to DB)
interface DevSettings {
  useDevUrls: boolean;
}

// Per-provider profile preferences (stored locally, synced with current provider's profile in DB)
type ProviderProfilePreferences = Record<string, string>;

interface UserSettingsContextValue {
  // Profile data
  profile: Profile | null;
  // User settings
  settings: (UserSettings & DevSettings) | null;
  // Subscription convenience accessors
  subscription: SubscriptionData;
  // Loading states
  loading: boolean;
  settingsLoading: boolean;
  // Error state
  error: string | null;
  // Actions
  updateSettings: (updates: UserSettingsUpdate) => Promise<boolean>;
  updateDevSettings: (updates: Partial<DevSettings>) => void;
  refresh: () => Promise<void>;
  // Per-provider profile preferences
  getProfileForProvider: (provider: string) => string | null;
  setProfileForProvider: (provider: string, profileId: string) => Promise<boolean>;
}

const defaultSubscription: SubscriptionData = {
  tier: 'free',
  status: 'active',
  expiresAt: null,
  purchaseUUID: null,
  productId: null,
  isTrial: false,
  isRenewing: false,
  isPro: false,
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

interface UserSettingsProviderProps {
  children: ReactNode;
}

export function UserSettingsProvider({ children }: UserSettingsProviderProps) {
  const { user } = useAuth();
  const supabase = useClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [devSettings, setDevSettings] = useState<DevSettings>({
    useDevUrls: process.env.NODE_ENV === 'development',
  });
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-provider profile preferences (stored in memory, synced with DB for current provider)
  const [providerProfiles, setProviderProfiles] = useState<ProviderProfilePreferences>({});

  // Track if we've initialized provider profiles from settings
  const initializedProviderProfiles = useRef(false);

  // Helper to parse provider_profile_preferences from DB (handles Json type)
  const parseProviderProfilePreferences = useCallback(
    (prefs: unknown): ProviderProfilePreferences => {
      if (!prefs || typeof prefs !== 'object') return {};
      // Filter to only include string values (provider -> profileId mappings)
      const result: ProviderProfilePreferences = {};
      for (const [key, value] of Object.entries(prefs as Record<string, unknown>)) {
        if (typeof value === 'string') {
          result[key] = value;
        }
      }
      return result;
    },
    [],
  );

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('[UserSettings] Error fetching profile:', fetchError);
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('[UserSettings] Unexpected error fetching profile:', err);
    }
  }, [user, supabase]);

  // Fetch user settings
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setSettingsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // If no settings exist, create default settings
        if (fetchError.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from('user_settings')
            .insert({
              id: user.id,
              units: 'metric',
              start_recording_on_launch: false,
              map_style: 'mapbox://styles/mapbox/standard',
            })
            .select()
            .single();

          if (insertError) {
            console.error('[UserSettings] Error creating settings:', insertError);
            setError(insertError.message);
          } else {
            setSettings(newSettings);
          }
        } else {
          console.error('[UserSettings] Error fetching settings:', fetchError);
          setError(fetchError.message);
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('[UserSettings] Unexpected error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setSettingsLoading(false);
    }
  }, [user, supabase]);

  // Combined refresh function
  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchSettings()]);
    setLoading(false);
  }, [fetchProfile, fetchSettings]);

  // Initialize provider profiles from settings when settings are loaded
  useEffect(() => {
    if (settings && !initializedProviderProfiles.current) {
      // First, load from the new provider_profile_preferences JSON column
      const savedPrefs = parseProviderProfilePreferences(settings.provider_profile_preferences);

      // Merge with any legacy data from preferred_routing_provider/preferred_routing_profile
      // (for backward compatibility during migration)
      const provider = settings.preferred_routing_provider;
      const profile = settings.preferred_routing_profile;

      const mergedPrefs = { ...savedPrefs };
      if (provider && profile && !mergedPrefs[provider]) {
        mergedPrefs[provider] = profile;
      }

      setProviderProfiles(mergedPrefs);
      initializedProviderProfiles.current = true;
    }
  }, [settings, parseProviderProfilePreferences]);

  // Initial fetch
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setSettings(null);
      setLoading(false);
      setSettingsLoading(false);
      initializedProviderProfiles.current = false;
      setProviderProfiles({});
      return;
    }

    refresh();
  }, [user?.id]);

  // Realtime subscription for profiles table
  useEffect(() => {
    if (!user?.id) return;

    console.log('[UserSettings] Setting up realtime subscription for profiles');

    const channel = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as Profile;
          const oldProfile = payload.old as Partial<Profile>;

          console.log('[UserSettings] 🔄 Profile realtime update received:', {
            old_tier: oldProfile?.subscription_tier,
            new_tier: newProfile?.subscription_tier,
            old_status: oldProfile?.subscription_status,
            new_status: newProfile?.subscription_status,
            old_expires: oldProfile?.subscription_expires_at,
            new_expires: newProfile?.subscription_expires_at,
          });

          if (newProfile && newProfile.id) {
            setProfile(newProfile);
            console.log('[UserSettings] ✅ Profile state updated via realtime');
          } else {
            console.warn('[UserSettings] ⚠️ Received invalid profile payload, refetching...');
            fetchProfile();
          }
        },
      )
      .subscribe((status, err) => {
        console.log('[UserSettings] Profile channel status:', status);
        if (err) {
          console.error('[UserSettings] Profile channel error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('[UserSettings] ✅ Profile realtime subscription active');
        }
      });

    return () => {
      console.log('[UserSettings] Cleaning up profile realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, fetchProfile]);

  // Realtime subscription for user_settings table
  useEffect(() => {
    if (!user?.id) return;

    console.log('[UserSettings] Setting up realtime subscription for user_settings');

    const channel = supabase
      .channel(`user-settings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_settings',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[UserSettings] 🔄 Settings realtime update:', payload.eventType);
          if (payload.eventType === 'DELETE') {
            setSettings(null);
          } else {
            const newSettings = payload.new as UserSettings;
            if (newSettings && newSettings.id) {
              setSettings(newSettings);

              // Update provider profiles cache from the JSON column
              const savedPrefs = parseProviderProfilePreferences(
                newSettings.provider_profile_preferences,
              );
              setProviderProfiles((prev) => ({
                ...prev,
                ...savedPrefs,
              }));

              console.log('[UserSettings] ✅ Settings state updated via realtime');
            } else {
              console.warn('[UserSettings] ⚠️ Received invalid settings payload, refetching...');
              fetchSettings();
            }
          }
        },
      )
      .subscribe((status, err) => {
        console.log('[UserSettings] Settings channel status:', status);
        if (err) {
          console.error('[UserSettings] Settings channel error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('[UserSettings] ✅ Settings realtime subscription active');
        }
      });

    return () => {
      console.log('[UserSettings] Cleaning up settings realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, fetchSettings]);

  // Update settings function
  const updateSettings = useCallback(
    async (updates: UserSettingsUpdate): Promise<boolean> => {
      if (!user) {
        setError('Not authenticated');
        return false;
      }

      // Optimistic update
      if (settings) {
        setSettings({ ...settings, ...updates });
      }

      try {
        const { data, error: updateError } = await supabase
          .from('user_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (updateError) {
          console.error('[UserSettings] Error updating settings:', updateError);
          setError(updateError.message);
          // Revert optimistic update
          await fetchSettings();
          return false;
        }

        // Note: Realtime will also update, but this ensures immediate consistency
        setSettings(data);

        // Update provider profiles cache from the JSON column
        const savedPrefs = parseProviderProfilePreferences(data.provider_profile_preferences);
        setProviderProfiles((prev) => ({
          ...prev,
          ...savedPrefs,
        }));

        return true;
      } catch (err) {
        console.error('[UserSettings] Unexpected error updating settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to update settings');
        await fetchSettings();
        return false;
      }
    },
    [user, settings, supabase, fetchSettings],
  );

  // Update dev settings (local only)
  const updateDevSettings = useCallback((updates: Partial<DevSettings>) => {
    setDevSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // Get the stored profile for a specific provider
  const getProfileForProvider = useCallback(
    (provider: string): string | null => {
      return providerProfiles[provider] || null;
    },
    [providerProfiles],
  );

  // Set the profile for a specific provider and persist to DB
  const setProfileForProvider = useCallback(
    async (provider: string, profileId: string): Promise<boolean> => {
      // Update local cache immediately
      const newProviderProfiles = {
        ...providerProfiles,
        [provider]: profileId,
      };
      setProviderProfiles(newProviderProfiles);

      // Build the updates object
      const updates: UserSettingsUpdate = {
        // Update the JSON column with all provider preferences
        provider_profile_preferences: newProviderProfiles,
      };

      // Also update the legacy columns if this is the current provider
      // (for backward compatibility)
      if (settings?.preferred_routing_provider === provider) {
        updates.preferred_routing_profile = profileId;
      }

      return updateSettings(updates);
    },
    [providerProfiles, settings?.preferred_routing_provider, updateSettings],
  );

  // Compute subscription data from profile
  const subscription: SubscriptionData = profile
    ? {
        tier: profile.subscription_tier,
        status: profile.subscription_status,
        expiresAt: profile.subscription_expires_at
          ? new Date(profile.subscription_expires_at)
          : null,
        purchaseUUID: profile.purchase_uuid,
        productId: profile.product_id,
        isTrial: profile.is_trial,
        isRenewing: profile.is_renewing,
        isPro:
          profile.subscription_tier === 'pro' &&
          (profile.subscription_status === 'active' ||
            profile.subscription_status === 'grace_period') &&
          (!profile.subscription_expires_at ||
            new Date(profile.subscription_expires_at) > new Date()),
      }
    : defaultSubscription;

  const value: UserSettingsContextValue = {
    profile,
    settings: settings ? { ...settings, ...devSettings } : null,
    subscription,
    loading,
    settingsLoading,
    error,
    updateSettings,
    updateDevSettings,
    refresh,
    getProfileForProvider,
    setProfileForProvider,
  };

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettingsContext() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettingsContext must be used within a UserSettingsProvider');
  }
  return context;
}

// Convenience hooks for specific data
export function useSubscription() {
  const { subscription, loading, refresh } = useUserSettingsContext();
  return {
    ...subscription,
    loading,
    refresh,
  };
}

export function useUserSettings() {
  const {
    settings,
    settingsLoading,
    error,
    updateSettings,
    updateDevSettings,
    refresh,
    getProfileForProvider,
    setProfileForProvider,
  } = useUserSettingsContext();
  return {
    settings,
    loading: settingsLoading,
    error,
    updateSettings,
    updateDevSettings,
    refetch: refresh,
    getProfileForProvider,
    setProfileForProvider,
  };
}
