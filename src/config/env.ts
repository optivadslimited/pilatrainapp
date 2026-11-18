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

  // TODO(owner): one sample video to stand in for all sixteen classes until the
  // real ones are on Mux. The default is Apple's public test stream, chosen
  // because it carries captions. Any HLS address works.
  sampleVideoUrl:
    read(process.env.EXPO_PUBLIC_SAMPLE_VIDEO_URL) ||
    'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  // The web preview cannot play HLS, so it gets a short MP4 (a five-second CC0 clip).
  sampleVideoWebUrl:
    read(process.env.EXPO_PUBLIC_SAMPLE_VIDEO_WEB_URL) ||
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',

  // TODO(owner): PostHog project key and host (EU or US cloud).
  posthogKey: read(process.env.EXPO_PUBLIC_POSTHOG_KEY),
  posthogHost: read(process.env.EXPO_PUBLIC_POSTHOG_HOST),

  // TODO(owner): Sentry DSN.
  sentryDsn: read(process.env.EXPO_PUBLIC_SENTRY_DSN),

  // Attribution: Adjust. TODO(owner): the app token, and the token of each of
  // the two events created in the Adjust dashboard (docs/attribution.md).
  adjustAppToken: read(process.env.EXPO_PUBLIC_ADJUST_APP_TOKEN),
  adjustTrialEventToken: read(process.env.EXPO_PUBLIC_ADJUST_TRIAL_EVENT_TOKEN),
  adjustPurchaseEventToken: read(process.env.EXPO_PUBLIC_ADJUST_PURCHASE_EVENT_TOKEN),
} as const;

export type Env = typeof env;
