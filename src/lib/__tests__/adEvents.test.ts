import { adEventFor } from '../adEvents';
import type { AnalyticsEventName, AnalyticsEvents } from '../analytics';

/**
 * Every event the app can send, with properties as full as they ever are.
 * Typed against `AnalyticsEvents`, so adding an event without adding it here
 * does not compile, and the rule below is then checked against it.
 */
const everyEvent: { [K in AnalyticsEventName]: AnalyticsEvents[K] } = {
  app_opened: undefined,
  onboarding_started: undefined,
  quiz_step_completed: { step: 'work_around', answer: true },
  safety_gate_shown: undefined,
  safety_gate_choice: { choice: 'cleared' },
  plan_built: { days: 3, minutes: 20, goal: 'posture' },
  plan_preview_viewed: undefined,
  paywall_viewed: { placement: 'plan_preview', variant: 'quarterly' },
  plan_selected: { product: 'pilatrain_annual' },
  trial_started: { product: 'pilatrain_quarterly' },
  subscription_started: { product: 'pilatrain_monthly' },
  purchase_failed: { reason: 'offline' },
  purchase_cancelled: undefined,
  account_created: { method: 'apple' },
  push_prompt_shown: undefined,
  push_enabled: undefined,
  class_started: { class: 'start-here', source: 'today' },
  class_progress_25: { class: 'start-here' },
  class_progress_50: { class: 'start-here' },
  class_progress_75: { class: 'start-here' },
  class_completed: { class: 'start-here' },
  easier_option_opened: { class: 'start-here' },
  feedback_submitted: { rating: 'right' },
  session_moved: undefined,
  plan_adjusted: undefined,
  account_deleted: undefined,
};

const names = Object.keys(everyEvent) as AnalyticsEventName[];
const sent = names.flatMap((name) => {
  const event = adEventFor(name, everyEvent[name] as Record<string, string> | undefined);
  return event ? [[name, event] as const] : [];
});

describe('what ad platforms receive', () => {
  it('is a trial start and a purchase, and nothing else', () => {
    expect(sent.map(([name]) => name)).toEqual(['trial_started', 'subscription_started']);
    expect(sent.map(([, event]) => event.eventName)).toEqual(['af_start_trial', 'af_subscribe']);
  });

  it('carries the product she chose and no other property', () => {
    for (const [, event] of sent) {
      expect(Object.keys(event)).toEqual(['eventName', 'eventValues']);
      expect(Object.keys(event.eventValues)).toEqual(['af_content_id']);
    }
    expect(sent[0][1].eventValues.af_content_id).toBe('pilatrain_quarterly');
  });

  it('never receives anything from the quiz, the safety gate or her classes', () => {
    for (const name of names) {
      if (name === 'trial_started' || name === 'subscription_started') continue;
      expect(adEventFor(name, everyEvent[name] as Record<string, string> | undefined)).toBeNull();
    }
    // Even if a health answer were somehow attached to a purchase event, it would not be passed on.
    const leaked = adEventFor('trial_started', {
      product: 'pilatrain_quarterly',
      work_around: 'pregnant_postpartum',
    });
    expect(JSON.stringify(leaked)).not.toContain('pregnant');
  });
});
