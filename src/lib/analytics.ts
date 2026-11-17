/**
 * Analytics events. The names are fixed by the product spec and must be used
 * exactly, so the funnel reads the same in every tool. `track` is typed: an
 * event that is not in `AnalyticsEvents` does not compile.
 *
 * Privacy rule: answers about pregnancy, injury or pain never leave our own
 * database. Analytics receives a single yes-or-no flag instead (see
 * `quizAnswerForAnalytics`). Ad platforms receive only trial and purchase
 * events; that filtering lives with the attribution sink (milestone 4).
 *
 * Until PostHog is wired in (milestone 4) events go to the console in
 * development and nowhere in production.
 */
export type AnalyticsEvents = {
  // Onboarding
  app_opened: undefined;
  onboarding_started: undefined;
  quiz_step_completed: { step: string; answer: string | number | boolean };
  safety_gate_shown: undefined;
  safety_gate_choice: { choice: 'cleared' | 'check_first' };
  plan_built: { days: number; minutes: number; goal: string };
  plan_preview_viewed: undefined;

  // Money
  paywall_viewed: { placement: string; variant: string };
  plan_selected: { product: string };
  trial_started: { product: string };
  purchase_failed: { reason: string };
  purchase_cancelled: undefined;
  account_created: { method: 'apple' | 'email' };

  // Use
  push_prompt_shown: undefined;
  push_enabled: undefined;
  class_started: { class: string; source: string };
  class_progress_25: { class: string };
  class_progress_50: { class: string };
  class_progress_75: { class: string };
  class_completed: { class: string };
  easier_option_opened: { class: string };
  feedback_submitted: { rating: 'easy' | 'right' | 'hard' };
  session_moved: undefined;
  plan_adjusted: undefined;
  account_deleted: undefined;
};

export type AnalyticsEventName = keyof AnalyticsEvents;

export type AnalyticsSink = (
  name: AnalyticsEventName,
  properties: Record<string, string | number | boolean> | undefined,
) => void;

const sinks = new Set<AnalyticsSink>();

/** Register a destination for events. Returns a function that removes it. */
export function addAnalyticsSink(sink: AnalyticsSink): () => void {
  sinks.add(sink);
  return () => {
    sinks.delete(sink);
  };
}

type TrackArgs<K extends AnalyticsEventName> = AnalyticsEvents[K] extends undefined
  ? [name: K]
  : [name: K, properties: AnalyticsEvents[K]];

export function track<K extends AnalyticsEventName>(...args: TrackArgs<K>): void {
  const [name, properties] = args;
  for (const sink of sinks) {
    try {
      sink(name, properties as Record<string, string | number | boolean> | undefined);
    } catch {
      // Analytics must never break the app.
    }
  }
}

/** Quiz steps whose answers are health information or personal data. */
const HEALTH_STEPS = new Set(['work_around']);
const PERSONAL_STEPS = new Set(['first_name']);

/**
 * Reduce a quiz answer to what analytics is allowed to see.
 *
 *  - `work_around` (pain, pregnancy, injury): a single yes-or-no flag. `true`
 *    if she chose anything other than "None". Which thing is never sent.
 *  - `first_name`: whether she gave one. The name is never sent.
 *  - Everything else: the answer itself, with lists joined into one string.
 */
export function quizAnswerForAnalytics(
  step: string,
  answer: string | number | readonly (string | number)[] | undefined,
): string | number | boolean {
  if (HEALTH_STEPS.has(step)) {
    const list = Array.isArray(answer) ? answer : [];
    return list.some((value) => value !== 'none');
  }
  if (PERSONAL_STEPS.has(step)) {
    return typeof answer === 'string' && answer.trim().length > 0;
  }
  if (Array.isArray(answer)) return answer.join(',');
  if (typeof answer === 'string' || typeof answer === 'number') return answer;
  return '';
}

// In development, events are printed so the funnel can be read in the console.
if (__DEV__ && process.env.NODE_ENV !== 'test') {
  addAnalyticsSink((name, properties) => {
    console.log(`[analytics] ${name}`, properties ?? '');
  });
}
