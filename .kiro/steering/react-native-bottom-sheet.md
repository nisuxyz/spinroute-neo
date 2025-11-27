---
inclusion: manual
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 
Comprehensive Reference Documentation for @gorhom/react-native-bottom-sheet (v5)

This report provides an exhaustive reference manual for the @gorhom/react-native-bottom-sheet library, synthesizing installation procedures, core component APIs, advanced configuration parameters, modal architecture, and critical troubleshooting steps. This documentation is structured for systematic consumption by Large Language Models (LLMs) requiring detailed technical guidance on mobile component implementation.

Section 1: Installation, Setup, and Core Architectural Foundation

The implementation of react-native-bottom-sheet relies on deep native integration for high-performance gesture handling and fluid animations. This architectural choice necessitates specific foundational dependencies and setup requirements.

1.1. Core Dependencies and Installation Process

Successful deployment of the library requires the installation of the main package alongside two essential peer dependencies: react-native-reanimated and react-native-gesture-handler. These dependencies provide the underlying infrastructure for low-level gesture detection and high-speed animation updates.  

Installation instructions vary slightly depending on the project environment:
Platform/Package	Command	Purpose
Core Package	yarn add @gorhom/bottom-sheet@^5	

Installs the primary Bottom Sheet library.
Dependencies (Yarn/NPM)	yarn add react-native-reanimated react-native-gesture-handler	

Installs the core peer dependencies for gesture and animation management.
Dependencies (Expo)	npx expo install react-native-reanimated react-native-gesture-handler	

Installs dependencies specifically optimized for the Expo ecosystem.
 

1.2. Fundamental Usage Structure and Gesture Root Requirement

The most crucial setup requirement involves encapsulating the application's root component within the <GestureHandlerRootView>. This container, provided by react-native-gesture-handler, is mandatory to correctly initialize the native gesture system used by the Bottom Sheet component throughout the application’s view hierarchy.  

The BottomSheet component itself is typically managed using a React ref, enabling external programmatic control over its state, and requires a defined list of snapPoints for positional transitions. Event handling is managed through callbacks such as onChange, which reports the sheet's new state index.  

The fundamental design decision to mandate the <GestureHandlerRootView> wrapper and its underlying dependencies demonstrates that the library’s architecture bypasses standard React Native touch handling. This deep reliance on the native gesture system is the causal root of both the component’s high performance and the developer’s need to use specific component substitutions outlined in Section 6 to avoid inevitable gesture conflicts, thereby enforcing architectural consistency across the application.

Code Example: Basic Non-Scrollable Usage

JavaScript

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const App = () => {
  // ref for programmatic control
  const bottomSheetRef = useRef<BottomSheet>(null);
  // Example snap points, required for functional sheet behavior
  const snapPoints = useMemo(() => ['25%', '50%', '90%'],);
  
  // callback for state change
  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  },);
  
  // renders
  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheet 
        ref={bottomSheetRef} 
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
      >
        {/* BottomSheetView is used for static content */}
        <BottomSheetView style={styles.contentContainer}>
          <Text>Awesome 🎉</Text>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
  },
  contentContainer: {
    flex: 1,
    padding: 36,
    alignItems: 'center',
  },
});

export default App;

Section 2: The Core BottomSheet Component API Reference

The primary component, BottomSheet, offers extensive configuration through props and programmatic control through methods exposed via its React reference.

2.1. Programmatic Control: Methods Interface

Methods allow external components to manipulate the sheet's position and state without direct user interaction. These methods are accessed by referencing the sheet component via useRef or through the useBottomSheet hook.  

All methods are designed to accept optional animation configurations, allowing custom physics to be applied to the positional change.

BottomSheet Component Methods

Method Name	Type Signature	Description
snapToIndex	(index: number, animationConfigs?: Config) => void	Snaps the sheet to the specified index within the snapPoints array.
snapToPosition	(position: number, animationConfigs?: Config) => void	Snaps the sheet to an absolute position, defined in pixels or as a percentage string.
expand	(animationConfigs?: Config) => void	Moves the sheet to the highest available snap point.
collapse	(animationConfigs?: Config) => void	Moves the sheet to the lowest available snap point.
close	(animationConfigs?: Config) => void	Closes the bottom sheet, typically snapping to the index -1 or below the screen boundary.
forceClose	(animationConfigs?: Config) => void	Initiates closure and prevents any interruption (e.g., gestures or other snap calls) until the sheet is fully closed.

The distinction between close and forceClose is critical for architectural robustness. forceClose maintains a lockable state, preventing the snap animation from being disrupted by concurrent interactions. This is essential for guaranteeing UI consistency and predictable behavior in applications that feature heavy user interaction or complex state management.  

