import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
  useColorScheme,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;

interface BikeManagementSheetProps {
  visible: boolean;
  onClose: () => void;
}

const BikeManagementSheet: React.FC<BikeManagementSheetProps> = ({ visible, onClose }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const GlassContainer = hasGlassEffect ? GlassView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
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
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.text }]}>Bike Management</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <MaterialIcons name="close" size={28} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.content}>
                  <Text style={[styles.placeholder, { color: colors.text + '80' }]}>
                    Bike management content coming soon
                  </Text>
                </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default BikeManagementSheet;
