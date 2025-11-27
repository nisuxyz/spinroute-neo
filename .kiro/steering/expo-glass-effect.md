---
inclusion: manual
---
# GlassEffect

_React components that render a liquid glass effect using iOS's native UIVisualEffectView._

Available on platform ios

> **important** `GlassView` is only available on iOS 26 and above. It will fallback to regular `View` on unsupported platforms.

React components that render native iOS liquid glass effect using [`UIVisualEffectView`](https://developer.apple.com/documentation/uikit/uivisualeffectview). Supports customizable glass styles and tint color.

## Installation

```bash
$ npx expo install expo-glass-effect
```

If you are installing this in an existing React Native app, make sure to install `expo` in your project.

### Known issues

The `isInteractive` prop can only be set once on mount and cannot be changed dynamically after the component has been rendered. If you need to toggle interactive behavior, you must remount the component with a different `key`.

## Usage

### `GlassView`

The `GlassView` component renders the native iOS glass effect. It supports different glass effect styles and can be customized with tint colors for various aesthetic needs.

```jsx
import { StyleSheet, View, Image } from 'react-native';
import { GlassView } from 'expo-glass-effect';

export default function App() {
  return (
    <View style={styles.container}>
      <Image
        style={styles.backgroundImage}
        source={{
          uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
        }}
      />

      {/* Basic Glass View */}
      <GlassView style={styles.glassView} />

      {/* Glass View with clear style */}
      <GlassView style={styles.tintedGlassView} glassEffectStyle="clear" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  glassView: {
    position: 'absolute',
    top: 100,
    left: 50,
    width: 200,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tintedGlassView: {
    position: 'absolute',
    top: 250,
    left: 50,
    width: 200,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
});
```

### `GlassContainer`

The `GlassContainer` component allows you to combine multiple glass views into a combined effect.

```jsx
import { StyleSheet, View, Image } from 'react-native';
import { GlassView, GlassContainer } from 'expo-glass-effect';

export default function GlassContainerDemo() {
  return (
    <View style={styles.container}>
      <Image
        style={styles.backgroundImage}
        source={{
          uri: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop',
        }}
      />
      <GlassContainer spacing={10} style={styles.containerStyle}>
        <GlassView style={styles.glass1} isInteractive />
        <GlassView style={styles.glass2} />
        <GlassView style={styles.glass3} />
      </GlassContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  containerStyle: {
    position: 'absolute',
    top: 200,
    left: 50,
    width: 250,
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  glass1: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  glass2: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  glass3: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
```

### `isLiquidGlassAvailable`

The `isLiquidGlassAvailable` function let's you check, if the Liquid Glass effect is available in the compiled application.
It validates the system and compiler versions, as well as the [**Info.plist**](https://developer.apple.com/documentation/BundleResources/Information-Property-List/UIDesignRequiresCompatibility) settings.

```tsx
import { isLiquidGlassAvailable } from 'expo-glass-effect';

export default function CheckLiquidGlass() {
  return (
    <Text>
      {isLiquidGlassAvailable()
        ? 'Liquid Glass effect is available'
        : 'Liquid Glass effect is not available'}
    </Text>
  );
}
```

### `isGlassEffectAPIAvailable`

The `isGlassEffectAPIAvailable` function checks whether the Liquid Glass API is available at runtime on the device.

> **Warning** This API was added because some iOS 26 beta versions do not have the Liquid Glass API available, which can lead to crashes. You should check this before using `GlassView` in your app to ensure compatibility. See [issue #40911](https://github.com/expo/expo/issues/40911) for more details.

```tsx
import { isGlassEffectAPIAvailable } from 'expo-glass-effect';

export default function CheckGlassEffectAPI() {
  return (
    <Text>
      {isGlassEffectAPIAvailable()
        ? 'Glass Effect API is available'
        : 'Glass Effect API is not available'}
    </Text>
  );
}
```

## API

```js
import {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
```

## API: expo-glass-effect

### Methods

#### GlassContainer (*Function*)
- `GlassContainer(props: GlassContainerProps): React.JSX.Element`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `props` | GlassContainerProps | - |

#### GlassView (*Function*)
- `GlassView(props: GlassViewProps): React.JSX.Element`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `props` | GlassViewProps | - |

#### isLiquidGlassAvailable (*Function*)
- `isLiquidGlassAvailable(): boolean`
  Indicates whether the app is using the Liquid Glass design. The value will be `true` when the
  Liquid Glass components are available in the app.

  This only checks for component availability. The value may also be `true` if the user has enabled
  accessibility settings that limit the Liquid Glass effect.
  To check if the user has disabled the Liquid Glass effect via accessibility settings, use
  [`AccessibilityInfo.isReduceTransparencyEnabled()`](https://reactnative.dev/docs/accessibilityinfo#isreducetransparencyenabled-ios).

### Props

#### GlassContainerProps (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `spacing` *(optional)* | number | The distance at which glass elements start affecting each other.<br>Controls when glass elements begin to merge together. Default: `undefined` |

#### GlassViewProps (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `glassEffectStyle` *(optional)* | GlassStyle | Glass effect style to apply to the view. Default: `'regular'` |
| `isInteractive` *(optional)* | boolean | Whether the glass effect should be interactive. Default: `false` |
| `tintColor` *(optional)* | string | Tint color to apply to the glass effect. |

### Types

#### GlassStyle (*Type*)
Type: 'clear' | 'regular'