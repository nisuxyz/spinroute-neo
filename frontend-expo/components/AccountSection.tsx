import React from 'react';
import { View, Alert } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Icon } from './icon';

export default function AccountSection() {
  const { signOut, loading } = useAuth();

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex-row">
        <View className="flex-1 gap-1.5">
          <CardTitle variant="large">Account</CardTitle>
        </View>
      </CardHeader>
      <CardContent>
        {loading ? (
          <View className="w-full justify-center">
            <Skeleton className="h-12 w-full rounded-xl" />
          </View>
        ) : (
          <Button
            // variant=""
            size="xl"
            className="w-full bg-rose-500/20"
            onPress={handleSignOut}
          >
            <Icon name="logout" size={20} color="#f43f5e" />
            <Text className="text-rose-500 font-semibold">Sign Out</Text>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
