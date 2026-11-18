// Lets this file import other TypeScript files (src/config/brand.ts). See the Expo docs on app.config.ts.
import 'tsx/cjs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { brand } from './src/config/brand';

/**
 * Three environments, chosen with APP_ENV (set per build profile in eas.json):
 * development, staging and production. Development and staging get their own
 * bundle ID and name so all three can sit side by side on one phone.
 */
type AppEnv = 'development' | 'staging' | 'production';

const appEnv = (process.env.APP_ENV ?? 'development') as AppEnv;

const variants: Record<AppEnv, { nameSuffix: string; bundleSuffix: string }> = {
  development: { nameSuffix: ' Dev', bundleSuffix: '.dev' },
  staging: { nameSuffix: ' Staging', bundleSuffix: '.staging' },
  production: { nameSuffix: '', bundleSuffix: '' },
};

const variant = variants[appEnv] ?? variants.development;

/** Paper. Kept in step with src/theme/colors.ts so the native splash matches the first frame. */
const PAPER = '#F7F4EE';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `${brand.displayName}${variant.nameSuffix}`,
  slug: brand.slug,
  scheme: brand.scheme,
  version: '1.0.0',
  // All orientations are allowed here so that the player can turn to landscape.
  // Every other screen is held in portrait by the root layout (src/app/_layout.tsx).
  orientation: 'default',
  // Light appearance at launch. The tokens in src/theme are ready for dark.
  userInterfaceStyle: 'light',
  backgroundColor: PAPER,
  // TODO(owner): final app icon artwork (1024 × 1024, no transparency). This is a placeholder.
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: `${brand.bundleId}${variant.bundleSuffix}`,
    supportsTablet: false,
    // Adds the Sign in with Apple entitlement.
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
  },
  web: {
    // Web is only a development preview of the screens. The product is iPhone only.
    output: 'single',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        // A plain Paper screen. The wordmark fades in from JavaScript (src/app/index.tsx).
        backgroundColor: PAPER,
        image: './assets/images/splash-blank.png',
        imageWidth: 1,
      },
    ],
    ['expo-build-properties', { ios: { deploymentTarget: '17.0' } }],
    'expo-notifications',
    'expo-apple-authentication',
    // Picture-in-picture is off and classes do not play in the background.
    ['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv,
    // TODO(owner): run `eas init` once the Expo account exists; it writes the project ID here.
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