2.2. Core Configuration Properties

Configuration props govern the sheet’s initial state, movement characteristics, and gesture handling.

2.2.1. Snap Points, Indexing, and Initialization

The definition of snap points is fundamental to the component’s behavior. Snap points must be sorted from the smallest height (bottom) to the largest height (top).
Prop Name	Type	Default	Required	Description
index	number	0	NO	

Initial index to snap to. A value of -1 closes the sheet initially.
snapPoints	Array<number|string> | SharedValue<Array<string | number>>		YES*	

Defines the vertical positions where the sheet can rest. String values must be percentages (e.g., '50%').
animateOnMount	boolean	true	NO	

If true, the sheet calculates its layout after mounting and then animates to the initial index.
overrideReduceMotion	ReduceMotion	ReduceMotion.System	NO	

Controls animation based on device accessibility settings: System, Always (disable), or Never (enable).
 

Note on snapPoints requirement: This prop is mandatory unless enableDynamicSizing is explicitly set to true (which is the default behavior).  

2.2.2. Interaction and Gesture Behavior

Interaction props define how the user can manipulate the sheet through gestures.
Prop Name	Type	Default	Required	Description
overDragResistanceFactor	number	2.5	NO	

Controls the magnitude of resistance when dragging past the maximum snap point.
detached	boolean	false	NO	

Specifies whether the sheet is fixed to the bottom edge or can float above it.
enableContentPanningGesture	boolean	true	NO	

Allows sheet dragging when interacting with the content area.
enableHandlePanningGesture	boolean	true	NO	

Allows sheet dragging when interacting with the handle component.
enableOverDrag	boolean	true	NO	

Enables the visible dragging action beyond the highest snap point.
enablePanDownToClose	boolean	false	NO	

Allows closing the sheet completely by panning down from any resting snap point.
 

2.3. Layout and Dynamic Sizing Configuration

Dynamic Sizing is a key feature introduced in v5 that automates height calculation, but it carries architectural implications for index management.
Prop Name	Type	Default	Required	Description
enableDynamicSizing	boolean	true	NO	

Enables the internal calculation of content height and scrollable size.
maxDynamicContentSize	number	container height	NO	

Sets an upper limit for the calculated dynamic content height.
handleHeight	number	24	NO	

Assists layout calculations, especially when a custom handleComponent is used.
containerHeight	number	0	NO	

Providing this manually prevents an extra re-rendering cycle by eliminating internal calculation.
 

The default activation of enableDynamicSizing profoundly affects snap point indexing. When this feature is active, the content height is automatically calculated and inserted into the snapPoints array, which is then re-sorted. This dynamic modification means that developers utilizing fixed index values (e.g., calling snapToIndex(1)) cannot rely on those indices remaining constant if the content size changes or if the provided snap points are not perfectly ordered relative to the calculated content size. For example, if static snap points are defined as and the content height is calculated at `500`, the final snap points array becomes, effectively shifting the index of the 1000 snap point. Therefore, relying on fixed index values is unreliable when dynamic sizing is enabled.  

2.4. Keyboard and Accessibility Configuration

The library includes robust methods for handling keyboard interactions seamlessly on both iOS and Android.
Prop Name	Type	Default	Required	Description
keyboardBehavior	'extend' | 'fillParent' | 'interactive'	'interactive'	NO	

Defines sheet movement relative to the keyboard: extend (to max point), fillParent (to fill parent view), or interactive (offset by keyboard size).
keyboardBlurBehavior	'none' | 'restore'	'none'	NO	

Action taken after keyboard blur: none or restore sheet position.
enableBlurKeyboardOnGesture	boolean	false	NO	

Blurs the keyboard automatically when the user starts dragging the sheet.
android_keyboardInputMode	'adjustPan' | 'adjustResize'	'adjustPan'	NO	

Android-specific setting for keyboard input behavior.
 

2.5. Gesture Configuration

The library exposes low-level props from react-native-gesture-handler for fine-grained control over gesture activation and resolution, indicating that advanced usage requires a foundational understanding of the underlying gesture system.
Prop Name	Type	Default	Required	Description
waitFor	React.Ref | React.Ref	``	NO	

Specifies other gesture handlers that must complete before the sheet's gesture activates.
simultaneousHandlers	React.Ref | React.Ref	``	NO	

Specifies other handlers that may activate concurrently with the sheet's gesture.
activeOffsetX	number	undefined	NO	

Defines the minimum horizontal displacement required to activate the gesture.
activeOffsetY	number	undefined	NO	

