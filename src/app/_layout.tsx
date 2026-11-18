import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { sheetOptions, ToastHost } from '@/components';
import { loadAccount } from '@/features/account/account';
import { startMembership } from '@/features/membership/membership';
import { syncSessionReminders, syncTrialReminder, watchReminders } from '@/features/reminders/sync';
import { track } from '@/lib/analytics';
import { persistOptions, queryClient } from '@/lib/queryClient';
import { ensureSession } from '@/lib/supabase';
import { watchConnection } from '@/lib/useOnline';
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
    watchConnection();
    watchReminders();

    // An anonymous session from first launch, so the quiz and the free class
    // work before an account exists. Does nothing in local mode. If it fails
    // (no connection), the first request that needs a session tries again.
    // The store is connected once the session exists, so RevenueCat knows her
    // by the same ID as our database does.
    ensureSession()
      .catch(() => null)
      .then((userId) => startMembership(userId))
      .then(() => Promise.all([loadAccount(), syncTrialReminder(), syncSessionReminders()]))
      .catch(() => {});
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            // Native push transitions. Under Reduce Motion they become cross-fades.
            animation: reduceMotion ? 'fade' : 'default',
            // Portrait everywhere. Only the player turns to landscape.
            orientation: 'portrait_up',
          }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="quiz" />
          <Stack.Screen name="holding" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="building" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen
            name="plan-preview"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="move/[sessionId]" options={sheetOptions([0.6, 1])} />
          <Stack.Screen name="class/[id]" options={sheetOptions([0.85, 1])} />
          <Stack.Screen
            name="player"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade',
              gestureEnabled: false,
              orientation: 'all',
            }}
          />
          <Stack.Screen name="after-class" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen
            name="paywall"
            options={{
              // Rises like a sheet and covers the screen. The close button is the way out.
              animation: reduceMotion ? 'fade' : 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="create-account"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="email" />
          <Stack.Screen name="auth" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="reminders" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="delete-account" />
          <Stack.Screen name="library" />
          <Stack.Screen name="adjust" />
          <Stack.Screen name="dev/gallery" />
        </Stack>
        <ToastHost />
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
