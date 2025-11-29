import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@spinroute_search_history';
const MAX_HISTORY_ITEMS = 100;

export interface SearchHistoryItem {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  mapbox_id: string;
  timestamp: number;
}

export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load history from storage
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = useCallback(async (item: Omit<SearchHistoryItem, 'timestamp'>) => {
    try {
      const newItem: SearchHistoryItem = {
        ...item,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        // Remove duplicate if exists (by mapbox_id)
        const filtered = prev.filter((h) => h.mapbox_id !== item.mapbox_id);

        // Add new item at the beginning
        const updated = [newItem, ...filtered];

        // Keep only the most recent MAX_HISTORY_ITEMS
        const trimmed = updated.slice(0, MAX_HISTORY_ITEMS);

        // Save to storage
        AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmed)).catch((error) =>
          console.error('Failed to save search history:', error),
        );

        return trimmed;
      });
    } catch (error) {
      console.error('Failed to add to search history:', error);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }, []);

  const removeFromHistory = useCallback(async (mapbox_id: string) => {
    try {
      setHistory((prev) => {
        const updated = prev.filter((h) => h.mapbox_id !== mapbox_id);
        AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated)).catch((error) =>
          console.error('Failed to save search history:', error),
        );
        return updated;
      });
    } catch (error) {
      console.error('Failed to remove from search history:', error);
    }
  }, []);

  return {
    history,
    loading,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
};
