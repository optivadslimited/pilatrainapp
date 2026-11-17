/**
 * Every key the app needs, read from the environment. Nothing is typed in.
 *
 * Only EXPO_PUBLIC_* values reach the app bundle, and all of these are safe to
 * ship in a client: public project URLs and publishable keys. Server secrets
 * (Supabase service role, Mux signing key, RevenueCat webhook secret) belong to
 * the Edge Functions and never appear here.
 *
 * Until the owner supplies real keys the values are empty strings and each
 * service runs in its local or stubbed mode.
 */
export type AppEnv = 'development' | 'staging' | 'production';

const read = (value: string | undefined): string => value?.trim() ?? '';

const appEnv = (read(process.env.EXPO_PUBLIC_APP_ENV) || 'development') as AppEnv;

export const env = {
  appEnv,
  isProduction: appEnv === 'production',

  // TODO(owner): Supabase project URL and anon key, one project per environment.
  supabaseUrl: read(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: read(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),

  // TODO(owner): RevenueCat public iOS SDK key.
  revenueCatIosKey: read(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY),

  // TODO(owner): PostHog project key and host (EU or US cloud).
  posthogKey: read(process.env.EXPO_PUBLIC_POSTHOG_KEY),
  posthogHost: read(process.env.EXPO_PUBLIC_POSTHOG_HOST),

  // TODO(owner): Sentry DSN.
  sentryDsn: read(process.env.EXPO_PUBLIC_SENTRY_DSN),

  // TODO(owner): choose AppsFlyer or Adjust, then supply its key and the App Store app ID.
  attributionProvider: read(process.env.EXPO_PUBLIC_ATTRIBUTION_PROVIDER),
  attributionKey: read(process.env.EXPO_PUBLIC_ATTRIBUTION_KEY),
  appStoreId: read(process.env.EXPO_PUBLIC_APP_STORE_ID),
} as const;

export type Env = typeof env;
