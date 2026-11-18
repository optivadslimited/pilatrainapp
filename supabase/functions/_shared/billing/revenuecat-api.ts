// RevenueCat's REST API, as far as the Edge Functions use it. Needs the
// project's secret API key (REVENUECAT_SECRET_KEY), which lives in the
// functions' secrets and never in the app.
//
// NOT YET RUN AGAINST REVENUECAT.
import type { RcSubscriber } from './subscriber.ts';

const BASE = 'https://api.revenuecat.com/v1/subscribers';

/** RevenueCat's current record of a customer, or `null` if it cannot be had. */
export async function fetchSubscriber(
  userId: string,
  secretKey: string | undefined,
): Promise<RcSubscriber | null> {
  if (!secretKey) return null;
  try {
    const response = await fetch(`${BASE}/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    return response.ok ? ((await response.json()) as RcSubscriber) : null;
  } catch {
    return null;
  }
}

/** Removes a customer and their purchase history from RevenueCat. */
export async function deleteSubscriber(
  userId: string,
  secretKey: string | undefined,
): Promise<boolean> {
  if (!secretKey) return false;
  try {
    const response = await fetch(`${BASE}/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
