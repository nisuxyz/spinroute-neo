import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import {
  Colors,
  electricPurple,
  Spacing,
  Typography,
  ButtonStyles,
  InputStyles,
} from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { GlassContainer, GlassView } from 'expo-glass-effect';

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    console.log('[AuthScreen] Starting auth flow:', { isSignUp, email });
    setSubmitting(true);

    try {
      const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
      setSubmitting(false);

      if (error) {
        console.error('[AuthScreen] Auth error:', error);
        Alert.alert('Error', `${error.message}\n\nDetails: ${JSON.stringify(error, null, 2)}`);
      } else if (isSignUp) {
        Alert.alert('Success', 'Check your email to confirm your account');
        setEmail('');
        setPassword('');
        setIsSignUp(false);
      }
    } catch (err) {
      console.error('[AuthScreen] Auth exception:', err);
      setSubmitting(false);
      Alert.alert('Error', `Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: electricPurple }]}>spinroute</Text>
            <Image
              source={require('@/assets/images/splash.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              {isSignUp ? 'Create your account' : ''}
            </Text>
          </View>

          <GlassContainer>
            <View style={styles.form}>
              <GlassView>
                <TextInput
                  style={[
                    InputStyles.default,
                    {
                      color: colors.text,
                      borderColor: colors.icon,
                      backgroundColor: colors.buttonBackground,
                      marginBottom: Spacing.lg,
                    },
                  ]}
                  placeholder="Email"
                  placeholderTextColor={colors.icon}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!submitting}
                  autoComplete="email"
                />
              </GlassView>
              <GlassView>
                <TextInput
                  style={[
                    InputStyles.default,
                    {
                      color: colors.text,
                      borderColor: colors.icon,
                      backgroundColor: colors.buttonBackground,
                      marginBottom: Spacing.lg,
                    },
                  ]}
                  placeholder="Password"
                  placeholderTextColor={colors.icon}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!submitting}
                  autoComplete={isSignUp ? 'password-new' : 'password'}
                />
              </GlassView>
              <TouchableOpacity
                style={[
                  ButtonStyles.primary,
                  { backgroundColor: colors.buttonIcon, marginTop: Spacing.sm },
                  submitting && { opacity: 0.6 },
                ]}
                onPress={handleAuth}
                disabled={submitting}
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[Typography.bodyMedium, { color: '#fff', fontSize: 16 }]}>
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: Spacing.lg, padding: Spacing.md, alignItems: 'center' }}
                onPress={() => setIsSignUp(!isSignUp)}
                disabled={submitting}
              >
                <Text style={[Typography.bodySmall, { color: colors.tint, fontSize: 14 }]}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassContainer>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl * 1.5,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    ...Typography.displayLarge,
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyMedium,
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
});
