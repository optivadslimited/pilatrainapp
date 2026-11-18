import { diffDays } from './dates.ts';
import {
  NoEligibleClassesError,
  START_HERE_SLUG,
  type ClassInfo,
  type Focus,
  type ISODate,
  type Intensity,
  type PlanProfile,
  type RelaxedRule,
  type Relaxation,
  type Week,
} from './domain.ts';
import { intensityCeiling, THEME_LEAN, themeOf, weekCap } from './eligibility.ts';
import { focusPreference } from './mix.ts';

/**
 * Choosing the classes. Given the dates of her sessions and the focus each one
 * should have, pick a class (or a 20 and a 10) for every session.
 *
 * Some rules are never broken:
 *   - only classes that passed rule 1 (level, equipment, work-arounds, gentle cap)
 *   - rule 5: never two intensity-3 sessions on consecutive days
 *
 * The rest are followed whenever the catalogue allows. When they cannot all
 * hold at once, they are given up in this order, gentlest first:
 *   mix (rule 4) → her session length (rule 2: "use a shorter one") →
 *   the week's theme cap (rule 3) → no class more than twice (rule 6) →
 *   a longer class than she asked for → the same class twice running (rule 6).
 * Each one given up is recorded in `relaxed`, so it can be seen and tested.
 */

/** One session's classes, in playing order. */
export type Bundle = {
  classes: ClassInfo[];
  intensity: Intensity;
  minutes: number;
};

export type FillSlot = { week: Week; date: ISODate } & (
  | {
      /** Already decided and not to be changed. Still counts for repeats and neighbours. */
      kind: 'kept';
      classes: ClassInfo[];
    }
  | {
      /** The "Start here" class that opens a first plan (rule 3). */
      kind: 'start';
    }
  | {
      kind: 'open';
      focus: Focus;
      /**
       * A focus fixed by a rule (rule 5's mobility, rule 8's foundations).
       * It is held even if that means repeating a class.
       */
      locked: boolean;
    }
);

/** The session just before this plan, so the first session does not repeat it. */
export type Edge = { date: ISODate; intensity: number; classIds: readonly string[] };

export type FillContext = {
  profile: PlanProfile;
  /** The classes that passed rule 1. */
  eligible: readonly ClassInfo[];
  before?: Edge | null;
};

const MAX_USES = 2;

export function bundleOf(classes: ClassInfo[]): Bundle {
  return {
    classes,
    intensity: Math.max(1, ...classes.map((cls) => cls.intensity)) as Intensity,
    minutes: classes.reduce((sum, cls) => sum + cls.lengthMin, 0),
  };
}

type Query = {
  /** Acceptable focuses, most wanted first. */
  focuses: readonly Focus[];
  /** `full`: her length exactly (a 30 may be a 20 and a 10). `short`: under it. `longer`: over it. */
  lengths: 'full' | 'short' | 'longer';
  cap: number;
  maxUses: number;
  backToBack: boolean;
};

