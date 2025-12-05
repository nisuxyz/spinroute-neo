import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './use-auth';
import { useEnv } from './use-env';

/**
 * Profile category for grouping related profiles in the UI
 */
export enum ProfileCategory {
  CYCLING = 'cycling',
  WALKING = 'walking',
  DRIVING = 'driving',
  OTHER = 'other',
}

/**
 * Metadata for a provider-specific routing profile
 * Matches the backend ProfileMetadata interface
 */
export interface ProfileMetadata {
  /** Provider-specific profile identifier (e.g., "cycling-road") */
  id: string;
  /** Human-readable display title (e.g., "Road Cycling") */
  title: string;
  /** Icon identifier for UI (e.g., "directions-bike") */
  icon: string;
  /** Grouping category for UI organization */
  category: ProfileCategory;
  /** Optional detailed description */
  description?: string;
}

interface ProviderProfilesResponse {
  provider: string;
  profiles: ProfileMetadata[];
  defaultProfile: string;
}

interface UseProviderProfilesResult {
  /** Array of profiles for the current provider */
  profiles: ProfileMetadata[];
  /** Default profile ID for the current provider */
  defaultProfile: string | null;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch profiles for the current provider */
  refetch: () => Promise<void>;
}

// Cache for provider profiles to avoid redundant API calls
const profilesCache = new Map<string, ProviderProfilesResponse>();

/**
 * Hook to fetch and cache routing profiles for a specific provider
 *
 * @param provider - The provider name (e.g., "mapbox", "openrouteservice")
 * @returns Object containing profiles, defaultProfile, loading, error, and refetch function
 *
 * @example
 * ```tsx
 * const { profiles, defaultProfile, loading, error } = useProviderProfiles('openrouteservice');
 *
 * if (loading) return <ActivityIndicator />;
 * if (error) return <Text>Error: {error}</Text>;
 *
 * return (
 *   <View>
 *     {profiles.map(profile => (
 *       <Text key={profile.id}>{profile.title}</Text>
 *     ))}
 *   </View>
 * );
 * ```
 */
export const useProviderProfiles = (provider: string | null): UseProviderProfilesResult => {
  const [profiles, setProfiles] = useState<ProfileMetadata[]>([]);
  const [defaultProfile, setDefaultProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const env = useEnv();

  // Track the current provider to handle race conditions
  const currentProviderRef = useRef<string | null>(null);

  const fetchProfiles = useCallback(
    async (forceRefresh = false) => {
      if (!provider) {
        setProfiles([]);
        setDefaultProfile(null);
        setError(null);
        return;
      }

      if (!session?.access_token) {
        setError('Authentication required');
        return;
      }

      // Check cache first (unless force refresh)
      if (!forceRefresh && profilesCache.has(provider)) {
        const cached = profilesCache.get(provider)!;
        setProfiles(cached.profiles);
        setDefaultProfile(cached.defaultProfile);
        setError(null);
        return;
      }

      const routingServiceUrl = env.ROUTING_SERVICE || env.SUPABASE;
      if (!routingServiceUrl) {
        setError('Routing service URL not configured');
        return;
      }

      // Update current provider ref
      currentProviderRef.current = provider;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${routingServiceUrl}/api/routing/providers/${encodeURIComponent(provider)}/profiles`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        // Check if provider changed during fetch (race condition)
        if (currentProviderRef.current !== provider) {
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 404) {
            throw new Error(`Provider '${provider}' not found`);
          }

          throw new Error(errorData.message || `Failed to fetch profiles: ${response.statusText}`);
        }

        const data: ProviderProfilesResponse = await response.json();

        // TEMP DEBUG: Log received profiles
        console.log('[useProviderProfiles] Received profiles for', provider, ':', {
          profileCount: data.profiles.length,
          profiles: data.profiles.map((p) => ({ id: p.id, title: p.title, category: p.category })),
          defaultProfile: data.defaultProfile,
        });

        // Cache the response
        profilesCache.set(provider, data);

        // Update state
        setProfiles(data.profiles);
        setDefaultProfile(data.defaultProfile);
        setError(null);
      } catch (err) {
        // Check if provider changed during fetch (race condition)
        if (currentProviderRef.current !== provider) {
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch provider profiles';
        setError(errorMessage);
        setProfiles([]);
        setDefaultProfile(null);
        console.error('Error fetching provider profiles:', err);
      } finally {
        // Only update loading if this is still the current provider
        if (currentProviderRef.current === provider) {
          setLoading(false);
        }
      }
    },
    [provider, session?.access_token, env.ROUTING_SERVICE, env.SUPABASE],
  );

  // Fetch profiles when provider changes
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const refetch = useCallback(async () => {
    await fetchProfiles(true);
  }, [fetchProfiles]);

  return {
    profiles,
    defaultProfile,
    loading,
    error,
    refetch,
  };
};

/**
 * Clear the profiles cache for a specific provider or all providers
 * Useful when you know the backend data has changed
 *
 * @param provider - Optional provider name. If not provided, clears entire cache.
 */
export const clearProfilesCache = (provider?: string): void => {
  if (provider) {
    profilesCache.delete(provider);
  } else {
    profilesCache.clear();
  }
};

/**
 * Get profiles grouped by category
 * Useful for rendering profiles in a categorized list
 *
 * @param profiles - Array of profile metadata
 * @returns Object with category keys and arrays of profiles
 */
export const groupProfilesByCategory = (
  profiles: ProfileMetadata[],
): Record<ProfileCategory, ProfileMetadata[]> => {
  const grouped: Record<ProfileCategory, ProfileMetadata[]> = {
    [ProfileCategory.CYCLING]: [],
    [ProfileCategory.WALKING]: [],
    [ProfileCategory.DRIVING]: [],
    [ProfileCategory.OTHER]: [],
  };

  for (const profile of profiles) {
    const category = profile.category || ProfileCategory.OTHER;
    if (grouped[category]) {
      grouped[category].push(profile);
    } else {
      grouped[ProfileCategory.OTHER].push(profile);
    }
  }

  return grouped;
};

// Export types for use in components
export type { ProviderProfilesResponse, UseProviderProfilesResult };
