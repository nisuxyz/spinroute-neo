import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  useColorScheme,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  Text,
  ActivityIndicator,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useDebounce } from 'use-debounce';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;

interface SearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation?: (location: GeocodingResult) => void;
}

interface SearchSuggestion {
  name: string;
  mapbox_id: string;
  feature_type: string;
  full_address?: string;
  place_formatted?: string;
  maki?: string;
}

interface GeocodingResult {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  mapbox_id: string;
}

const SearchSheet: React.FC<SearchSheetProps> = ({ visible, onClose, onSelectLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  // Generate a new session token when the sheet opens
  useEffect(() => {
    if (visible) {
      setSessionToken(generateUUID());
    }
  }, [visible]);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
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
  }, [debouncedQuery, sessionToken]);

  const handleClose = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSuggestions([]);
    onClose();
  };

  const handleSelectSuggestion = async (suggestion: SearchSuggestion) => {
    try {
      const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
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

        // Notify parent and close sheet
        onSelectLocation?.(result);
        handleClose();
      }
    } catch (error) {
      console.error('Retrieve error:', error);
    }
  };

  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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

  const GlassContainer = hasGlassEffect ? GlassView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheetContainer, { height: SHEET_HEIGHT }]}>
              <GlassContainer
                style={[
                  styles.glassSheet,
                  !hasGlassEffect && { backgroundColor: colors.buttonBackground },
                ]}
                {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
              >
                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <MaterialIcons name="search" size={24} color={colors.text} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search for places..."
                    placeholderTextColor={colors.text + '80'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <MaterialIcons name="close" size={20} color={colors.text} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Results List */}
                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.text} />
                  </View>
                )}

                {!loading && suggestions.length > 0 && (
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.mapbox_id}
                    style={styles.resultsList}
                    contentContainerStyle={styles.resultsContent}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.resultItem}
                        onPress={() => handleSelectSuggestion(item)}
                      >
                        <MaterialIcons
                          name={getIconForFeatureType(item.feature_type)}
                          size={20}
                          color={colors.text}
                          style={styles.resultIcon}
                        />
                        <View style={styles.resultTextContainer}>
                          <Text style={[styles.resultName, { color: colors.text }]}>
                            {item.name}
                          </Text>
                          <Text
                            style={[styles.resultDetails, { color: colors.text + 'CC' }]}
                            numberOfLines={1}
                          >
                            {item.full_address || item.place_formatted || ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                )}

                {!loading && searchQuery.length >= 2 && suggestions.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="search-off" size={48} color={colors.text + '60'} />
                    <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
                      No results found
                    </Text>
                  </View>
                )}

                {/* Close button */}
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <MaterialIcons name="keyboard-arrow-down" size={32} color={colors.text} />
                </TouchableOpacity>
              </GlassContainer>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  glassSheet: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resultsList: {
    marginTop: 16,
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultDetails: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});

export default SearchSheet;
