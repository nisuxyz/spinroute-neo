import { Stack } from 'expo-router';
import { Paywall } from '@/components/Paywall';
import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function PaywallScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Go Pro',
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      <View style={styles.container}>
        <Paywall visible={true} onClose={() => router.back()} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
