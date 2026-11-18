/**
 * The vocabulary shared by the app, the plan engine and the database.
 *
 * This folder (`supabase/functions/_shared/engine`) is plain TypeScript with no
 * imports from React Native, Node or Deno, so the same files run in three
 * places: in the Supabase Edge Function (the real home of the plan engine), in
 * the app (local mode, until the backend keys exist), and in Jest.
 *
 * Because Deno needs it, files in this folder import each other with the
 * `.ts` extension.
 *
 * The ids below are stored in the database. Treat them as part of the data
 * model: renaming one needs a migration.
 */

export const GOALS = ['core_strength', 'posture', 'mobility', 'tone', 'routine'] as const;
export const MINUTES = [10, 20, 30] as const;
export const EQUIPMENT = ['mat', 'band', 'ball', 'weights'] as const;
export const WORK_AROUNDS = [
  'lower_back',
  'neck_shoulders',
  'knees',
  'wrists',
  'pregnant_postpartum',
  'recent_injury_surgery',
  'none',
] as const;

/** What a class mainly works on. */
export const FOCUSES = ['foundations', 'core', 'full_body', 'mobility', 'express'] as const;
/** The theme of each of the four weeks, in order. */
export const THEMES = ['foundations', 'build', 'strengthen', 'flow'] as const;
export const SESSION_STATUSES = ['planned', 'done', 'moved', 'dropped'] as const;
/** How a class felt: too easy, just right, too hard. */
export const RATINGS = ['easy', 'right', 'hard'] as const;

export type Goal = (typeof GOALS)[number];
export type Minutes = (typeof MINUTES)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type WorkAround = (typeof WORK_AROUNDS)[number];
export type Focus = (typeof FOCUSES)[number];
export type Theme = (typeof THEMES)[number];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export type Rating = (typeof RATINGS)[number];

/** Level 1 is beginner, level 2 is improver. */
export type Level = 1 | 2;
/** 1 is gentle, 3 is the hardest. */
export type Intensity = 1 | 2 | 3;
/** ISO weekday: 1 is Monday, 7 is Sunday. Matches Postgres `isodow`. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** A calendar date in her own timezone, as `YYYY-MM-DD`. The engine never handles clock times. */
export type ISODate = string;
/** A plan is four weeks. */
export type Week = 1 | 2 | 3 | 4;

export const WEEKS: readonly Week[] = [1, 2, 3, 4];
export const DAYS_IN_PLAN = 28;
/** The class every first plan opens with. */
export const START_HERE_SLUG = 'start-here';

/** The facts about a class that the engine needs. Titles, video and artwork are not its concern. */
export type ClassInfo = {
  id: string;
  slug: string;
  lengthMin: Minutes;
  level: Level;
  focus: Focus;
  intensity: Intensity;
  /** Everything needed to take the class. Always includes the mat. */
  equipment: readonly Equipment[];
  /** Things to work around that this class does not suit, e.g. wrists. */
  unsuitableFor: readonly WorkAround[];
  published: boolean;
};

/**
 * Everything the engine knows about her. The first seven fields are the quiz;
 * `intensityShift` is moved by her feedback and by each new block.
 */
export type PlanProfile = {
  goal: Goal;
  level: Level;
  minutes: Minutes;
  /** The weekdays she trains on. */
  weekdays: readonly Weekday[];
  /** What she ticked. The mat is assumed whatever she ticked. */
  equipment: readonly Equipment[];
  workAround: readonly WorkAround[];
  /** Set by the safety gate: caps intensity at 2 and prefers mobility and foundations. */
  gentle: boolean;
  /** Added to every week's intensity cap. 0 for a first plan. */
  intensityShift: number;
};

/** One session of a plan. Usually one class; a 30-minute session may be a 20 and a 10. */
export type PlannedSession = {
  week: Week;
  date: ISODate;
  /** In playing order. The first is the one the session is named after. */
  classIds: string[];
  focus: Focus;
  /** The highest intensity among its classes. */
  intensity: Intensity;
  minutes: number;
};

/**
 * Where the engine could not satisfy every rule at once and had to give one up,
 * most gently first. A plan built from a full catalogue has none of these.
 *
 *  - mix: the session is not the focus the goal's mix asked for.
 *  - shorter: no class of her length fitted, so a shorter one was used.
 *  - theme: the class is above the week's intensity cap (never above her ceiling).
 *  - repeat: a class appears more than twice in the 28 days.
 *  - longer: nothing at or under her length fitted at all.
 *  - back_to_back: the same class on two sessions running. Only when one class is all there is.
 */
export type RelaxedRule = 'mix' | 'shorter' | 'theme' | 'repeat' | 'longer' | 'back_to_back';

export type Relaxation = { date: ISODate; rules: RelaxedRule[] };

export type BuiltPlan = {
  /** 1 for her first plan, 2 for the block that follows it, and so on. */
  block: number;
  startDate: ISODate;
  endDate: ISODate;
  profile: PlanProfile;
  sessions: PlannedSession[];
  relaxed: Relaxation[];
};

export class PlanInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanInputError';
  }
}

/** No class in the catalogue suits her answers. The catalogue must always hold some that suit everyone. */
export class NoEligibleClassesError extends Error {
  constructor() {
    super('No class in the catalogue fits these answers.');
    this.name = 'NoEligibleClassesError';
  }
}
