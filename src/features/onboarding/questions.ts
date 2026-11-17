/**
 * The 90-second quiz, as data. The screen that renders a question
 * (src/app/quiz/[step].tsx) knows nothing about any particular question: it
 * reads this list. Wording lives in src/strings/en.ts under the same ids.
 *
 * The value ids below are also what is stored in `quiz_answers` and what the
 * plan engine reads, so treat them as part of the data model.
 */

export const GOALS = ['core_strength', 'posture', 'mobility', 'tone', 'routine'] as const;
export const EXPERIENCES = ['new', 'tried', 'sometimes', 'regular'] as const;
export const MINUTES = [10, 20, 30] as const;
export const DAYS_PER_WEEK = [2, 3, 4, 5] as const;
export const TIMES_OF_DAY = ['morning', 'lunchtime', 'evening', 'varies'] as const;
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

export type Goal = (typeof GOALS)[number];
export type Experience = (typeof EXPERIENCES)[number];
export type Minutes = (typeof MINUTES)[number];
export type DaysPerWeek = (typeof DAYS_PER_WEEK)[number];
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type WorkAround = (typeof WORK_AROUNDS)[number];

/** ISO weekday: 1 is Monday, 7 is Sunday. Matches Postgres `isodow`. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Level 1 is beginner, level 2 is improver. */
export type Level = 1 | 2;

export type QuizAnswers = {
  goal: Goal;
  experience: Experience;
  minutes: Minutes;
  daysPerWeek: DaysPerWeek;
  weekdays: Weekday[];
  timeOfDay: TimeOfDay;
  equipment: Equipment[];
  workAround: WorkAround[];
  /** Optional. An empty string means she skipped it. */
  firstName: string;
};

export type QuestionId =
  | 'goal'
  | 'experience'
  | 'minutes'
  | 'days_per_week'
  | 'weekdays'
  | 'time_of_day'
  | 'equipment'
  | 'work_around'
  | 'first_name';

type OptionValue = string | number;

export type Question =
  | {
      id: QuestionId;
      kind: 'single';
      field: 'goal' | 'experience' | 'minutes' | 'daysPerWeek' | 'timeOfDay';
      options: readonly OptionValue[];
    }
  | {
      id: QuestionId;
      kind: 'multi';
      field: 'equipment' | 'workAround';
      options: readonly string[];
      /** Choosing this clears the rest, and choosing anything else clears this. */
      exclusive: string;
    }
  | { id: QuestionId; kind: 'weekdays'; field: 'weekdays' }
  | { id: QuestionId; kind: 'text'; field: 'firstName' };

/** The nine questions, in the order she meets them. */
export const QUESTIONS: readonly Question[] = [
  { id: 'goal', kind: 'single', field: 'goal', options: GOALS },
  { id: 'experience', kind: 'single', field: 'experience', options: EXPERIENCES },
  { id: 'minutes', kind: 'single', field: 'minutes', options: MINUTES },
  { id: 'days_per_week', kind: 'single', field: 'daysPerWeek', options: DAYS_PER_WEEK },
  { id: 'weekdays', kind: 'weekdays', field: 'weekdays' },
  { id: 'time_of_day', kind: 'single', field: 'timeOfDay', options: TIMES_OF_DAY },
  { id: 'equipment', kind: 'multi', field: 'equipment', options: EQUIPMENT, exclusive: 'mat' },
  {
    id: 'work_around',
    kind: 'multi',
    field: 'workAround',
    options: WORK_AROUNDS,
    exclusive: 'none',
  },
  { id: 'first_name', kind: 'text', field: 'firstName' },
];

export function getQuestion(id: string | undefined): Question | undefined {
  return QUESTIONS.find((question) => question.id === id);
}

export function questionIndex(id: QuestionId): number {
  return QUESTIONS.findIndex((question) => question.id === id);
}

/**
 * Experience to plan level. The first two answers are beginner; "sometimes"
 * and "regularly" are both improver at launch.
 */
export function levelFor(experience: Experience): Level {
  return experience === 'new' || experience === 'tried' ? 1 : 2;
}

/**
 * The default reminder time for each "best time of day" answer, as 24-hour
 * "HH:MM" in her own timezone. She can change it later in plan settings.
 * ASSUMPTION: these four times are a sensible default, not from the spec.
 */
export const REMINDER_TIMES: Record<TimeOfDay, string> = {
  morning: '07:30',
  lunchtime: '12:30',
  evening: '18:30',
  varies: '09:00',
};

/**
 * What she can train with. Everyone has a mat ("Just a mat" is the baseline),
 * so the mat is always included whatever else she ticked.
 */
export function ownedEquipment(answer: readonly Equipment[]): Equipment[] {
  return EQUIPMENT.filter((item) => item === 'mat' || answer.includes(item));
}

/**
 * Toggle `value` in a multi-select answer, honouring the exclusive option:
 * choosing "None" clears everything else, and choosing anything else clears
 * "None". The same rule makes "Just a mat" and the other equipment exclusive.
 */
export function toggleOption<T extends string>(
  current: readonly T[],
  value: T,
  exclusive: string,
): T[] {
  if (current.includes(value)) return current.filter((item) => item !== value);
  if (value === exclusive) return [value];
  return [...current.filter((item) => item !== exclusive), value];
}
