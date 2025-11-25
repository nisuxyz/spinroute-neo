# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up environment variables

   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`: Your Mapbox access token
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_KEY`: Your Supabase anon/public key

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Authentication

The app uses **Supabase Authentication with auth gating** - users must sign in before accessing the app.

### Architecture

- **Auth Context**: `hooks/use-auth.tsx` - Provides authentication state and methods
- **Auth Screen**: `app/auth.tsx` - Dedicated sign in/sign up screen
- **Auth Gating**: `app/_layout.tsx` - Redirects based on auth state
- **User Profile**: `components/UserProfileSection.tsx` - Profile management in settings

### Features

- ✅ Authentication gating (must sign in to access app)
- ✅ Email/password sign up and sign in
- ✅ Persistent sessions using expo-sqlite localStorage
- ✅ Auto-refresh tokens
- ✅ Automatic navigation based on auth state
- ✅ User profile display in settings
- ✅ Sign out functionality

### User Flow

1. **First Launch**: App opens to authentication screen
2. **Sign Up/Sign In**: Create account or sign in with existing credentials
3. **Access App**: After authentication, full app access is granted
4. **Session Persistence**: Stay signed in across app restarts
5. **Sign Out**: Access profile in settings to sign out

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