Defines the minimum vertical displacement required to activate the gesture.
 

The exposure of these specific react-native-gesture-handler primitives confirms that the library does not entirely abstract away gesture complexity. When integrating the Bottom Sheet with custom components or complex screen layouts, the developer must possess expertise in managing competitive and simultaneous gesture recognition via these properties to achieve the desired interaction flow.  

2.6. Callbacks and Animated Nodes

Prop Name	Type	Default	Required	Description
onChange	function	null	NO	

Callback executed when the sheet settles at a new snap index: (index: number) => void.
onAnimate	function	null	NO	

Callback executed before the sheet begins animating to a new position.
animatedIndex	Animated.SharedValue<number>	null	NO	

Reanimated Shared Value for internal index tracking, useful for animations outside the sheet.
animatedPosition	Animated.SharedValue<number>	null	NO	

Reanimated Shared Value for internal position tracking.
animationConfigs	function	undefined	NO	

Custom animation configurations generated by specialized hooks (Section 4.2).
 

Section 3: Specialized Scrollable Components Reference

Due to the fundamental gesture conflict that arises when mixing the sheet’s vertical drag gesture with a content’s vertical scroll gesture, the library necessitates the use of specialized, pre-integrated scrollable components. These components are wrappers around their standard React Native counterparts, designed to properly manage the delegation of gesture control between the sheet and the scrollable content.  

3.1. Common Scrollable Component Interface Nuances

All dedicated scrollable components—including BottomSheetFlatList, BottomSheetScrollView, BottomSheetSectionList, BottomSheetVirtualizedList, and BottomSheetFlashList—share a standardized interface and specific operational constraints.  

Common Scrollable Component Interface Constraints	Detail
Inheritance	

All components inherit the entirety of props from their corresponding standard React Native base components (e.g., FlatListProps, ScrollViewProps).
Ignored Props	

Three props are internally managed and will be ignored if passed: scrollEventThrottle, decelerationRate, and onScrollBeginDrag. This control ensures seamless gesture transfer.
focusHook Prop	

An optional function prop that defaults to React.useEffect. When integrating the sheet with multi-screen navigation (e.g., React Navigation), this prop must be supplied with useFocusEffect from @react-navigation/native to correctly identify the currently active scrollable reference.
 

The standardized interface for managing scroll properties and the conditional need for the focusHook confirm that the library maintains monolithic control over gesture ownership. This aggressive management ensures a smooth user experience by preventing visual flicker or inconsistent dragging behavior that often plagues nested scrollable gestures in mobile development.  

3.2. Detailed Scrollable Component Documentation

3.2.1. BottomSheetFlatList

The BottomSheetFlatList is a pre-integrated, performance-optimized list component designed for the Bottom Sheet. It is utilized exactly like a standard FlatList, but ensures correct vertical gesture delegation.  

Code Example: BottomSheetFlatList Usage

JavaScript

import React, { useCallback, useRef, useMemo } from "react";
import { StyleSheet, View, Text, Button } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";

const App = () => {
  const sheetRef = useRef<BottomSheet>(null);
  const data = useMemo(
    () => Array(50).fill(0).map((_, index) => `index-${index}`),
   
  );
  const snapPoints = useMemo(() => ["25%", "50%", "90%"],);
  
  const handleSheetChange = useCallback((index) => {
    console.log("handleSheetChange", index);
  },);
  
  const handleSnapPress = useCallback((index) => {
    sheetRef.current?.snapToIndex(index);
  },);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.itemContainer}>
        <Text>{item}</Text>
      </View>
    ),
   
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <Button title="Snap To 90%" onPress={() => handleSnapPress(2)} />
      {/*... other controls... */}
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        onChange={handleSheetChange}
      >
        <BottomSheetFlatList
          data={data}
          keyExtractor={(i) => i}
          renderItem={renderItem}
          contentContainerStyle={styles.contentContainer}
        />
      </BottomSheet>
    </GestureHandlerRootView>
  );
};
//... Styles omitted for brevity...

3.2.2. BottomSheetScrollView

This component integrates the standard ScrollView functionality, inheriting all ScrollViewProps from React Native. It is ideal for containing smaller amounts of data or forms that require scrolling. The same constraints regarding focusHook and ignored props apply.  

3.2.3. BottomSheetFlashList

The BottomSheetFlashList provides integration for the highly performant FlashList component. It inherits all FlashListProps. As with its counterparts, it utilizes the focusHook for integration with navigation systems and requires configuration specific to list virtualization, such as estimatedItemSize, for optimal performance.  

