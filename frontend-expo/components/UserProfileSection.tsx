import React from 'react';
import { View, useColorScheme } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Text } from './ui/text';
import { Skeleton } from './ui/skeleton';

export default function UserProfileSection() {
  const { user, loading } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex-row">
        <View className="flex-1 gap-1.5">
          <CardTitle variant="large">Profile</CardTitle>
        </View>
      </CardHeader>
      <CardContent>
        {loading ? (
          <View className="py-4 gap-4">
            <View className="gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-48" />
            </View>
            <View className="gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-64" />
            </View>
          </View>
        ) : (
          <View className="w-full justify-center gap-4">
            <View className="gap-2">
              <Label htmlFor="email">Email</Label>
              <Text variant="small" className="text-gray-500">
                {user.email}
              </Text>
            </View>
            <View className="gap-2">
              <Label htmlFor="name">User ID</Label>
              <Text variant="small" className="text-gray-500">
                {user.id}
              </Text>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
}