/** Compares two lists of numbers or strings, element by element. */
function compareKeys(a: readonly (number | string)[], b: readonly (number | string)[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

export function fillSlots(
  slots: readonly FillSlot[],
  ctx: FillContext,
): { bundles: Bundle[]; relaxed: Relaxation[] } {
  const { profile, eligible, before = null } = ctx;
  if (eligible.length === 0) throw new NoEligibleClassesError();

  const length = profile.minutes;
  const ceiling = intensityCeiling(profile);
  const preference = focusPreference(profile);

  const assigned: (Bundle | null)[] = slots.map(() => null);
  const uses = new Map<string, number>();
  const lastUsed = new Map<string, number>();
  const relaxed: Relaxation[] = [];

  const usesOf = (cls: ClassInfo) => uses.get(cls.id) ?? 0;
  const lastUsedOf = (cls: ClassInfo) => lastUsed.get(cls.id) ?? -1;

  const assign = (index: number, bundle: Bundle) => {
    assigned[index] = bundle;
    for (const cls of bundle.classes) {
      uses.set(cls.id, usesOf(cls) + 1);
      lastUsed.set(cls.id, Math.max(lastUsedOf(cls), index));
    }
  };

  /** Classes in the sessions either side of this one. */
  const neighbourIds = (index: number): Set<string> => {
    const ids = new Set<string>();
    const previous =
      index > 0 ? assigned[index - 1]?.classes.map((cls) => cls.id) : before?.classIds;
    for (const id of previous ?? []) ids.add(id);
    for (const cls of assigned[index + 1]?.classes ?? []) ids.add(cls.id);
    return ids;
  };

  /** True if a session the day before or the day after is already intensity 3. */
  const nextToIntense = (date: ISODate): boolean => {
    if (before && before.intensity >= 3 && diffDays(before.date, date) === 1) return true;
    return assigned.some(
      (bundle, i) =>
        bundle !== null && bundle.intensity >= 3 && Math.abs(diffDays(slots[i].date, date)) === 1,
    );
  };

  const choose = (index: number, focus: Focus, locked: boolean): Bundle => {
    const slot = slots[index];
    const cap = weekCap(profile, slot.week);
    const lean = Math.min(cap, THEME_LEAN[themeOf(slot.week)]);
    const blocked = neighbourIds(index);
    const hot = nextToIntense(slot.date);

    const candidates = (query: Query): Bundle[] => {
      const pool = eligible.filter(
        (cls) =>
          cls.intensity <= query.cap &&
          usesOf(cls) < query.maxUses &&
          (query.backToBack || !blocked.has(cls.id)) &&
          !(hot && cls.intensity >= 3),
      );
      const wanted = (cls: ClassInfo) => query.focuses.includes(cls.focus);
      const found: Bundle[] = [];

      if (query.lengths === 'full') {
        for (const cls of pool)
          if (cls.lengthMin === length && wanted(cls)) found.push(bundleOf([cls]));

        // Rule 2: a 30-minute session may pair a 20 and a 10.
        if (length === 30) {
          const tens = pool.filter((cls) => cls.lengthMin === 10);
          for (const main of pool) {
            if (main.lengthMin !== 20 || !wanted(main)) continue;
            const companion = tens
              .filter((cls) => cls.id !== main.id)
              .sort((a, b) => compareKeys(companionKey(a, main), companionKey(b, main)))[0];
            if (companion) found.push(bundleOf([main, companion]));
          }
        }
      } else {
        for (const cls of pool) {
          const fits = query.lengths === 'short' ? cls.lengthMin < length : cls.lengthMin > length;
          if (fits && wanted(cls)) found.push(bundleOf([cls]));
        }
      }

      const key = (bundle: Bundle): (number | string)[] => [
        query.focuses.indexOf(bundle.classes[0].focus),
        Math.max(...bundle.classes.map(usesOf)),
        bundle.classes.length,
        // Among shorter classes the longest; among longer ones the shortest.
        query.lengths === 'short' ? -bundle.minutes : bundle.minutes,
        Math.abs(bundle.intensity - lean),
        Math.max(...bundle.classes.map(lastUsedOf)),
        bundle.classes[0].slug,
      ];
      return found.sort((a, b) => compareKeys(key(a), key(b)));
    };

    /** A 10-minute class to follow a 20: the same focus if possible, otherwise something that winds down. */
    const companionKey = (cls: ClassInfo, main: ClassInfo): (number | string)[] => [
      cls.focus === main.focus
        ? 0
        : ['mobility', 'express', 'foundations'].indexOf(cls.focus) + 1 || 4,
      usesOf(cls),
      lastUsedOf(cls),
      cls.slug,
    ];

    const others = preference.filter((item) => item !== focus);
    const all = [focus, ...others];
    const q = (
      focuses: readonly Focus[],
      lengths: Query['lengths'],
      capLimit: number,
      maxUses: number,
      backToBack = false,
    ): Query => ({ focuses, lengths, cap: capLimit, maxUses, backToBack });

    const whenLocked: Query[] = [
      q([focus], 'full', cap, MAX_USES),
      q([focus], 'short', cap, MAX_USES),
      q([focus], 'full', ceiling, MAX_USES),
      q([focus], 'short', ceiling, MAX_USES),
      q([focus], 'full', cap, Infinity),
      q([focus], 'short', cap, Infinity),
      q([focus], 'full', ceiling, Infinity),
      q([focus], 'short', ceiling, Infinity),
      q([focus], 'longer', ceiling, Infinity),
    ];
    const whenFree: Query[] = [
      q([focus], 'full', cap, MAX_USES),
      q(others, 'full', cap, MAX_USES),
      q([focus], 'short', cap, MAX_USES),
      q(others, 'short', cap, MAX_USES),
      q(all, 'full', ceiling, MAX_USES),
      q(all, 'short', ceiling, MAX_USES),
      q(all, 'full', cap, Infinity),
      q(all, 'short', cap, Infinity),
      q(all, 'full', ceiling, Infinity),
      q(all, 'short', ceiling, Infinity),
      q(all, 'longer', ceiling, Infinity),
      q(all, 'full', ceiling, Infinity, true),
      q(all, 'short', ceiling, Infinity, true),
      q(all, 'longer', ceiling, Infinity, true),
    ];

    for (const query of locked ? [...whenLocked, ...whenFree] : whenFree) {
      const best = candidates(query)[0];
      if (!best) continue;

      const rules: RelaxedRule[] = [];
      if (best.classes[0].focus !== focus) rules.push('mix');
      if (best.minutes < length) rules.push('shorter');
      if (best.minutes > length) rules.push('longer');
      if (best.intensity > cap) rules.push('theme');
      if (best.classes.some((cls) => usesOf(cls) >= MAX_USES)) rules.push('repeat');
      if (best.classes.some((cls) => blocked.has(cls.id))) rules.push('back_to_back');
      if (rules.length > 0) relaxed.push({ date: slot.date, rules });

      return best;
    }

    // Every class left would put two intensity-3 sessions on consecutive days.
    throw new NoEligibleClassesError();
  };

  /** Rule 3: the first plan opens with "Start here". A 30-minute session follows it with a 20. */
  const startBundle = (index: number): Bundle => {
    const slot = slots[index];
    const start = eligible.find((cls) => cls.slug === START_HERE_SLUG);
    if (!start) return choose(index, 'foundations', true);

    const classes = [start];
    if (length === 30 && start.lengthMin === 10) {
      const cap = weekCap(profile, slot.week);
      const blocked = neighbourIds(index);
      const hot = nextToIntense(slot.date);
      const rank = (cls: ClassInfo) =>
        cls.focus === 'foundations' ? 0 : cls.focus === 'mobility' ? 1 : 2;
      const companion = eligible
        .filter(
          (cls) =>
            cls.id !== start.id &&
            cls.lengthMin === 20 &&
            cls.intensity <= cap &&
            usesOf(cls) < MAX_USES &&
            !blocked.has(cls.id) &&
            !(hot && cls.intensity >= 3),
        )
        .sort((a, b) => compareKeys([rank(a), usesOf(a), a.slug], [rank(b), usesOf(b), b.slug]))[0];
      if (companion) classes.push(companion);
    }
    return bundleOf(classes);
  };

  // Kept sessions first, so everything else is chosen around them.
  slots.forEach((slot, index) => {
    if (slot.kind === 'kept') assign(index, bundleOf(slot.classes));
  });
  // Then the sessions a rule has fixed, so the free ones cannot use up what they need.
  slots.forEach((slot, index) => {
    if (slot.kind === 'start') assign(index, startBundle(index));
  });
  slots.forEach((slot, index) => {
    if (slot.kind === 'open' && slot.locked) assign(index, choose(index, slot.focus, true));
  });
  slots.forEach((slot, index) => {
    if (slot.kind === 'open' && !slot.locked) assign(index, choose(index, slot.focus, false));
  });

  relaxed.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { bundles: assigned as Bundle[], relaxed };
}
