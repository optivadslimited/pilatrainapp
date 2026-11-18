/** A real account: she can sign back in to it. An anonymous session is not one. */
export type Account = {
  method: 'apple' | 'email';
  /** `null` when Apple hides it, or when she signed in with Apple and gave none. */
  email: string | null;
};

/** `create`: keep the plan she has just built. `sign_in`: fetch the one she already has. */
export type AuthIntent = 'create' | 'sign_in';

export type AuthFailure = 'cancelled' | 'no_account' | 'wrong_code' | 'unavailable' | 'failed';

export type AuthResult =
  | {
      status: 'ok';
      account: Account;
      /** Her user ID now. `null` in the preview. */
      userId: string | null;
      /** A new account was made (as opposed to signing in to one that existed). */
      created: boolean;
      /** She is now a different user from the one she was a moment ago. */
      switched: boolean;
    }
  | { status: 'failed'; reason: AuthFailure };

export type SendResult =
  | {
      status: 'sent';
      /** The email already had an account, so this became a sign-in. */
      intent: AuthIntent;
    }
  | { status: 'failed'; reason: AuthFailure };

/**
 * Accounts, as the app sees them. Supabase on a phone; a stand-in in
 * development when there is no backend.
 */
export interface AuthProvider {
  readonly kind: 'supabase' | 'preview' | 'unavailable';
  /** Her account, or `null` while she is anonymous. */
  current(): Promise<Account | null>;
  appleAvailable(): Promise<boolean>;
  withApple(intent: AuthIntent): Promise<AuthResult>;
  /** Emails her a link, with a 6-digit code as a fallback. */
  sendEmail(email: string, intent: AuthIntent): Promise<SendResult>;
  verifyEmailCode(email: string, code: string, intent: AuthIntent): Promise<AuthResult>;
  /** She opened the emailed link on this phone. */
  verifyEmailLink(tokenHash: string, type: string): Promise<AuthResult>;
  /** Ends the session. A new anonymous one begins; its user ID is returned (`null` in the preview). */
  signOut(): Promise<string | null>;
  /** Deletes her account and everything in it, on the server. Then as for signing out. */
  deleteAccount(): Promise<{ deleted: boolean; userId: string | null }>;
}
