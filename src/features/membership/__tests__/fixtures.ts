import { planOf, type StoreProduct } from '../products';
import { formatMoney } from '../pricing';
import preview from '../data/previewProducts.json';

/**
 * The products as the StoreKit test configuration defines them, priced in
 * US dollars and written the way a US device writes money. The tests that
 * quote the brief's figures read them from here, never from a typed string.
 */
export const usProducts: StoreProduct[] = preview.map((item) => ({
  productId: item.productId,
  plan: planOf(item.productId)!,
  price: item.price,
  priceString: formatMoney(item.price, item.currencyCode, 'en-US'),
  pricePerMonthString: formatMoney(item.price / item.periodMonths, item.currencyCode, 'en-US'),
  currencyCode: item.currencyCode,
  periodMonths: item.periodMonths,
  trialDays: item.trialDays,
}));

export const product = (plan: StoreProduct['plan']): StoreProduct =>
  usProducts.find((item) => item.plan === plan)!;
