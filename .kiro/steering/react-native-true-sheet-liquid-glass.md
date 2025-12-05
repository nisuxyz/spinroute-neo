---
inclusion: manual
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 
Liquid Glass

Starting with iOS 26, Apple introduced the Liquid Glass visual effect, a new design element that creates a frosted glass appearance on sheets and modals.

TrueSheet supports Liquid Glass by default on iOS 26+, giving your sheets a modern, native look.
liquid-glass
What is Liquid Glass?

Liquid Glass is a visual effect introduced in iOS 26 that provides a translucent, frosted glass appearance with a subtle blur. It's part of Apple's latest design language and is automatically applied to native sheet presentations.
Default Behavior

By default, TrueSheet enables Liquid Glass on iOS 26+ devices:

When running on iOS 26+, the sheet will automatically display with the Liquid Glass effect.
Disabling Liquid Glass

If you prefer the classic sheet appearance without Liquid Glass, you can disable it by setting UIDesignRequiresCompatibility to true in your Info.plist:
Using Info.plist

Add the following key to your ios/YourApp/Info.plist:
ios/YourApp/Info.plist

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Other keys... -->
  <key>UIDesignRequiresCompatibility</key>
  <true/>
</dict>
</plist>

Using Expo Config Plugin

If you're using Expo, you can configure this through your app.json or app.config.js:
app.config.js

export default {
  expo: {
    ios: {
      infoPlist: {
        UIDesignRequiresCompatibility: true,
      },
    },
  },
}

After making this change, rebuild your app:

npx expo prebuild --clean
npx expo run:ios

Blur Effect with Liquid Glass

TrueSheet's blur effect props work seamlessly with Liquid Glass on iOS 26+. You can use blurTint, blurIntensity, and blurInteraction to customize the blur appearance:

<TrueSheet
  blurTint="system-material"
  blurIntensity={80}
  blurInteraction={false}
/>

See the Configuration reference for all blur options.
Learn More

    How to create Apple Maps style liquid glass sheets in Expo - Expo Blog
    Apple's Liquid Glass Documentation
