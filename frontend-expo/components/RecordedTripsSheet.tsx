import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, useColorScheme, Text } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  TouchableOpacity,
} from '@gorhom/bottom-sheet';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import TripList from './TripList';

interface RecordedTripsSheetProps {
  visible: boolean;
  onClose: () => void;
}

const RecordedTripsSheet: React.FC<RecordedTripsSheetProps> = ({ visible, onClose }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const GlassContainer = hasGlassEffect ? GlassView : View;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onChange={handleSheetChanges}
      onDismiss={handleDismiss}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.sheetBackground,
        hasGlassEffect
          ? { backgroundColor: 'transparent' }
          : { backgroundColor: colors.buttonBackground },
      ]}
      handleIndicatorStyle={{ backgroundColor: colors.text + '40' }}
    >
      <GlassContainer
        style={styles.glassSheet}
        {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Recorded Trips</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <BottomSheetView style={styles.content}>
          <TripList onTripPress={(tripId) => console.log('Trip pressed:', tripId)} />
        </BottomSheetView>
      </GlassContainer>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  glassSheet: {
    flex: 1,
    padding: 20,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
  },
});

export default RecordedTripsSheet;
