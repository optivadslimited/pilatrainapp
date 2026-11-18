import type { AnalyticsEventName } from './analytics';

/**
 * What an ad platform is allowed to hear about. Two events, and nothing else:
 * a trial started, and a subscription bought.
 *
 * Every other event, and every property of every event except the product
 * she chose, stays out. In particular nothing from the quiz ever reaches an
 * ad platform: not her goal, not her days, and never anything about
 * pregnancy, injury or pain.
 *
 * This is a plain function so that the rule is a test, not a habit.
 */
export type AdEvent = { eventName: string; eventValues: { af_content_id: string } };

const AD_EVENTS: Partial<Record<AnalyticsEventName, string>> = {
  trial_started: 'af_start_trial',
  subscription_started: 'af_subscribe',
};

export function adEventFor(
  name: AnalyticsEventName,
  properties: Record<string, string | number | boolean> | undefined,
): AdEvent | null {
  const eventName = AD_EVENTS[name];
  if (!eventName) return null;
  return { eventName, eventValues: { af_content_id: String(properties?.product ?? '') } };
}