3.2.4. BottomSheetSectionList

The BottomSheetSectionList integrates the standard SectionList component, allowing for the rendering of grouped data with sticky headers. It inherits all SectionListProps and adheres to the common gesture and property constraints.  

3.2.5. BottomSheetVirtualizedList

This component wraps the raw VirtualizedList, providing maximum control over data access and rendering for large datasets. It inherits all VirtualizedListProps and requires developers to implement getItemCount and getItem functions to interface with the list data.  

Section 4: Advanced Control and Hooks

The library utilizes React Hooks to provide access to internal state and methods from within the sheet's content hierarchy, and to facilitate the customization of animation dynamics.

4.1. useBottomSheet

The useBottomSheet hook provides all the public component methods (Section 2.1) and the internal Reanimated values (animatedIndex and animatedPosition) to any child component rendered within the sheet. This enables components deep within the content tree to programmatically control the sheet's state without prop drilling.  

This mechanism establishes a dual control paradigm for the sheet: external control via the component ref (optimal for container components managing visibility) and internal control via the hook (crucial for encapsulated components that need to manage their own closure or expansion, such as a "Done" button inside the sheet content).  

Code Example: Using useBottomSheet

JavaScript

import React from 'react';
import { View, Button } from 'react-native';
import { useBottomSheet } from '@gorhom/bottom-sheet';

const SheetContent = () => {
  // Access expand method directly
  const { expand } = useBottomSheet();
  
  return (
    <View>
      <Button title="Expand Sheet" onPress={expand} />
    </View>
  )
}

4.2. Animation Configuration Hooks

Custom animations are defined by providing a configuration function to the animationConfigs prop of the BottomSheet component. These utility hooks abstract the complexity of creating these configurations.  

4.2.1. useBottomSheetSpringConfigs

This hook generates physics-based animation configurations, allowing for customization of parameters like damping, stiffness, and clamping to achieve specific spring-based movement characteristics.  

Code Example: Spring Configs

JavaScript

import BottomSheet, { useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';

const SheetComponent = () => {
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 80,
    overshootClamping: true,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 0.1,
    stiffness: 500,
  });
  
  return (
    <BottomSheet
      animationConfigs={animationConfigs}
      //... other props
    >
      {/* CONTENT HERE */}
    </BottomSheet>
  )
}

4.2.2. useBottomSheetTimingConfigs

This hook generates duration and easing-based animation configurations, allowing the developer to control the speed and smoothness of movement using standard timing functions from react-native-reanimated.  

Code Example: Timing Configs

JavaScript

import BottomSheet, { useBottomSheetTimingConfigs } from '@gorhom/bottom-sheet';
import { Easing } from 'react-native-reanimated';

const SheetComponent = () => {
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 250,
    easing: Easing.exp,
  });
  
  return (
    <BottomSheet
      animationConfigs={animationConfigs}
      //... other props
    >
      {/* CONTENT HERE */}
    </BottomSheet>
  )
}

These animation hooks serve as critical API simplification tools. They convert the complex, low-level function signature required by the component's underlying Reanimated implementation into a concise object structure, enabling developers to customize motion without requiring deep, expert-level knowledge of the raw Reanimated API signatures.  

Section 5: The BottomSheetModal Architecture

The BottomSheetModal is an advanced component that acts as a wrapper or decorator around the core BottomSheet. It augments the sheet's functionality with system-level modal presentation capabilities, stack management, and features inspired by native modal interactions, such as those found in Apple Maps.  

5.1. Architectural Overview and Provider Requirement

To enable global modal management and ensure the modal renders on the absolute top layer of the application, all application content must be wrapped in the <BottomSheetModalProvider> component. This provider establishes the necessary context for handling modal stacking and presentation logistics.  

The BottomSheetModal inherits nearly all properties from the standard BottomSheet component, excluding animateOnMount and containerHeight, which are managed internally by the modal presentation logic.  

5.2. Modal Specific Methods: Presentation and Dismissal

Unlike the standard sheet, which stays mounted, the Modal component is designed for precise lifecycle management, requiring specific methods to control its appearance and destruction.  

BottomSheetModal Specific Methods

Method Name	Type Signature	Description
present	(data?: any) => void	

Programmatically mounts and displays the modal, snapping it to its initial snap point. It can accept optional data payload.
dismiss	(animationConfigs?: Config) => void	Programmatically closes the modal and triggers its unmounting from the component tree.
 

The explicit provision of present and dismiss methods, coupled with the property enableDismissOnClose, highlights the library's focus on efficient resource management inherent to the modal pattern. The component is designed for immediate unmounting and cleanup upon closing, a crucial optimization pattern for maintaining mobile performance, particularly in scenarios involving multiple concurrent sheets.  

