import type { SupabaseClient, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { ensureSession } from '@/lib/supabase';

import type { Account, AuthFailure, AuthProvider, AuthResult } from './types';

/**
 * Accounts on Supabase.
 *
 * She has an anonymous session from first launch. Creating an account does
 * not make a new user: it attaches Apple, or an email address, to the user
 * she already is. Her ID never changes, so her answers, her plan and her
 * membership (RevenueCat uses the same ID) simply become hers to sign back
 * in to. That is the "merge".
 *
 * The anonymous session has run against the Supabase project (21 November
 * 2026). Creating an account, signing in and signing out have NOT YET RUN
 * against it. They need, in the Supabase dashboard:
 * anonymous sign-ins on (done), manual identity linking on, the Apple provider
 * configured with the app's bundle ID, and the email templates changed to
 * send both a link (`{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=...`)
 * and the 6-digit code (`{{ .Token }}`). The README lists the steps.
 */
const accountOf = (user: User | null | undefined): Account | null => {
  if (!user || user.is_anonymous) return null;
  const viaApple =
    user.app_metadata?.provider === 'apple' ||
    (user.identities ?? []).some((identity) => identity.provider === 'apple');
  return { method: viaApple ? 'apple' : 'email', email: user.email ?? null };
};

const failed = (reason: AuthFailure): AuthResult => ({ status: 'failed', reason });

/** Where the emailed link returns to: the app's own `auth` screen. */
const redirectTo = () => Linking.createURL('/auth');

/** Supabase error codes that mean "someone else already has this". */
const TAKEN = new Set(['identity_already_exists', 'email_exists', 'user_already_exists']);
/** ...and the ones that mean "there is no such account". */
const MISSING = new Set(['otp_disabled', 'user_not_found', 'signup_disabled']);

const codeOf = (error: unknown): string =>
  typeof error === 'object' && error !== null
    ? String((error as { code?: unknown }).code ?? '')
    : '';

export function createSupabaseAuth(client: SupabaseClient): AuthProvider {
  const currentUserId = async () => (await client.auth.getSession()).data.session?.user.id ?? null;

  const ok = (user: User, before: string | null, created: boolean): AuthResult => {
    const account = accountOf(user);
    if (!account) return failed('failed');
    return { status: 'ok', account, userId: user.id, created, switched: before !== user.id };
  };

  return {
    kind: 'supabase',

    async current() {
      return accountOf((await client.auth.getSession()).data.session?.user);
    },

    async appleAvailable() {
      return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());
    },

    async withApple(intent) {
      let token: string | null;
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        token = credential.identityToken;
      } catch (error) {
        return failed(codeOf(error) === 'ERR_REQUEST_CANCELED' ? 'cancelled' : 'failed');
      }
      if (!token) return failed('failed');

      const before = await currentUserId();

      if (intent === 'create' && before) {
        // Attach Apple to the anonymous user she already is.
        const linked = await client.auth.linkIdentity({ provider: 'apple', token });
        if (!linked.error && linked.data.user) return ok(linked.data.user, before, true);
        // This Apple Account already has one of our accounts: sign in to that instead.
        if (!TAKEN.has(codeOf(linked.error))) return failed('failed');
      }

      const signedIn = await client.auth.signInWithIdToken({ provider: 'apple', token });
      if (signedIn.error || !signedIn.data.user) return failed('failed');
      return ok(signedIn.data.user, before, false);
    },

    async sendEmail(email, intent) {
      if (intent === 'create') {
        // Attach the address to the anonymous user she already is.
        const { error } = await client.auth.updateUser(
          { email },
          { emailRedirectTo: redirectTo() },
        );
        if (!error) return { status: 'sent', intent: 'create' };
        if (!TAKEN.has(codeOf(error))) return { status: 'failed', reason: 'failed' };
        // The address already has an account: this is a sign-in.
      }

      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo() },
      });
      if (!error) return { status: 'sent', intent: 'sign_in' };
      return { status: 'failed', reason: MISSING.has(codeOf(error)) ? 'no_account' : 'failed' };
    },

    async verifyEmailCode(email, code, intent) {
      const before = await currentUserId();
      const { data, error } = await client.auth.verifyOtp({
        email,
        token: code,
        type: intent === 'create' ? 'email_change' : 'email',
      });
      if (error || !data.user) return failed('wrong_code');
      return ok(data.user, before, intent === 'create');
    },

    async verifyEmailLink(tokenHash, type) {
      const before = await currentUserId();
      const created = type === 'email_change';
      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: created ? 'email_change' : 'email',
      });
      if (error || !data.user) return failed('failed');
      return ok(data.user, before, created);
    },

    async signOut() {
      await client.auth.signOut();
      return ensureSession().catch(() => null);
    },

    async deleteAccount() {
      const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
      if (error) return { deleted: false, userId: await currentUserId() };
      // The user no longer exists on the server; drop the session here too.
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      return { deleted: true, userId: await ensureSession().catch(() => null) };
    },
  };
}
