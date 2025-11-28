import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useAuth } from './use-auth';
import { supabase } from '@/utils/supabase';
import type { Database } from '@/supabase/types';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

interface DevSettings {
  useDevUrls: boolean;
}

// Module-level state for dev settings (persists across hook instances)
let devSettingsState: DevSettings = {
  // useDevUrls: process.env.NODE_ENV === 'development',
  useDevUrls: false,
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
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const devSettings = useSyncExternalStore(subscribeToDevSettings, getDevSettingsSnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

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
            })
            .select()
            .single();

          if (insertError) throw insertError;
          setSettings(newSettings);
        } else {
          throw fetchError;
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateSettings = async (updates: UserSettingsUpdate): Promise<boolean> => {
    if (!user) {
      setError('Not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

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

      setSettings(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      console.error('Error updating settings:', err);
      return false;
    } finally {
      setLoading(false);
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
