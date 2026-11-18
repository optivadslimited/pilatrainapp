import { FOCUSES, type Focus, type Goal, type PlanProfile, type Theme } from './domain.ts';
import { themeOf } from './eligibility.ts';

/**
 * Rule 4. Weight the mix by goal.
 *
 *   Core strength: half core.
 *   Posture:       core and mobility.
 *   Stiffness:     half mobility.
 *   Tone:          full body and core.
 *   Routine:       an even mix.
 *
 * Each row is the share of her sessions given to each focus and sums to 1.
 * ASSUMPTION: the brief fixes the headline share ("half core"); how the rest
 * is divided is our choice.
 */
const GOAL_MIX: Record<Goal, Record<Focus, number>> = {
  core_strength: { core: 0.5, full_body: 0.2, mobility: 0.1, foundations: 0.1, express: 0.1 },
  posture: { core: 0.4, mobility: 0.4, foundations: 0.1, full_body: 0.1, express: 0 },
  mobility: { mobility: 0.5, foundations: 0.2, core: 0.1, full_body: 0.1, express: 0.1 },
  tone: { full_body: 0.4, core: 0.4, mobility: 0.1, express: 0.1, foundations: 0 },
  routine: { foundations: 0.2, core: 0.2, full_body: 0.2, mobility: 0.2, express: 0.2 },
};

/**
 * Rule 1, second half. On the gentle track mobility and foundations are
 * preferred: half of her mix is given over to them, split evenly, and the
 * goal's own mix fills the other half.
 */
export function focusWeights(profile: Pick<PlanProfile, 'goal' | 'gentle'>): Record<Focus, number> {
  const mix = GOAL_MIX[profile.goal];
  if (!profile.gentle) return { ...mix };

  const weights = {} as Record<Focus, number>;
  for (const focus of FOCUSES) {
    const gentleShare = focus === 'mobility' || focus === 'foundations' ? 0.25 : 0;
    weights[focus] = mix[focus] * 0.5 + gentleShare;
  }
  return weights;
}

/** The focuses in the order her goal prefers them, most wanted first. */
export function focusPreference(profile: Pick<PlanProfile, 'goal' | 'gentle'>): Focus[] {
  const weights = focusWeights(profile);
  return [...FOCUSES].sort(
    (a, b) => weights[b] - weights[a] || FOCUSES.indexOf(a) - FOCUSES.indexOf(b),
  );
}

/**
 * Share `total` whole sessions between the focuses in proportion to `weights`
 * (largest-remainder method). The counts always add up to `total`.
 */
export function apportion(total: number, weights: Record<Focus, number>): Record<Focus, number> {
  const sum = FOCUSES.reduce((acc, focus) => acc + Math.max(0, weights[focus]), 0);
  const counts = {} as Record<Focus, number>;
  if (total <= 0 || sum <= 0) {
    for (const focus of FOCUSES) counts[focus] = 0;
    if (total > 0) counts[FOCUSES[0]] = total;
    return counts;
  }

  const exact = FOCUSES.map((focus) => (Math.max(0, weights[focus]) / sum) * total);
  let given = 0;
  FOCUSES.forEach((focus, i) => {
    counts[focus] = Math.floor(exact[i] + 1e-9);
    given += counts[focus];
  });

  // Hand the leftovers to the largest remainders. Ties go to the earlier focus.
  const byRemainder = FOCUSES.map((focus, i) => ({
    focus,
    remainder: exact[i] - counts[focus],
    i,
  })).sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (let k = 0; given < total; k++, given++) counts[byRemainder[k % byRemainder.length].focus]++;

  return counts;
}

/** Which focuses suit each week's theme best. Only used to break ties. */
const THEME_AFFINITY: Record<Theme, readonly Focus[]> = {
  foundations: ['foundations', 'mobility', 'core', 'express', 'full_body'],
  build: ['core', 'full_body', 'express', 'foundations', 'mobility'],
  strengthen: ['core', 'full_body', 'express', 'mobility', 'foundations'],
  flow: ['full_body', 'mobility', 'express', 'core', 'foundations'],
};

export type FocusSlot = {
  week: number;
  /** A focus already decided for this slot: a kept session, or a rule (rule 5's mobility). */
  fixed?: Focus;
};

/**
 * Decide the focus of every session.
 *
 * Slots with a `fixed` focus keep it and count towards the mix. The rest are
 * shared out so the whole plan matches the goal's mix as closely as whole
 * sessions allow, and spread evenly through the weeks so she never gets a run
 * of one thing (smooth weighted round-robin).
 */
export function planFocuses(slots: readonly FocusSlot[], weights: Record<Focus, number>): Focus[] {
  const target = apportion(slots.length, weights);

  const fixedCount = {} as Record<Focus, number>;
  for (const focus of FOCUSES) fixedCount[focus] = 0;
  for (const slot of slots) if (slot.fixed) fixedCount[slot.fixed]++;

  const freeTotal = slots.filter((slot) => !slot.fixed).length;

  // What each focus is still owed once the fixed slots are counted.
  const remaining = {} as Record<Focus, number>;
  for (const focus of FOCUSES) remaining[focus] = Math.max(0, target[focus] - fixedCount[focus]);

  // The fixed slots can take more of a focus than the mix gave it (rule 5's
  // mobility close often does). The difference comes out of what the goal
  // wants least, so the headline share ("half core") stays whole.
  let excess = FOCUSES.reduce((sum, focus) => sum + remaining[focus], 0) - freeTotal;
  for (; excess > 0; excess--) {
    const least = FOCUSES.filter((focus) => remaining[focus] > 0).sort(
      (x, y) =>
        weights[x] - weights[y] ||
        remaining[y] - remaining[x] ||
        FOCUSES.indexOf(y) - FOCUSES.indexOf(x),
    )[0];
    remaining[least]--;
  }

  const credit = {} as Record<Focus, number>;
  for (const focus of FOCUSES) credit[focus] = 0;
  const share = { ...remaining };

  return slots.map((slot) => {
    if (slot.fixed) return slot.fixed;

    const affinity = THEME_AFFINITY[themeOf(slot.week)];
    for (const focus of FOCUSES) credit[focus] += share[focus];

    const pick =
      FOCUSES.filter((focus) => remaining[focus] > 0).sort(
        (a, b) => credit[b] - credit[a] || affinity.indexOf(a) - affinity.indexOf(b),
      )[0] ?? FOCUSES[0];

    credit[pick] -= freeTotal;
    remaining[pick]--;
    return pick;
  });
}
