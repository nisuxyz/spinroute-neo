import React, { useState } from 'react';
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
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;

interface SearchSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SearchSheet: React.FC<SearchSheetProps> = ({ visible, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const handleClose = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    onClose();
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
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchSheet;
