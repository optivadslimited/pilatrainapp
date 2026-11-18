import { storage } from '@/lib/storage';

import type { Account, AuthProvider, AuthResult } from './types';

/**
 * A stand-in for accounts. Development builds only, and only when there is no
 * backend: it lets the create-account, sign-out and delete-account screens be
 * walked through in the web preview. Nothing is sent anywhere.
 *
 * Creating an account always works, and any six digits are accepted as the
 * emailed code. Signing in to an existing account always answers "no such
 * account", because with no server there is nothing to sign in to.
 */
const KEY = 'dev.account';

const read = (): Account | null => {
  try {
    const saved = storage.getString(KEY);
    return saved ? (JSON.parse(saved) as Account) : null;
  } catch {
    return null;
  }
};

const created = (account: Account): AuthResult => {
  storage.set(KEY, JSON.stringify(account));
  return { status: 'ok', account, userId: null, created: true, switched: false };
};

export const previewAuth: AuthProvider = {
  kind: 'preview',

  async current() {
    return read();
  },

  async appleAvailable() {
    return true;
  },

  async withApple(intent) {
    if (intent === 'sign_in') return { status: 'failed', reason: 'no_account' };
    return created({ method: 'apple', email: null });
  },

  async sendEmail(_email, intent) {
    if (intent === 'sign_in') return { status: 'failed', reason: 'no_account' };
    return { status: 'sent', intent };
  },

  async verifyEmailCode(email, code) {
    if (!/^\d{6}$/.test(code)) return { status: 'failed', reason: 'wrong_code' };
    return created({ method: 'email', email });
  },

  async verifyEmailLink() {
    return { status: 'failed', reason: 'unavailable' };
  },

  async signOut() {
    storage.remove(KEY);
  },

  async deleteAccount() {
    storage.remove(KEY);
    return true;
  },
};
