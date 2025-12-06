import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Colors, Spacing, Typography, BorderRadius, InputStyles } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useDebounce } from 'use-debounce';
import { useEnv } from '@/hooks/use-env';
import { useSearchHistory, type SearchHistoryItem } from '@/hooks/use-search-history';
import { fuzzySearch } from '@/utils/fuzzy-search';

const HEADER_HEIGHT = 60;

const getIsLiquidGlassAvailable = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  return isLiquidGlassAvailable();
};

const getBlurTint = (): 'system-material' | undefined => {
  const hasLiquidGlass = getIsLiquidGlassAvailable();
  return hasLiquidGlass ? undefined : 'system-material';
};

interface SearchSuggestion {
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

type CombinedResult =
  | { type: 'history'; data: SearchHistoryItem }
  | { type: 'suggestion'; data: SearchSuggestion };

interface FancySheetProps {
  onSelectLocation?: (location: GeocodingResult) => void;
}

export interface FancySheetRef {
  present: (index?: number) => Promise<void>;
  dismiss: () => Promise<void>;
}

const FancySheet = forwardRef<FancySheetRef, FancySheetProps>(({ onSelectLocation }, ref) => {
  const sheetRef = useRef<TrueSheet>(null);
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);

  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const calloutBg = useThemeColor({}, 'calloutBackground');
  const secondaryTextColor = useThemeColor({}, 'calloutTextSecondary');

  const env = useEnv();
  const { history, addToHistory, removeFromHistory } = useSearchHistory();

  const blurTint = getBlurTint();
  const inputBgColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  const { height } = useWindowDimensions();

  useImperativeHandle(ref, () => ({
    present: async (index = 0) => {
      await sheetRef.current?.present(index);
    },
    dismiss: async () => {
      await sheetRef.current?.dismiss();
    },
  }));

  // Present sheet on mount (collapsed state)
  useEffect(() => {
    sheetRef.current?.present(0);
  }, []);

  // Generate a new session token when the sheet opens
  useEffect(() => {
    setSessionToken(generateUUID());
  }, []);

  // Fetch suggestions from Mapbox
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
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
          `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(debouncedQuery)}&language=en&limit=10&session_token=${sessionToken}&access_token=${accessToken}`,
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
  }, [debouncedQuery, sessionToken, env.MAPBOX_ACCESS_TOKEN]);

  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleSelectSuggestion = async (suggestion: SearchSuggestion) => {
    try {
      const accessToken = env.MAPBOX_ACCESS_TOKEN;
      if (!accessToken) return;

      // Retrieve full details including coordinates
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

        // Notify parent
        onSelectLocation?.(result);

        // Collapse sheet and clear search
        setSearchQuery('');
        setSuggestions([]);
        Keyboard.dismiss();
        await sheetRef.current?.present(0);
      }
    } catch (error) {
      console.error('Retrieve error:', error);
    }
  };

  const handleSelectHistory = async (item: SearchHistoryItem) => {
    const result: GeocodingResult = {
      name: item.name,
      display_name: item.display_name,
      lon: item.lon,
      lat: item.lat,
      type: item.type,
      mapbox_id: item.mapbox_id,
    };

    // Update timestamp by re-adding to history
    await addToHistory(result);

    // Notify parent
    onSelectLocation?.(result);

    // Collapse sheet and clear search
    setSearchQuery('');
    setSuggestions([]);
    Keyboard.dismiss();
    await sheetRef.current?.present(0);
  };

  const getIconForFeatureType = (type: string): any => {
    switch (type) {
      case 'poi':
        return 'place';
      case 'address':
        return 'home';
      case 'place':
      case 'city':
      case 'locality':
        return 'location-city';
      case 'neighborhood':
        return 'location-on';
      case 'street':
        return 'route';
      case 'postcode':
        return 'markunread-mailbox';
      case 'region':
      case 'district':
        return 'map';
      case 'country':
        return 'public';
      default:
        return 'place';
    }
  };

  // Combine history and suggestions based on search query
  const combinedResults = useMemo((): CombinedResult[] => {
    const results: CombinedResult[] = [];

    if (debouncedQuery.trim().length < 2) {
      // Show recent history when no search query
      return history.slice(0, 10).map((item) => ({ type: 'history', data: item }));
    }

    // Fuzzy search through history
    const historyMatches = fuzzySearch(
      debouncedQuery,
      history,
      (item) => `${item.name} ${item.display_name}`,
    );

    // Add top 3 history matches at the beginning
    historyMatches.slice(0, 3).forEach((match) => {
      results.push({ type: 'history', data: match.item });
    });

    // Add API suggestions
    suggestions.forEach((suggestion) => {
      results.push({ type: 'suggestion', data: suggestion });
    });

    return results;
  }, [debouncedQuery, history, suggestions]);

  const renderItem = useCallback(
    ({ item }: { item: CombinedResult }) => {
      const isHistory = item.type === 'history';
      const data = item.data;

      const handlePress = () => {
        if (isHistory) {
          handleSelectHistory(data as SearchHistoryItem);
        } else {
          handleSelectSuggestion(data as SearchSuggestion);
        }
      };

      const handleRemove = (e: any) => {
        e.stopPropagation();
        if (isHistory) {
          removeFromHistory((data as SearchHistoryItem).mapbox_id);
        }
      };

      const icon = isHistory
        ? 'history'
        : getIconForFeatureType((data as any).feature_type || (data as any).type);
      const name = data.name;
      const details = isHistory
        ? (data as SearchHistoryItem).display_name
        : (data as SearchSuggestion).full_address ||
          (data as SearchSuggestion).place_formatted ||
          '';

      return (
        <TouchableOpacity style={styles.resultItem} onPress={handlePress}>
          <MaterialIcons name={icon} size={20} color={textColor} style={styles.resultIcon} />
          <View style={styles.resultTextContainer}>
            <Text style={[styles.resultName, { color: textColor }]}>{name}</Text>
            {details && (
              <Text style={[styles.resultDetails, { color: secondaryTextColor }]} numberOfLines={1}>
                {details}
              </Text>
            )}
          </View>
          {isHistory && (
            <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
              <MaterialIcons name="close" size={18} color={iconColor} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [
      textColor,
      secondaryTextColor,
      iconColor,
      handleSelectSuggestion,
      handleSelectHistory,
      removeFromHistory,
      getIconForFeatureType,
    ],
  );

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[72 / height, 0.5, 1]}
      initialDetentIndex={0}
      dimmedDetentIndex={2}
      dismissible={false}
      edgeToEdgeFullScreen
      // blurTint={blurTint}
      cornerRadius={36}
      grabber={true}
      keyboardMode="pan"
    >
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.searchHeader}>
          <View style={[styles.searchInputContainer, { backgroundColor: inputBgColor }]}>
            <MaterialIcons name="search" size={20} color={iconColor} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search for a place or address"
              placeholderTextColor={iconColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialIcons name="cancel" size={18} color={iconColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {loading && searchQuery.length >= 2 && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={textColor} />
            </View>
          )}

          {combinedResults.length > 0 && (
            <FlatList
              data={combinedResults}
              keyExtractor={(item: CombinedResult) => `${item.type}-${item.data.mapbox_id}`}
              contentContainerStyle={styles.resultsContent}
              keyboardShouldPersistTaps="handled"
              renderItem={renderItem}
              ListHeaderComponent={
                searchQuery.length < 2 && history.length > 0 ? (
                  <Text style={[styles.sectionTitle, { color: secondaryTextColor }]}>
                    Recent Searches
                  </Text>
                ) : null
              }
            />
          )}

          {!loading && searchQuery.length >= 2 && combinedResults.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={48} color={iconColor} />
              <Text style={[styles.emptyStateText, { color: secondaryTextColor }]}>
                No results found
              </Text>
            </View>
          )}

          {!loading && searchQuery.length < 2 && history.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="location-on" size={48} color={iconColor} />
              <Text style={[styles.emptyStateText, { color: secondaryTextColor }]}>
                Search for places, addresses, or stations
              </Text>
            </View>
          )}
        </View>
      </View>
    </TrueSheet>
  );
});

FancySheet.displayName = 'FancySheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 14,
  },
  searchHeader: {
    paddingBottom: Spacing.md,
  },
  searchInputContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMedium,
    fontSize: 16,
    height: 44,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  resultsContent: {
    paddingBottom: Spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    marginBottom: Spacing.sm,
  },
  resultIcon: {
    marginRight: Spacing.md,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultDetails: {
    ...Typography.bodySmall,
  },
  removeButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyStateText: {
    ...Typography.bodyMedium,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});

export default FancySheet;