5.3. Modal Specific Configuration Properties

Prop Name	Type	Default	Required	Description
name	string	generated unique key	NO	

A unique identifier for the modal, used for stack management.
stackBehavior	'push' | 'switch' | 'replace'	'switch'	NO	

Controls interaction with other modals: push (mount on top), switch (minimize current, mount new), or replace (dismiss current, mount new).
enableDismissOnClose	boolean	true	NO	

If true, the modal is dismissed (unmounted) after the sheet closes.
onDismiss	() => void	null	NO	

Callback executed specifically when the modal is dismissed and unmounted.
containerComponent	React.ReactNode	undefined	NO	

Allows placing a custom container component, often used for compatibility with React Native Screens to ensure top-layer positioning.
 

The stackBehavior options confirm that the Modal component is built to manage complex, global user experience problems, specifically the rendering and interaction hierarchy of multiple overlapping sheets, which the standard BottomSheet component is not designed to handle.  

5.4. Full BottomSheetModal Usage Example

The following example illustrates the required structure, including the BottomSheetModalProvider and the use of the present method to invoke the modal.  

Code Example: BottomSheetModal Usage

JavaScript

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheetModal, { 
  BottomSheetView, 
  BottomSheetModalProvider 
} from '@gorhom/bottom-sheet';

const App = () => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%', '50%'],);

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present(); // Invokes mounting and presentation
  },);

  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  },);

  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheetModalProvider> {/* Required Global Provider */}
        <Button title="Present Modal" onPress={handlePresentModalPress} />

        <BottomSheetModal
          ref={bottomSheetModalRef}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
        >
          <BottomSheetView style={styles.contentContainer}>
            <Text>Awesome 🎉</Text>
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};
//... Styles omitted for brevity...

Section 6: Troubleshooting and Gesture Conflict Resolution

Due to the fundamental requirement for react-native-gesture-handler (RNGH) to manage sheet movement, standard React Native interaction components often conflict with the library’s internal gesture mechanisms. The troubleshooting solutions universally dictate a component substitution paradigm.

6.1. Handling Pressable and Touchable Conflicts on Android

When standard touch components from react-native are used within the sheet, particularly on Android, the library’s gesture handlers frequently intercept the tap events, causing the touchable elements to fail or register taps inconsistently.  

The prescriptive solution is to use specialized touchable components provided directly by the @gorhom/bottom-sheet library. These substitutes are integrated to correctly delegate tap events while coexisting with the sheet’s primary pan gestures.  

Code Example: Correct Touchable Imports

JavaScript

import { 
  TouchableOpacity, 
  TouchableHighlight, 
  TouchableWithoutFeedback 
} from '@gorhom/bottom-sheet'; 

6.2. Addressing Horizontal Scrolling Conflicts

Similar to touchables, standard FlatList or ScrollView components from react-native used for horizontal scrolling can introduce gesture ambiguity, preventing either the sheet or the content from panning correctly.  

To resolve this, developers must substitute the standard list and scroll views with the components provided by react-native-gesture-handler, as these are designed to correctly interact within a complex gesture environment.  

Code Example: Correct Scrollable Imports

JavaScript

import { 
  ScrollView, 
  FlatList 
} from 'react-native-gesture-handler'; 

6.3. Resolving Arbitrary Component Gesture Conflicts

In cases where a custom component (e.g., a map view, a photo editor, or another complex interactive element) implements its own gesture recognition, this custom interaction may be interrupted or superseded by the Bottom Sheet’s inherent pan gesture.  

The solution requires explicit manual intervention using low-level RNGH primitives to manage gesture priority. The problematic component must be wrapped with NativeViewGestureHandler and the disallowInterruption prop must be set to true. This instructs the gesture system to prioritize the wrapped native component's gestures and prevents the Bottom Sheet's handler from taking precedence during the interaction.  

Code Example: Gesture Conflict Resolution

JavaScript

import { NativeViewGestureHandler } from 'react-native-gesture-handler'; 

<NativeViewGestureHandler disallowInterruption={true}>
  <AwesomeComponent /> 
</NativeViewGestureHandler>

 

This troubleshooting section validates the operational premise of the library: due to its deep integration into the gesture handling layer, compatibility with standard React Native interaction primitives is fundamentally broken. Therefore, the consistent use of specialized @gorhom/bottom-sheet or react-native-gesture-handler components for all touch and scroll interactions is not merely optional advice but a mandatory precondition for stable and correct behavior.   