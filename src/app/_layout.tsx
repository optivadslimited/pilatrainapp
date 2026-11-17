import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastHost } from '@/components';
import { track } from '@/lib/analytics';
import { queryClient } from '@/lib/queryClient';
import { fonts, useReduceMotion, useTheme } from '@/theme';

// Hold the native splash (a plain Paper screen) until the fonts are ready, so
// the wordmark never appears in the wrong typeface. The launch screen hides it.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();

  const [fontsLoaded, fontError] = useFonts({
    [fonts.serifMedium]: Fraunces_500Medium,
    [fonts.serifSemiBold]: Fraunces_600SemiBold,
  });
  // If a font fails to load the app still opens, in the system serif-less fallback.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    track('app_opened');
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            // Native push transitions. Under Reduce Motion they become cross-fades.
            animation: reduceMotion ? 'fade' : 'default',
          }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="quiz" />
          <Stack.Screen name="holding" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="building" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="dev/gallery" />
        </Stack>
        <ToastHost />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
