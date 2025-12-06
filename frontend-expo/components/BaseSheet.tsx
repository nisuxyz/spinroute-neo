import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, useColorScheme, StyleSheet, View } from 'react-native';
import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Colors, BorderRadius } from '@/constants/theme';

/**
 * Props for the BaseSheet component
 * Provides a consistent wrapper around TrueSheet with platform-specific styling
 */
export interface BaseSheetProps {
  /** Unique name for programmatic control via TrueSheet.present('sheetName') */
  name: string;
  /** Content to render inside the sheet */
  children: React.ReactNode;
  /** Snap points for sheet height - 'auto' sizes to content, numbers are screen percentages */
  detents?: (number | 'auto')[];
  /** Starting detent index (0 = first/collapsed) */
  initialDetentIndex?: number;
  /** Called when sheet is dismissed */
  onDismiss?: () => void;
  /** Called when detent changes with the new index */
  onDetentChange?: (index: number) => void;
  /** Enable nested scrolling for content that exceeds visible area */
  scrollable?: boolean;
  /** Show drag handle at top of sheet */
  grabberVisible?: boolean;
  /** Corner radius override (defaults to 16) */
  cornerRadius?: number;
  /** Additional TrueSheet props */
  trueSheetProps?: Partial<TrueSheetProps>;
  /** Disable dimmed background (allows map interaction) */
  dimmed?: boolean;
}

/**
 * Ref handle for BaseSheet - exposes present/dismiss methods
 */
export interface BaseSheetRef {
  /** Present the sheet */
  present: (index?: number) => Promise<void>;
  /** Dismiss the sheet */
  dismiss: () => Promise<void>;
}

/**
 * Detects if Liquid Glass effect is available (iOS 26+)
 */
const getIsLiquidGlassAvailable = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  return isLiquidGlassAvailable();
};

/**
 * Gets platform-specific blur tint for the sheet background
 * - iOS 26+: undefined (TrueSheet handles Liquid Glass automatically)
 * - Older iOS/Android: 'system-material' blur effect
 */
const getBlurTint = (): 'system-material' | undefined => {
  const hasLiquidGlass = getIsLiquidGlassAvailable();
  return hasLiquidGlass ? undefined : 'system-material';
};

/**
 * BaseSheet - A reusable wrapper component for TrueSheet
 *
 * Provides consistent behavior across all sheet implementations:
 * - Platform-specific styling (Liquid Glass on iOS 26+, blur fallback elsewhere)
 * - Named sheet registration for programmatic control
 * - Customizable detents for collapsed/expanded states
 * - Consistent corner radius and styling
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<BaseSheetRef>(null);
 *
 * // Present via ref
 * await sheetRef.current?.present();
 *
 * // Or use named sheets
 * TrueSheet.present('MySheet');
 *
 * <BaseSheet
 *   ref={sheetRef}
 *   name="MySheet"
 *   detents={['auto', 0.7]}
 *   onDetentChange={(index) => setIsExpanded(index > 0)}
 * >
 *   <MyContent />
 * </BaseSheet>
 * ```
 */
const BaseSheet = forwardRef<BaseSheetRef, BaseSheetProps>(
  (
    {
      name,
      children,
      detents = ['auto'],
      initialDetentIndex = 0,
      onDismiss,
      onDetentChange,
      scrollable = false,
      grabberVisible = true,
      cornerRadius = BorderRadius.lg,
      trueSheetProps,
      dimmed = true,
    },
    ref,
  ) => {
    const trueSheetRef = useRef<TrueSheet>(null);
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // Expose present/dismiss methods via ref
    useImperativeHandle(ref, () => ({
      present: async (index?: number) => {
        // Use provided index or fall back to initialDetentIndex
        await trueSheetRef.current?.present(index ?? initialDetentIndex);
      },
      dismiss: async () => {
        await trueSheetRef.current?.dismiss();
      },
    }));

    const blurTint = getBlurTint();

    return (
      <TrueSheet
        ref={trueSheetRef}
        name={name}
        detents={detents}
        cornerRadius={cornerRadius}
        grabber={grabberVisible}
        blurTint={blurTint}
        dimmed={dimmed}
        onDidDismiss={onDismiss}
        onDetentChange={(event) => {
          onDetentChange?.(event.nativeEvent.index);
        }}
        scrollable={scrollable}
        {...trueSheetProps}
      >
        {children}
      </TrueSheet>
    );
  },
);

BaseSheet.displayName = 'BaseSheet';

export default BaseSheet;
