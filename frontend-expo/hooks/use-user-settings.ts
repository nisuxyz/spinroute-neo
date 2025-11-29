import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { useAuth } from './use-auth';
import { supabase } from '@/utils/supabase';
import type { Database } from '@/supabase/types';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

interface DevSettings {
  useDevUrls: boolean;
}

interface SettingsState {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
}

// Module-level state for user settings (persists across hook instances)
let settingsState: SettingsState = {
  settings: null,
  loading: false,
  error: null,
};

const settingsListeners = new Set<() => void>();

function subscribeToSettings(callback: () => void) {
  settingsListeners.add(callback);
  return () => settingsListeners.delete(callback);
}

function getSettingsSnapshot() {
  return settingsState;
}

function updateSettingsState(updates: Partial<SettingsState>) {
  settingsState = { ...settingsState, ...updates };
  settingsListeners.forEach((listener) => listener());
}

// Module-level state for dev settings (persists across hook instances)
let devSettingsState: DevSettings = {
  useDevUrls: process.env.NODE_ENV === 'development',
};

const devSettingsListeners = new Set<() => void>();

function subscribeToDevSettings(callback: () => void) {
  devSettingsListeners.add(callback);
  return () => devSettingsListeners.delete(callback);
}

function getDevSettingsSnapshot() {
  return devSettingsState;
}

function updateDevSettingsState(updates: Partial<DevSettings>) {
  devSettingsState = { ...devSettingsState, ...updates };
  devSettingsListeners.forEach((listener) => listener());
}

export function useUserSettings() {
  const { user } = useAuth();
  const { settings, loading, error } = useSyncExternalStore(
    subscribeToSettings,
    getSettingsSnapshot,
  );
  const devSettings = useSyncExternalStore(subscribeToDevSettings, getDevSettingsSnapshot);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      updateSettingsState({ settings: null, loading: false, error: null });
      return;
    }

    // Only fetch if we don't have settings yet or if explicitly requested
    if (settingsState.settings && settingsState.settings.id === user.id) {
      return;
    }

    updateSettingsState({ loading: true, error: null });

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

          if (insertError) throw insertError;
          updateSettingsState({ settings: newSettings, loading: false });
        } else {
          throw fetchError;
        }
      } else {
        updateSettingsState({ settings: data, loading: false });
      }
    } catch (err) {
      updateSettingsState({
        error: err instanceof Error ? err.message : 'Failed to fetch settings',
        loading: false,
      });
      console.error('Error fetching settings:', err);
    }
  }, [user]);

  const updateSettings = async (updates: UserSettingsUpdate): Promise<boolean> => {
    if (!user) {
      updateSettingsState({ error: 'Not authenticated' });
      return false;
    }

    // Optimistic update - don't set loading state to avoid UI flicker
    updateSettingsState({ error: null });

    // Apply optimistic update immediately
    if (settings) {
      updateSettingsState({ settings: { ...settings, ...updates } });
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

      if (updateError) throw updateError;

      // Update with server response
      updateSettingsState({ settings: data });
      return true;
    } catch (err) {
      updateSettingsState({
        error: err instanceof Error ? err.message : 'Failed to update settings',
      });
      console.error('Error updating settings:', err);
      // Revert optimistic update on error
      await fetchSettings();
      return false;
    }
  };

  const updateDevSettings = (updates: Partial<DevSettings>) => {
    updateDevSettingsState(updates);
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings: settings ? { ...settings, ...devSettings } : null,
    loading,
    error,
    updateSettings,
    updateDevSettings,
    refetch: fetchSettings,
  };
}
