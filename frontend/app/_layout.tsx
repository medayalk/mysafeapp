import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useStore } from '@/src/store';
import { setAuthToken } from '@/src/services/api';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, token, initialize } = useStore();

  useEffect(() => {
    initialize().then(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  if (isLoading) {
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
