import {
  EQUIPMENT,
  THEMES,
  type ClassInfo,
  type Equipment,
  type Intensity,
  type Level,
  type PlanProfile,
  type Theme,
  type Week,
} from './domain.ts';

/**
 * Rule 1. Keep only classes at or below her level, that need only equipment
 * she has, and that do not conflict with anything she wants to work around.
 * On the gentle track, intensity is capped at 2.
 *
 * These are never relaxed. A class that fails here is never in her plan.
 */

/** Everyone has a mat ("Just a mat" is the baseline), whatever else she ticked. */
export function ownedEquipment(answer: readonly Equipment[]): Equipment[] {
  return EQUIPMENT.filter((item) => item === 'mat' || answer.includes(item));
}

/** The highest intensity she is ever given: 2 on the gentle track, otherwise 3. */
export function intensityCeiling(profile: Pick<PlanProfile, 'gentle'>): Intensity {
  return profile.gentle ? 2 : 3;
}

export function isEligible(cls: ClassInfo, profile: PlanProfile): boolean {
  if (!cls.published) return false;
  if (cls.level > profile.level) return false;
  if (cls.intensity > intensityCeiling(profile)) return false;

  const owned = ownedEquipment(profile.equipment);
  if (!cls.equipment.every((item) => owned.includes(item))) return false;

  // "None" is an answer, not a condition, so it never matches a class.
  return !cls.unsuitableFor.some((item) => item !== 'none' && profile.workAround.includes(item));
}

export function eligibleClasses(
  catalogue: readonly ClassInfo[],
  profile: PlanProfile,
): ClassInfo[] {
  return catalogue.filter((cls) => isEligible(cls, profile));
}

/**
 * Rule 3. Each week has a theme, and the theme sets how hard the week may be.
 * A beginner's weeks are capped at 1, 2, 2, 2; an improver's at 2, 2, 3, 3.
 * ASSUMPTION: the brief names the themes but not what they change. This is our reading.
 */
const THEME_CAP: Record<Level, Record<Theme, Intensity>> = {
  1: { foundations: 1, build: 2, strengthen: 2, flow: 2 },
  2: { foundations: 2, build: 2, strengthen: 3, flow: 3 },
};

/** Within its cap, the intensity a week leans towards. */
export const THEME_LEAN: Record<Theme, Intensity> = {
  foundations: 1,
  build: 2,
  strengthen: 3,
  flow: 2,
};

export function themeOf(week: Week | number): Theme {
  return THEMES[Math.min(THEMES.length, Math.max(1, week)) - 1];
}

/**
 * The most intense class a week may hold: the theme's cap, moved by her
 * feedback (`intensityShift`), and never above her ceiling or below 1.
 */
export function weekCap(profile: PlanProfile, week: Week | number): Intensity {
  const base = THEME_CAP[profile.level][themeOf(week)] + profile.intensityShift;
  return Math.min(intensityCeiling(profile), Math.max(1, base)) as Intensity;
}
