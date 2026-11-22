import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { colors } from '@/lib/theme';

/** Тап по пушу «тебя пригласили» открывает комнату по slug. */
function useNotificationRouter() {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const redirect = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as { type?: string; slug?: string } | undefined;
      if (data?.type === 'invite' && typeof data.slug === 'string') {
        router.push(`/room/${data.slug}`);
        Notifications.clearLastNotificationResponse();
      }
    };

    redirect(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(redirect);
    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  useNotificationRouter();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="room/[slug]" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="register" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
