import { addDays } from './dates.ts';
import {
  MINUTES,
  WEEKS,
  type BuiltPlan,
  type ClassInfo,
  type ISODate,
  type PlanProfile,
  type Rating,
} from './domain.ts';
import { buildPlan } from './build.ts';
import { eligibleClasses, weekCap } from './eligibility.ts';
import type { Edge } from './fill.ts';

/**
 * Rule 8. Two "too hard" in a row lowers next week's intensity by one and adds
 * a foundations class. Two "too easy" raises intensity by one, or lengthens
 * sessions by one step if she is already at the top.
 *
 * Rule 10. On day 28 the next 28-day block is built, one step harder.
 */

/**
 * What her latest ratings ask for. Pass the ratings since the plan last
 * changed, oldest first, so one pair of ratings changes the plan only once.
 */
export function feedbackSignal(ratings: readonly Rating[]): 'lower' | 'raise' | null {
  if (ratings.length < 2) return null;
  const [previous, latest] = ratings.slice(-2);
  if (previous === 'hard' && latest === 'hard') return 'lower';
  if (previous === 'easy' && latest === 'easy') return 'raise';
  return null;
}

/**
 * Each week's cap as she would actually feel it: never above the most intense
 * class she is eligible for. Raising a cap past that changes nothing.
 */
function feltCaps(profile: PlanProfile, catalogue: readonly ClassInfo[]): number[] {
  const top = Math.max(1, ...eligibleClasses(catalogue, profile).map((cls) => cls.intensity));
  return WEEKS.map((week) => Math.min(weekCap(profile, week), top));
}

const sameCaps = (a: number[], b: number[]) => a.every((cap, i) => cap === b[i]);

export type ProfileChange = {
  profile: PlanProfile;
  /** What changed: the intensity, the session length, or nothing (she is at the limit). */
  change: 'intensity' | 'length' | 'none';
};

/**
 * One step harder: intensity up by one. If she is already at the top, so that
 * raising it would change nothing, sessions get one step longer instead
 * (10 → 20 → 30). At the top of both, nothing changes.
 */
export function harder(profile: PlanProfile, catalogue: readonly ClassInfo[]): ProfileChange {
  const raised = { ...profile, intensityShift: profile.intensityShift + 1 };
  if (!sameCaps(feltCaps(raised, catalogue), feltCaps(profile, catalogue))) {
    return { profile: raised, change: 'intensity' };
  }
  const longer = MINUTES[MINUTES.indexOf(profile.minutes) + 1];
  if (longer !== undefined) return { profile: { ...profile, minutes: longer }, change: 'length' };
  return { profile, change: 'none' };
}

/** One step easier: intensity down by one. Never below the gentlest classes. */
export function easier(profile: PlanProfile, catalogue: readonly ClassInfo[]): ProfileChange {
  const lowered = { ...profile, intensityShift: profile.intensityShift - 1 };
  if (!sameCaps(feltCaps(lowered, catalogue), feltCaps(profile, catalogue))) {
    return { profile: lowered, change: 'intensity' };
  }
  return { profile, change: 'none' };
}

export type NextBlockArgs = {
  previous: { block: number; endDate: ISODate; profile: PlanProfile };
  catalogue: readonly ClassInfo[];
  /** The last session of the previous block. */
  before?: Edge | null;
};

/**
 * Rule 10. The block that follows a finished one: it starts the day after,
 * keeps her days and goal, and is one step harder.
 * ASSUMPTION: "one step harder" means the same step as two "too easy" ratings.
 */
export function buildNextBlock({ previous, catalogue, before = null }: NextBlockArgs): BuiltPlan {
  return buildPlan({
    profile: harder(previous.profile, catalogue).profile,
    catalogue,
    from: addDays(previous.endDate, 1),
    block: previous.block + 1,
    before,
  });
}
