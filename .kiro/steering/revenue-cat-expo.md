# Expo

Instructions for using RevenueCat with Expo

Integrating RevenueCat's in-app purchase capabilities into your app requires you to download your project from Bolt. Then, open your project in an IDE of your choice (like VSCode or Cursor) and follow the instructions below.

Best of luck with your hackathon project, and read more about [adding subscriptions to a Bolt-generated Expo app](https://www.revenuecat.com/blog/engineering/how-to-add-in-app-purchases-to-your-bolt-generated-expo-app/).

## What is RevenueCat?

RevenueCat provides a backend and a wrapper around StoreKit and Google Play Billing to make implementing in-app purchases and subscriptions easy. With our SDK, you can build and manage your app business on any platform without having to maintain IAP infrastructure. You can read more about [how RevenueCat fits into your app](https://www.revenuecat.com/blog/where-does-revenuecat-fit-in-your-app) or you can [sign up free](https://app.revenuecat.com/signup) to start building.

## Introduction

Expo is a framework for building React Native apps. It's a popular choice for rapidly iterating on your app, while letting Expo take care of all the platform-specific code.

To use and test RevenueCat with Expo, you'll need to create an Expo development build. Follow the instructions below and learn more about Expo development builds [here](https://docs.expo.dev/develop/development-builds/introduction/).

## Create an Expo development build

### Set up the Expo project

You can use an existing Expo project, or [create a new one](https://docs.expo.dev/get-started/create-a-project/).

This command will create a default project with example code, and install the Expo CLI as a dependency:

```bash
npx create-expo-app@latest
```

Change to the project directory:

```bash
cd <expo-project-directory>
```

Install the [expo-dev-client](https://docs.expo.dev/versions/latest/sdk/dev-client/):

```bash
npx expo install expo-dev-client
```

### Install RevenueCat's SDKs

Install RevenueCat's `react-native-purchases` for core functionality and `react-native-purchases-ui` for UI components like Paywalls, Customer Center, and more.

Either run:

```bash
npx expo install react-native-purchases react-native-purchases-ui
```

or update your package.json with the [latest package versions](https://github.com/RevenueCat/react-native-purchases/releases):

```json
{
  "dependencies": {
    "react-native-purchases": "latest_version",
    "react-native-purchases-ui": "latest_version"
  }
}
```

After installing RevenueCat's SDKs, you must run the full build process as described below in the Testing your app section to ensure all dependencies are installed. Hot reloading without building will result in errors, such as:

```
Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.
```

## RevenueCat Dashboard Configuration

### Configure a new project

RevenueCat projects are top-level containers for your apps, products, entitlements, paywalls, and more. If you don't already have a RevenueCat project for your app, [create one here](/docs/projects/overview).

### Connect to a Store (Apple, Google, Web, etc.)

Depending on which platform you're building for, you'll need to connect your RevenueCat project to one, or multiple, stores. Set up your project's supported stores [here](/docs/projects/connect-a-store).

### Add Products

For each store you're supporting, you'll need to add the products you plan on offering to your customers. Set up your products for each store [here](/docs/offerings/products/setup-index).

### Create an Entitlement

An entitlement represents a level of access, features, or content that a customer is "entitled" to. When customers purchase a product, they're granted an entitlement. Create an entitlement [here](/docs/getting-started/entitlements). Then, [attach your products](/docs/getting-started/entitlements#attaching-products-to-entitlements) to your new entitlement.

### Create an Offering

An offering is a collection of products that are "offered" to your customers on your paywall. Create an offering for your products [here](/docs/offerings/overview).

### Configure a Paywall

A paywall is where your customers can purchase your products. RevenueCat's Paywalls allow you to remotely build and configure your paywall without any code changes or app updates. Create a paywall [here](/docs/tools/paywalls).

## RevenueCat SDK Configuration

### Initialize the SDK

Once you've installed the RevenueCat SDK, you'll need to configure it. Add the following code to the entry point of your app and be sure to replace `<revenuecat_project_platform_api_key>` with your [project's API keys](/docs/projects/authentication).

More information about configuring the SDK can be found [here](/docs/getting-started/configuring-sdk).

```javascript
import { Platform, useEffect } from 'react-native';
import { useEffect } from 'react';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

//...

export default function App() {
  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    if (Platform.OS === 'ios') {
      Purchases.configure({apiKey: <revenuecat_project_apple_api_key>});
    } else if (Platform.OS === 'android') {
      Purchases.configure({apiKey: <revenuecat_project_google_api_key>});
      // OR: if building for Amazon, be sure to follow the installation instructions then:
      Purchases.configure({ apiKey: <revenuecat_project_amazon_api_key>, useAmazon: true });
    }
  }, []);
}
```

### Identify a user and check subscription status

RevenueCat is the single source of truth for your customer's subscription status across all platforms. Learn more about the different ways to identify your customers to RevenueCat [here](/docs/customers/identifying-customers).

Then, [check the customer's subscription status](/docs/customers/customer-info) by fetching the [CustomerInfo object](/docs/customers/customer-info#reference):

```javascript
try {
  const customerInfo = await Purchases.getCustomerInfo();
  // access latest customerInfo
} catch (e) {
  // Error fetching customer info
}
```

and inspecting the `entitlements` object to see if the customer is subscribed to your entitlement:

```javascript
if(typeof customerInfo.entitlements.active[<my_entitlement_identifier>] !== "undefined") {
  // Grant user "pro" access
}
```

### Present a paywall

If the customer is not subscribed to your entitlement, you can present a paywall to them where they can purchase your products.

There are several ways to present a paywall in Expo, each with different use cases, so please review the [React Native Paywalls documentation](/docs/tools/paywalls/displaying-paywalls#react-native).

## Testing your app

To test, we'll use EAS to build the app for the simulator. You'll need to sign up at [expo.dev](https://expo.dev) and use the account below.

For more information about EAS, see the [EAS docs](https://docs.expo.dev/tutorial/eas/introduction/).

You can also follow these instructions on Expo's docs: [https://docs.expo.dev/tutorial/eas/configure-development-build/#initialize-a-development-build](https://docs.expo.dev/tutorial/eas/configure-development-build/#initialize-a-development-build)

Get started by installing the EAS-CLI:

```bash
npm install -g eas-cli
```

Then login to EAS:

```bash
eas login
```

After logging in, initialize the EAS configuration:

```bash
eas init
```

Then run the following command, which will prompt you to select the platforms you'd like to configure for EAS Build:

```bash
eas build:configure
```

### Testing on iOS simulator

Next, you'll need to update `eas.json` with the simulator build profile [as described here](https://docs.expo.dev/tutorial/eas/ios-development-build-for-simulators/).

Your `eas.json` file might look like this:

```json
{
  "cli": {
    "version": ">= 7.3.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {},
    "ios-simulator": {
      "extends": "development",
      "ios": {
        "simulator": true
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Next, build the app for the simulator:

```bash
eas build --platform ios --profile ios-simulator
```

Building creates a container app with your installed dependencies. Once the build completes and you run it on the device (or simulator, in this case), the app will hot reload with your local changes during development.

Enter your app's bundle ID, matching your RevenueCat config and App Store Connect. Once the build completes, Expo will ask if you want to open the app in the simulator. Choose yes, and it'll launch the simulator with your app.

After your app is running, you'll need to start the Expo server:

```bash
npx expo start
```

Finally, choose the local development server in the iOS simulator.

### Testing on Android device or emulator

To test on an Android device, you'll need to build the app for a physical device or Android emulator as described [here](https://docs.expo.dev/tutorial/eas/android-development-build/).

Please ensure that `developmentClient` in your `eas.json` file is set to true under the `build.development` profile. Then, build the app:

```bash
eas build --platform android --profile development
```

Enter your app's application ID matches your RevenueCat config and Google Play Console. Choose "Yes" when asked if you want to create a new Android Keystore.

Once the build completes, you can run the application on the device or emulator. To run the app on an [Android device](https://docs.expo.dev/tutorial/eas/android-development-build/#android-device), install [Expo Orbit](https://expo.dev/orbit), connect your device to your computer, and select your device from the Orbit menu. Alternatively, use the [provided QR code method](https://docs.expo.dev/tutorial/eas/android-development-build/#android-device:~:text=and%20Install%20button.-,Expo%20Orbit,-allows%20for%20seamless).

To run the app on an [Android emulator](https://docs.expo.dev/tutorial/eas/android-development-build/#android-emulator), choose "Yes" in the terminal after the build completes.

After the app is running, you'll need to start the Expo server:

```bash
npx expo start
```

## Expo Go

[Expo Go](https://expo.dev/go) is a sandbox that allows you to rapidly prototype your app. While it doesn't support running custom native code—such as the native modules required for in-app purchases—`react-native-purchases` includes a built-in Preview API Mode specifically for Expo Go.

When your app runs inside Expo Go, `react-native-purchases` automatically detects the environment and replaces native calls with JavaScript-level mock APIs. This allows your app to load and execute all subscription-related logic without errors, even though real purchases will not function in this mode.

This means you can still preview subscription UIs, test integration flows, and continue development without needing to build a custom development client immediately.

However, to fully test in-app purchases and access real RevenueCat functionality, you must use a [development build](/docs/getting-started/installation/expo#create-an-expo-development-build).
