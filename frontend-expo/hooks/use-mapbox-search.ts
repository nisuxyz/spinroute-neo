import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { useEnv } from '@/hooks/use-env';
import { useSearchHistory, type SearchHistoryItem } from '@/hooks/use-search-history';
import { fuzzySearch } from '@/utils/fuzzy-search';

export interface SearchSuggestion {
  name: string;
  mapbox_id: string;
  feature_type: string;
  full_address?: string;
  place_formatted?: string;
  maki?: string;
}

export interface GeocodingResult {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  mapbox_id: string;
}

export type CombinedResult =
  | { type: 'history'; data: SearchHistoryItem }
  | { type: 'suggestion'; data: SearchSuggestion };

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface UseMapboxSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxHistoryResults?: number;
  maxHistoryMatches?: number;
  suggestionLimit?: number;
}

interface UseMapboxSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loading: boolean;
  combinedResults: CombinedResult[];
  history: SearchHistoryItem[];
  selectItem: (item: CombinedResult) => Promise<GeocodingResult | null>;
  removeFromHistory: (mapboxId: string) => void;
  clearSearch: () => void;
}

export function useMapboxSearch(options: UseMapboxSearchOptions = {}): UseMapboxSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    maxHistoryResults = 10,
    maxHistoryMatches = 3,
    suggestionLimit = 10,
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, debounceMs);

  const env = useEnv();
  const { history, addToHistory, removeFromHistory } = useSearchHistory();

  // Generate a new session token on mount
  useEffect(() => {
    setSessionToken(generateUUID());
  }, []);

  // Fetch suggestions from Mapbox
  useEffect(() => {
    if (debouncedQuery.trim().length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const accessToken = env.MAPBOX_ACCESS_TOKEN;
        if (!accessToken) {
          console.warn('Mapbox access token not configured');
          return;
        }

        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(debouncedQuery)}&language=en&limit=${suggestionLimit}&session_token=${sessionToken}&access_token=${accessToken}`,
        );

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, sessionToken, env.MAPBOX_ACCESS_TOKEN, minQueryLength, suggestionLimit]);

  // Combine history and suggestions based on search query
  const combinedResults = useMemo((): CombinedResult[] => {
    const results: CombinedResult[] = [];

    if (debouncedQuery.trim().length < minQueryLength) {
      // Show recent history when no search query
      return history.slice(0, maxHistoryResults).map((item) => ({ type: 'history', data: item }));
    }

    // Fuzzy search through history
    const historyMatches = fuzzySearch(
      debouncedQuery,
      history,
      (item) => `${item.name} ${item.display_name}`,
    );

    // Add top history matches at the beginning
    historyMatches.slice(0, maxHistoryMatches).forEach((match) => {
      results.push({ type: 'history', data: match.item });
    });

    // Add API suggestions
    suggestions.forEach((suggestion) => {
      results.push({ type: 'suggestion', data: suggestion });
    });

    return results;
  }, [debouncedQuery, history, suggestions, minQueryLength, maxHistoryResults, maxHistoryMatches]);

  const selectItem = useCallback(
    async (item: CombinedResult): Promise<GeocodingResult | null> => {
      const isHistory = item.type === 'history';

      if (isHistory) {
        // For history items, we already have coordinates
        const historyItem = item.data as SearchHistoryItem;
        return {
          name: historyItem.name,
          display_name: historyItem.display_name,
          lon: historyItem.lon,
          lat: historyItem.lat,
          type: historyItem.type,
          mapbox_id: historyItem.mapbox_id,
        };
      }

      // For suggestions, retrieve full details
      const suggestion = item.data as SearchSuggestion;
      try {
        const accessToken = env.MAPBOX_ACCESS_TOKEN;
        if (!accessToken) return null;

        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?session_token=${sessionToken}&access_token=${accessToken}`,
        );

        if (!response.ok) {
          throw new Error('Retrieve request failed');
        }

        const data = await response.json();
        const feature = data.features?.[0];

        if (feature?.geometry?.coordinates) {
          const result: GeocodingResult = {
            name: suggestion.name,
            display_name: suggestion.full_address || suggestion.place_formatted || suggestion.name,
            lon: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
            type: suggestion.feature_type,
            mapbox_id: suggestion.mapbox_id,
          };

          // Add to history
          await addToHistory(result);

          return result;
        }
      } catch (error) {
        console.error('Retrieve error:', error);
      }

      return null;
    },
    [addToHistory, env.MAPBOX_ACCESS_TOKEN, sessionToken],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    loading,
    combinedResults,
    history,
    selectItem,
    removeFromHistory,
    clearSearch,
  };
}
