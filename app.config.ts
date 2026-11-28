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

/**
 * Attribution (AppsFlyer) is switched on only when its dev key and the app's
 * Apple ID are present at build time. A build without them starts no
 * tracking, declares none in its privacy manifest and never shows the
 * tracking permission prompt.
 */
const attribution = Boolean(
  process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY && process.env.EXPO_PUBLIC_APPSFLYER_APP_ID,
);

/** Where SKAdNetwork and AdAttributionKit send a copy of their postbacks. */
const ATTRIBUTION_REPORTS = 'https://appsflyer-skadnetwork.com/';

/** The wording of Apple's tracking prompt. It has to be true. */
const TRACKING_PROMPT = `This lets ${brand.name} see which adverts bring people to the app. Your answers and anything about your health are never shared with advertisers.`;

/** Sentry's build step (source maps) runs only when its project is known. */
const sentry = Boolean(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

type CollectedData = {
  NSPrivacyCollectedDataType: string;
  NSPrivacyCollectedDataTypeLinked: boolean;
  NSPrivacyCollectedDataTypeTracking: boolean;
  NSPrivacyCollectedDataTypePurposes: string[];
};

const FUNCTIONALITY = 'NSPrivacyCollectedDataTypePurposeAppFunctionality';
const ANALYTICS = 'NSPrivacyCollectedDataTypePurposeAnalytics';
const ADVERTISING = 'NSPrivacyCollectedDataTypePurposeDeveloperAdvertising';
const THIRD_PARTY_ADVERTISING = 'NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising';

const collected = (
  type: string,
  purposes: string[],
  tracking = false,
  linked = true,
): CollectedData => ({
  NSPrivacyCollectedDataType: `NSPrivacyCollectedDataType${type}`,
  NSPrivacyCollectedDataTypeLinked: linked,
  NSPrivacyCollectedDataTypeTracking: tracking,
  NSPrivacyCollectedDataTypePurposes: purposes,
});

/**
 * The privacy manifest: what the app collects and why. It must say the same
 * as the App Store privacy labels, which are written out in
 * docs/privacy-labels.md. Change one, change the other.
 *
 * Health answers (pregnancy, injury, pain) are collected to build her plan
 * and go to our own database only: never an ad platform. Analytics gets one
 * yes-or-no flag ("anything to work around?"), so Health lists Analytics too.
 * Pregnancy is "sensitive info" in Apple's terms, so that is declared as well.
 */
const privacyManifest = {
  NSPrivacyTracking: attribution,
  // The AppsFlyer SDK declares its own tracking domains in its own manifest; the
  // app adds none. Check Xcode's privacy report on the first build.
  NSPrivacyTrackingDomains: [] as string[],
  NSPrivacyCollectedDataTypes: [
    collected('EmailAddress', [FUNCTIONALITY]),
    collected('Name', [FUNCTIONALITY]),
    collected('UserID', [FUNCTIONALITY, ANALYTICS], attribution),
    collected('Health', [FUNCTIONALITY, ANALYTICS]),
    collected('SensitiveInfo', [FUNCTIONALITY]),
    collected('Fitness', [FUNCTIONALITY, ANALYTICS]),
    collected(
      'PurchaseHistory',
      attribution ? [FUNCTIONALITY, ANALYTICS, ADVERTISING] : [FUNCTIONALITY, ANALYTICS],
      attribution,
    ),
    collected('ProductInteraction', [ANALYTICS]),
    collected('CrashData', [FUNCTIONALITY]),
    // Sentry's device context alongside a crash.
    collected('OtherDiagnosticData', [FUNCTIONALITY]),
    // RevenueCat keeps device identifiers with the subscription; AppsFlyer, when
    // on, uses them (and the advertising ID, if she allows it) for attribution.
    collected(
      'DeviceID',
      attribution ? [FUNCTIONALITY, ADVERTISING, THIRD_PARTY_ADVERTISING] : [FUNCTIONALITY],
      attribution,
    ),
  ],
  // Required-reason APIs used by the app and React Native themselves.
  NSPrivacyAccessedAPITypes: [
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
      NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
      NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
      NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
      NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
    },
  ],
};

/** Paper. Kept in step with src/theme/colors.ts so the native splash matches the first frame. */
const PAPER = '#F7F4EE';

// The Expo project the build belongs to. Set in src/config/brand.ts; the
// environment variable is only for building against a different project.
const projectId = process.env.EAS_PROJECT_ID || brand.expoProjectId;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `${brand.displayName}${variant.nameSuffix}`,
  slug: brand.slug,
  scheme: brand.scheme,
  version: '1.0.0',
  // EAS Update: JavaScript-only fixes reach installed builds on the same channel
  // (development, staging or production, set per profile in eas.json). An update
  // only reaches builds of the same app version, so a change to native code or to
  // the version number always needs a new build.
  runtimeVersion: { policy: 'appVersion' },
  updates: { url: `https://u.expo.dev/${projectId}` },
  // All orientations are allowed here so that the player can turn to landscape.
  // Every other screen is held in portrait by the root layout (src/app/_layout.tsx).
  orientation: 'default',
  // Light appearance at launch. The tokens in src/theme are ready for dark.
  userInterfaceStyle: 'light',
  backgroundColor: PAPER,
  // The owner chose this icon on 21 November 2026: a figure in a shoulder bridge on a clay mat
  // line. assets/brand/app-icon.svg is the drawing it is exported from (1024 × 1024, no transparency).
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: `${brand.bundleId}${variant.bundleSuffix}`,
    supportsTablet: false,
    // Adds the Sign in with Apple entitlement.
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
    privacyManifests: privacyManifest,
    infoPlist: {
      // The wording of Apple's tracking prompt. It is always declared, because the
      // AppsFlyer library is always in the build and an upload without it is
      // rejected. The prompt itself is only ever shown when attribution is switched
      // on, and then only after her first completed class. It has to be true.
      NSUserTrackingUsageDescription: TRACKING_PROMPT,
      ...(attribution
        ? {
            NSAdvertisingAttributionReportEndpoint: ATTRIBUTION_REPORTS,
            AttributionCopyEndpoint: ATTRIBUTION_REPORTS,
          }
        : {}),
    },
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
    // Attribution. Strict mode stays off: with her permission, the advertising ID
    // is what lets an advert be matched to an install.
    ['react-native-appsflyer', { shouldUseStrictMode: false }],
    // Apple's tracking prompt, shown by src/lib/attribution.ts after her first class.
    ['expo-tracking-transparency', { userTrackingPermission: TRACKING_PROMPT }],
    ...(sentry
      ? ([
          [
            '@sentry/react-native/expo',
            { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT },
          ],
        ] as [string, Record<string, unknown>][])
      : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv,
    eas: { projectId },
  },
});
