/**
 * Turns the StoreKit test configuration (storekit/Pilatrain.storekit) into
 * the product list the app's preview store reads in development:
 *
 *   src/features/membership/data/previewProducts.json
 *
 *   npm run storekit:build     after editing the .storekit file
 *   npm run storekit:check     fails if the two have drifted (also run by the tests)
 *
 * The .storekit file is what Xcode uses to test purchases without App Store
 * Connect. It is the only place a price is written down, and it never ships:
 * the preview store that reads this list is compiled out of production
 * builds, where prices come from StoreKit through RevenueCat.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'storekit/Pilatrain.storekit');
const OUT = join(root, 'src/features/membership/data/previewProducts.json');

type Subscription = {
  productID: string;
  displayPrice: string;
  recurringSubscriptionPeriod: string;
  introductoryOffer?: { paymentMode: string; subscriptionPeriod: string; numberOfPeriods: number };
};

const MONTHS: Record<string, number> = { P1M: 1, P3M: 3, P1Y: 12 };
const DAYS: Record<string, number> = { P3D: 3, P1W: 7, P2W: 14, P1M: 30 };

export function build(): string {
  const config = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const currency = config.settings?._storefront === 'USA' ? 'USD' : 'USD';

  const products = config.subscriptionGroups.flatMap((group: { subscriptions: Subscription[] }) =>
    group.subscriptions.map((item) => {
      const periodMonths = MONTHS[item.recurringSubscriptionPeriod];
      if (!periodMonths)
        throw new Error(
          `${item.productID}: unsupported period ${item.recurringSubscriptionPeriod}`,
        );
      const intro = item.introductoryOffer;
      const trialDays =
        intro?.paymentMode === 'free'
          ? (DAYS[intro.subscriptionPeriod] ?? 0) * intro.numberOfPeriods
          : null;
      return {
        productId: item.productID,
        price: Number(item.displayPrice),
        currencyCode: currency,
        periodMonths,
        trialDays: trialDays || null,
      };
    }),
  );

  return JSON.stringify(products, null, 2) + '\n';
}

function main() {
  const json = build();
  if (process.argv.includes('--check')) {
    let current = '';
    try {
      current = readFileSync(OUT, 'utf8');
    } catch {
      // Missing counts as out of date.
    }
    if (current !== json) {
      console.error('Out of date: previewProducts.json\nRun: npm run storekit:build');
      process.exit(1);
    }
    console.log('Preview products match the StoreKit configuration.');
    return;
  }
  writeFileSync(OUT, json);
  console.log('Wrote previewProducts.json from the StoreKit configuration.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
