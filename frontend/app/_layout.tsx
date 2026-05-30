import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useStore } from '@/src/store';
import { setAuthToken, getCurrentUser, getProfiles } from '@/src/services/api';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, token, user, initialize, setUser, setProfiles, setActiveProfile, activeProfile, logout } = useStore();
  const [bootstrapping, setBootstrapping] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Step 1: load token from storage
  useEffect(() => {
    initialize().then(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  // Step 2: when token is loaded, sync auth header AND fetch user automatically
  useEffect(() => {
    const bootstrap = async () => {
      if (!isLoading) {
        if (token) {
          setAuthToken(token);
          try {
            // Auto sign-in: fetch user + profiles using stored token
            const [userData, profilesData] = await Promise.all([
              getCurrentUser(),
              getProfiles(),
            ]);
            setUser(userData);
            setProfiles(profilesData);

            // If no active profile is set, pick the first one
            if (!activeProfile && profilesData.length > 0) {
              await setActiveProfile(profilesData[0]);
            }
          } catch (error) {
            // Token invalid/expired - logout
            console.log('Token expired, logging out');
            await logout();
          }
        }
        setBootstrapping(false);
      }
    };
    bootstrap();
  }, [isLoading, token]);

  // Auto-navigate based on auth state once bootstrapping completes
  useEffect(() => {
    if (bootstrapping) return;
    const inAuthGroup = segments[0] === 'auth';
    const inTabs = (segments[0] as string) === '(tabs)';
    const isIndex = segments.length === 0 || segments[0] === undefined;

    if (token && user && (inAuthGroup || isIndex)) {
      // User is signed in but on auth or landing - redirect to home
      router.replace('/(tabs)/home');
    } else if (!token && inTabs) {
      // User is not signed in but trying to access tabs
      router.replace('/');
    }
  }, [bootstrapping, token, user, segments]);

  if (isLoading || bootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
