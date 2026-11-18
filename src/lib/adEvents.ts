import type { AnalyticsEventName } from './analytics';

/**
 * What an ad platform is allowed to hear about. Two things, and nothing else:
 * a trial started, and a subscription bought.
 *
 * Every other event, and every property of every event except the product
 * she chose, stays out. In particular nothing from the quiz ever reaches an
 * ad platform: not her goal, not her days, and never anything about
 * pregnancy, injury or pain.
 *
 * This is a plain function so that the rule is a test, not a habit. It knows
 * nothing about any attribution provider; src/lib/attribution.ts turns what
 * it lets through into that provider's own events.
 */
export type AdEvent = { kind: 'trial' | 'purchase'; product: string };

const AD_EVENTS: Partial<Record<AnalyticsEventName, AdEvent['kind']>> = {
  trial_started: 'trial',
  subscription_started: 'purchase',
};

export function adEventFor(
  name: AnalyticsEventName,
  properties: Record<string, string | number | boolean> | undefined,
): AdEvent | null {
  const kind = AD_EVENTS[name];
  if (!kind) return null;
  return { kind, product: String(properties?.product ?? '') };
}
