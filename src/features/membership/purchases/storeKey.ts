/**
 * Whether a RevenueCat key may be used in this build.
 *
 * RevenueCat has two kinds of public key. A platform key (the iOS one) talks
 * to StoreKit and is what ships. A Test Store key, which starts "test_",
 * sells pretend products with no App Store Connect behind them: useful before
 * Apple has approved anything, and for development after that.
 *
 * RevenueCat's SDK crashes on purpose if a Test Store key is used in a
 * release build, and TestFlight counts as one. So a Test Store key is only
 * ever handed to the SDK in a development build. In a release build it is
 * treated as no key at all: the paywall says membership is unavailable,
 * which is a mistake to fix, but not a crash on launch.
 */
export const isTestStoreKey = (key: string): boolean => key.startsWith('test_');

export function usableStoreKey(key: string, isDevelopmentBuild: boolean): string | null {
  if (!key) return null;
  if (isTestStoreKey(key) && !isDevelopmentBuild) return null;
  return key;
}
