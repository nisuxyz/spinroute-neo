import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Colors, Spacing, Typography, BorderRadius, InputStyles } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const HEADER_HEIGHT = 60;

const getIsLiquidGlassAvailable = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  return isLiquidGlassAvailable();
};

const getBlurTint = (): 'system-material' | undefined => {
  const hasLiquidGlass = getIsLiquidGlassAvailable();
  return hasLiquidGlass ? undefined : 'system-material';
};

interface FancySheetProps {
  onSearch?: (query: string) => void;
}

export interface FancySheetRef {
  present: (index?: number) => Promise<void>;
  dismiss: () => Promise<void>;
}

const FancySheet = forwardRef<FancySheetRef, FancySheetProps>(({ onSearch }, ref) => {
  const sheetRef = useRef<TrueSheet>(null);
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = React.useState('');

  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const calloutBg = useThemeColor({}, 'calloutBackground');
  const secondaryTextColor = useThemeColor({}, 'calloutTextSecondary');

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
  React.useEffect(() => {
    sheetRef.current?.present(0);
  }, []);

  const handleSearch = () => {
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

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
              onSubmitEditing={handleSearch}
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
          <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Searches</Text>

          {/* Placeholder for recent searches */}
          <View style={styles.emptyState}>
            <MaterialIcons name="location-on" size={48} color={iconColor} />
            <Text style={[styles.emptyStateText, { color: secondaryTextColor }]}>
              Search for places, addresses, or stations
            </Text>
          </View>
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
    // flex: 1,
    // justifyContent: 'center'
    // paddingHorizontal: Spacing.xl,
    // paddingTop: Spacing.md,
    // paddingBottom: Spacing.lg,
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  searchInputContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    // borderWidth: 2,
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
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.lg,
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
