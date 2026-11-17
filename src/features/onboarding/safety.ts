import type { WorkAround } from './questions';

/**
 * The safety gate.
 *
 * If she picks "Pregnant or postpartum" or "Recent injury or surgery" she sees
 * a full screen asking her to check with her doctor or physiotherapist first.
 *  - not_shown: not needed, or not reached yet.
 *  - cleared: she said she has been cleared to exercise (gentle track).
 *  - checking_first: she said she will check first (holding screen).
 */
export type GateState = 'not_shown' | 'cleared' | 'checking_first';

const GATED: readonly WorkAround[] = ['pregnant_postpartum', 'recent_injury_surgery'];

/** True when her answers call for the safety gate. */
export function needsSafetyGate(workAround: readonly WorkAround[] | undefined): boolean {
  return (workAround ?? []).some((item) => GATED.includes(item));
}

/**
 * The gentle track: she picked one of the two gated answers and has told us
 * she is cleared to exercise. The plan engine caps intensity at 2 and prefers
 * mobility and foundations when this is true.
 */
export function isGentle(state: {
  answers: { workAround?: readonly WorkAround[] };
  gate: GateState;
}): boolean {
  return needsSafetyGate(state.answers.workAround) && state.gate === 'cleared';
}
