import {
  FOCUSES,
  MINUTES,
  START_HERE_SLUG,
  type BuiltPlan,
  type ClassInfo,
  type Focus,
  type Intensity,
  type Level,
  type Minutes,
  type PlanProfile,
} from '@engine';

import seed from '../data/seedClasses.json';

/** The sixteen placeholder classes, as the engine sees them. */
export const seedCatalogue = seed as unknown as ClassInfo[];

export function cls(overrides: Partial<ClassInfo> & { slug: string }): ClassInfo {
  return {
    id: overrides.slug,
    lengthMin: 20,
    level: 1,
    focus: 'core',
    intensity: 1,
    equipment: ['mat'],
    unsuitableFor: [],
    published: true,
    ...overrides,
  };
}

/**
 * A catalogue with plenty of everything: for every level, focus and length
 * there are several mat-only classes across the intensities, plus "Start
 * here". With this much choice every rule can hold at once, so a plan built
 * from it should never need to relax anything.
 */
export function richCatalogue(): ClassInfo[] {
  const classes: ClassInfo[] = [
    cls({ slug: START_HERE_SLUG, lengthMin: 10, focus: 'foundations', intensity: 1 }),
  ];
  const spread: Record<Level, Intensity[]> = { 1: [1, 1, 1, 2, 2, 2], 2: [2, 2, 3, 3] };

  for (const level of [1, 2] as Level[]) {
    for (const focus of FOCUSES) {
      for (const lengthMin of MINUTES) {
        spread[level].forEach((intensity, n) => {
          classes.push(
            cls({
              slug: `${focus}-${lengthMin}-l${level}-i${intensity}-${n}`,
              focus,
              lengthMin,
              level,
              intensity,
            }),
          );
        });
      }
    }
  }
  return classes;
}

export function profile(overrides: Partial<PlanProfile> = {}): PlanProfile {
  return {
    goal: 'core_strength',
    level: 1,
    minutes: 20,
    weekdays: [1, 3, 5],
    equipment: ['mat'],
    workAround: ['none'],
    gentle: false,
    intensityShift: 0,
    ...overrides,
  };
}

/** Monday 2 November 2026. */
export const MONDAY = '2026-11-02';
/** Tuesday 3 November 2026. */
export const TUESDAY = '2026-11-03';

export const lookup = (catalogue: readonly ClassInfo[]) => {
  const byId = new Map(catalogue.map((item) => [item.id, item]));
  return (id: string): ClassInfo => {
    const found = byId.get(id);
    if (!found) throw new Error(`Unknown class ${id}`);
    return found;
  };
};

/** How many sessions of each focus a plan holds. */
export function focusCounts(plan: BuiltPlan): Record<Focus, number> {
  const counts = Object.fromEntries(FOCUSES.map((focus) => [focus, 0])) as Record<Focus, number>;
  for (const session of plan.sessions) counts[session.focus]++;
  return counts;
}

/** How many times each class is used in a plan. */
export function timesUsed(plan: BuiltPlan): Map<string, number> {
  const counts = new Map<string, number>();
  for (const session of plan.sessions) {
    for (const id of session.classIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export const lengths = (catalogue: readonly ClassInfo[], only: Minutes[]) =>
  catalogue.filter((item) => only.includes(item.lengthMin));
