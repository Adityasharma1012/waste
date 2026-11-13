import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/state/AppContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { hydrated, profile, theme } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync().catch(() => {});

    const inOnboarding = segments[0] === 'onboarding';
    if (!profile.onboardingCompleted && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [hydrated, profile.onboardingCompleted, segments, router]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ title: 'Welcome & Setup', headerShown: false }}
        />
        <Stack.Screen
          name="item/new"
          options={{ title: 'Add Pantry Item', presentation: 'modal' }}
        />
        <Stack.Screen
          name="item/[id]"
          options={{ title: 'Edit Pantry Item', presentation: 'modal' }}
        />
        <Stack.Screen
          name="how-calculated"
          options={{ title: 'How Impact Is Calculated' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
