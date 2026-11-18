import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { switchMembershipUser } from '@/features/membership/membership';
import { useOnboardingStore } from '@/features/onboarding/store';
import { clearLocalPlan } from '@/features/plan/localStore';
import { useReminderStore } from '@/features/reminders/store';
import { track } from '@/lib/analytics';
import { setDevDayOffset } from '@/lib/clock';
import { queryClient } from '@/lib/queryClient';
import { zustandStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import { previewAuth } from './previewAuth';
import { restoreProfile } from './profile';
import { createSupabaseAuth } from './supabaseAuth';
import type { Account, AuthProvider, AuthResult } from './types';

const unavailable: AuthProvider = {
  kind: 'unavailable',
  current: async () => null,
  appleAvailable: async () => false,
  withApple: async () => ({ status: 'failed', reason: 'unavailable' }),
  sendEmail: async () => ({ status: 'failed', reason: 'unavailable' }),
  verifyEmailCode: async () => ({ status: 'failed', reason: 'unavailable' }),
  verifyEmailLink: async () => ({ status: 'failed', reason: 'unavailable' }),
  signOut: async () => {},
  deleteAccount: async () => false,
};

/**
 *   backend keys present   → Supabase
 *   development, no keys   → the preview stand-in
 *   a release with no keys → unavailable (account rows are hidden)
 */
export const auth: AuthProvider = supabase
  ? createSupabaseAuth(supabase)
  : __DEV__
    ? previewAuth
    : unavailable;

export const accountsAvailable = auth.kind !== 'unavailable';

type AccountState = {
  account: Account | null;
  setAccount: (account: Account | null) => void;
};

/** Her account, kept on the device so the You tab is right with no connection. */
export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      account: null,
      setAccount: (account) => set({ account }),
    }),
    { name: 'account', storage: createJSONStorage(() => zustandStorage) },
  ),
);

/** Read the account from the session. Called at launch. */
export async function loadAccount(): Promise<void> {
  try {
    useAccountStore.getState().setAccount(await auth.current());
  } catch {
    // Offline: what was last known stands.
  }
}

/** Forget everything about the person who was using this phone. */
function clearDevice(): void {
  useOnboardingStore.getState().reset();
  useReminderStore.getState().reset();
  clearLocalPlan();
  setDevDayOffset(0);
  queryClient.clear();
}

/**
 * What every successful sign-in or sign-up does next. Returns where she
 * should go: `home` if a plan is waiting for her, `welcome` if she has
 * signed in to an account with no plan yet.
 */
export async function completeAuth(
  result: Extract<AuthResult, { status: 'ok' }>,
): Promise<'home' | 'welcome' | 'continue'> {
  useAccountStore.getState().setAccount(result.account);
  if (result.created) track('account_created', { method: result.account.method });

  // Same person as before: her plan is already here. Nothing else changes.
  if (!result.switched) return 'continue';

  // A different user: this phone now belongs to that account.
  clearDevice();
  await switchMembershipUser(result.userId);
  return (await restoreProfile()) ? 'home' : 'welcome';
}

/** Sign out: the account stays on the server, this phone starts afresh. */
export async function signOut(): Promise<void> {
  await auth.signOut();
  useAccountStore.getState().setAccount(null);
  clearDevice();
  await switchMembershipUser(null);
}

/** Delete her account and everything in it. `false` if the server could not be reached. */
export async function deleteAccount(): Promise<boolean> {
  if (!(await auth.deleteAccount())) return false;
  track('account_deleted');
  useAccountStore.getState().setAccount(null);
  clearDevice();
  await switchMembershipUser(null);
  return true;
}
