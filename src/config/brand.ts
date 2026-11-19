/**
 * The one file to edit for a rename.
 *
 * The app name, the name under the home-screen icon, the wordmark, the bundle
 * identifier and every owner-supplied fact live here and nowhere else.
 * `app.config.ts` and the app itself both read from this file, so changing
 * `name` below renames the product everywhere.
 *
 * Keep this file free of React Native imports: it is also loaded by Node when
 * Expo evaluates `app.config.ts`.
 *
 * Values in [SQUARE BRACKETS] are fill-ins the owner still has to supply.
 * They render exactly as written so they are impossible to miss.
 */
export const brand = {
  /** Product name: one word, capital P. TODO(owner): trademark check before launch. */
  name: 'Pilatrain',
  /** Shown under the home-screen icon. */
  displayName: 'Pilatrain',
  /** The text set in Fraunces wherever the logo appears. */
  wordmark: 'Pilatrain',
  /** URL scheme for deep links (lowercase, no spaces). */
  scheme: 'pilatrain',
  /** Expo project slug. */
  slug: 'pilatrain',

  // Confirmed by the owner on 19 November 2026. It cannot change after the first App Store upload.
  bundleId: 'com.pilatrain.app',

  domain: 'pilatrain.com',
  urls: {
    site: 'https://pilatrain.com',
    terms: 'https://pilatrain.com/terms',
    privacy: 'https://pilatrain.com/privacy',
    healthDisclaimer: 'https://pilatrain.com/health-disclaimer',
  },

  /**
   * In-app purchase identifiers, exactly as created in App Store Connect and
   * RevenueCat. A product ID can never be reused once it exists, so a rename
   * of the app leaves these as they are.
   */
  store: {
    /** RevenueCat entitlement that means "member". */
    entitlement: 'member',
    /** App Store Connect subscription group. */
    subscriptionGroup: 'Pilatrain Membership',
    products: {
      annual: 'pilatrain_annual',
      quarterly: 'pilatrain_quarterly',
      monthly: 'pilatrain_monthly',
    },
  },

  // Confirmed by the owner on 19 November 2026.
  supportEmail: 'hello@pilatrain.com',

  company: {
    legalName: 'Optivads Limited',
  },

  instructor: {
    // TODO(owner): instructor's name.
    name: '[NAME]',
    // TODO(owner): instructor's credential, e.g. the certifying body and level.
    credential: '[CREDENTIAL]',
  },
} as const;

export type Brand = typeof brand;
