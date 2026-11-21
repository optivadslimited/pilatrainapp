import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from '@/config/env';

import { storage } from './storage';

/**
 * The Supabase client, or `null` until the project keys exist.
 *
 * With no keys the app runs in local mode: the plan engine runs on the phone
 * against the bundled placeholder classes and nothing leaves the device.
 * With keys, the quiz answers, the plan and everything else live in our own
 * database, behind row-level security.
 *
 * Run on 21 November 2026 against the Supabase project "Pilatrain": a fresh
 * install signed in anonymously once, and kept that session through a
 * relaunch and a code reload. TODO(owner): one project per environment; the
 * staging and production keys go in EAS.
 */
export const isBackendConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** The auth session is kept in MMKV, like everything else on the device. */
const sessionStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => {
    storage.remove(key);
  },
};

export const supabase: SupabaseClient | null = isBackendConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        // There is no URL to read a session from in a native app.
        detectSessionInUrl: false,
      },
    })
  : null;

// Refresh the session only while the app is in front, as Supabase recommends.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/**
 * An anonymous session from first launch, so the quiz and the free class work
 * before an account exists. It is upgraded to a full account later, keeping
 * the same user id. Returns her user id, or `null` in local mode.
 */
export async function ensureSession(): Promise<string | null> {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return created.user?.id ?? null;
}
