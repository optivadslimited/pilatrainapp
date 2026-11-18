import { addDays, isISODate, isoWeekday, weekOf } from './dates.ts';
import {
  DAYS_IN_PLAN,
  GOALS,
  MINUTES,
  PlanInputError,
  START_HERE_SLUG,
  type BuiltPlan,
  type ClassInfo,
  type Focus,
  type ISODate,
  type PlannedSession,
  type PlanProfile,
  type Relaxation,
  type SessionStatus,
  type Week,
} from './domain.ts';
import { eligibleClasses } from './eligibility.ts';
import { fillSlots, type Bundle, type Edge, type FillSlot } from './fill.ts';
import { focusWeights, planFocuses } from './mix.ts';

/** Rule 5: with three or more days a week, the last session of each week is mobility. */
const MOBILITY_CLOSE_FROM_DAYS = 3;

export function validateProfile(profile: PlanProfile): void {
  if (!GOALS.includes(profile.goal)) throw new PlanInputError('Unknown goal.');
  if (profile.level !== 1 && profile.level !== 2) throw new PlanInputError('Unknown level.');
  if (!MINUTES.includes(profile.minutes)) throw new PlanInputError('Unknown session length.');
  const days = new Set(profile.weekdays);
  if (days.size === 0 || days.size !== profile.weekdays.length) {
    throw new PlanInputError('Choose at least one training day, each only once.');
  }
  for (const day of days) {
    if (!Number.isInteger(day) || day < 1 || day > 7) throw new PlanInputError('Unknown weekday.');
  }
  if (!Number.isInteger(profile.intensityShift))
    throw new PlanInputError('Unknown intensity shift.');
}

function toSession(slot: { week: Week; date: ISODate }, bundle: Bundle): PlannedSession {
  return {
    week: slot.week,
    date: slot.date,
    classIds: bundle.classes.map((cls) => cls.id),
    focus: bundle.classes[0].focus,
    intensity: bundle.intensity,
    minutes: bundle.minutes,
  };
}

/** The index of the last slot of each week. */
function lastOfEachWeek(slots: readonly { week: number }[]): Set<number> {
  const last = new Map<number, number>();
  slots.forEach((slot, index) => last.set(slot.week, index));
  return new Set(last.values());
}

export type BuildArgs = {
  profile: PlanProfile;
  catalogue: readonly ClassInfo[];
  /**
   * Day 1 of the plan: today, in her timezone. Rule 7: sessions fall on her
   * chosen weekdays, starting from the next one, which is today if today is
   * one of them.
   */
  from: ISODate;
  /** 1 for her first plan. Later blocks do not open with "Start here". */
  block?: number;
  /** The last session of the plan before this one, so it is not repeated straight away. */
  before?: Edge | null;
};

/**
 * Build a 28-day plan. Pure and deterministic: the same answers and catalogue
 * always give the same plan, on the server, on the phone and in tests.
 */
export function buildPlan({
  profile,
  catalogue,
  from,
  block = 1,
  before = null,
}: BuildArgs): BuiltPlan {
  validateProfile(profile);
  if (!isISODate(from)) throw new PlanInputError('The start date must be YYYY-MM-DD.');

  const eligible = eligibleClasses(catalogue, profile);

  // Rule 7. Twenty-eight days hold each weekday exactly four times.
  const days: { week: Week; date: ISODate }[] = [];
  for (let i = 0; i < DAYS_IN_PLAN; i++) {
    const date = addDays(from, i);
    if (profile.weekdays.includes(isoWeekday(date))) {
      days.push({ week: (Math.floor(i / 7) + 1) as Week, date });
    }
  }

  // Rule 3: the first plan opens with "Start here".
  // ASSUMPTION: later blocks do not send her back to "Start here".
  const start = block === 1 ? eligible.find((cls) => cls.slug === START_HERE_SLUG) : undefined;
  const closers =
    profile.weekdays.length >= MOBILITY_CLOSE_FROM_DAYS ? lastOfEachWeek(days) : new Set<number>();

  const fixed = (index: number): Focus | undefined => {
    if (index === 0 && block === 1) return start?.focus ?? 'foundations';
    if (closers.has(index)) return 'mobility';
    return undefined;
  };

  const focuses = planFocuses(
    days.map((day, index) => ({ week: day.week, fixed: fixed(index) })),
    focusWeights(profile),
  );

  const slots: FillSlot[] = days.map((day, index) =>
    index === 0 && block === 1
      ? { ...day, kind: 'start' }
      : { ...day, kind: 'open', focus: focuses[index], locked: closers.has(index) },
  );

  const { bundles, relaxed } = fillSlots(slots, { profile, eligible, before });

  return {
    block,
    startDate: from,
    endDate: addDays(from, DAYS_IN_PLAN - 1),
    profile,
    sessions: days.map((day, index) => toSession(day, bundles[index])),
    relaxed,
  };
}

/** A session as it stands in an existing plan. */
export type ExistingSession = {
  week: Week;
  date: ISODate;
  classIds: readonly string[];
  status: SessionStatus;
};

export type ReplanArgs = {
  profile: PlanProfile;
  catalogue: readonly ClassInfo[];
  sessions: readonly ExistingSession[];
  /** Sessions still to do in this week and later are chosen again. */
  fromWeek: number;
  /** Rule 8: after two "too hard" in a row, one session of `fromWeek` becomes a foundations class. */
  addFoundations?: boolean;
  before?: Edge | null;
};

/**
 * Choose the remaining sessions again, for example after her feedback changed
 * the intensity. Sessions that are done, and everything before `fromWeek`,
 * stay exactly as they are and still count towards the mix and the repeats.
 *
 * Returns one entry per input session, in the same order: the new session, or
 * `null` where the session was left alone.
 */
export function replan({
  profile,
  catalogue,
  sessions,
  fromWeek,
  addFoundations = false,
  before = null,
}: ReplanArgs): { sessions: (PlannedSession | null)[]; relaxed: Relaxation[] } {
  validateProfile(profile);
  const eligible = eligibleClasses(catalogue, profile);
  const byId = new Map(catalogue.map((cls) => [cls.id, cls]));

  // Dropped sessions are gone. The rest, in date order, with their place in the input remembered.
  const live = sessions
    .map((session, input) => ({ session, input }))
    .filter(({ session }) => session.status !== 'dropped')
    .sort((a, b) =>
      a.session.date < b.session.date ? -1 : a.session.date > b.session.date ? 1 : 0,
    );

  const isOpen = (session: ExistingSession) =>
    (session.status === 'planned' || session.status === 'moved') && session.week >= fromWeek;

  const closers =
    profile.weekdays.length >= MOBILITY_CLOSE_FROM_DAYS
      ? lastOfEachWeek(live.map(({ session }) => session))
      : new Set<number>();

  // Rule 8: the first open session of the week that is not its mobility close.
  const foundationsAt = addFoundations
    ? live.findIndex(
        ({ session }, index) => isOpen(session) && session.week === fromWeek && !closers.has(index),
      )
    : -1;

  const classesOf = (session: ExistingSession) =>
    session.classIds.map((id) => byId.get(id)).filter((cls): cls is ClassInfo => cls !== undefined);

  const fixed = (index: number): Focus | undefined => {
    const { session } = live[index];
    if (!isOpen(session)) return classesOf(session)[0]?.focus;
    if (index === foundationsAt) return 'foundations';
    if (closers.has(index)) return 'mobility';
    return undefined;
  };

  const focuses = planFocuses(
    live.map(({ session }, index) => ({ week: session.week, fixed: fixed(index) })),
    focusWeights(profile),
  );

  const slots: FillSlot[] = live.map(({ session }, index) => {
    const day = { week: session.week, date: session.date };
    if (!isOpen(session)) return { ...day, kind: 'kept', classes: classesOf(session) };
    return {
      ...day,
      kind: 'open',
      focus: focuses[index],
      locked: index === foundationsAt || closers.has(index),
    };
  });

  const result: (PlannedSession | null)[] = sessions.map(() => null);
  if (!slots.some((slot) => slot.kind === 'open')) return { sessions: result, relaxed: [] };

  const { bundles, relaxed } = fillSlots(slots, { profile, eligible, before });
  live.forEach(({ session, input }, index) => {
    if (isOpen(session)) result[input] = toSession(session, bundles[index]);
  });

  return { sessions: result, relaxed };
}

export type RebuildArgs = {
  /** Her profile as it is now, with the new days and session length. */
  profile: PlanProfile;
  catalogue: readonly ClassInfo[];
  planStart: ISODate;
  block: number;
  sessions: readonly ExistingSession[];
  /** The first day a new session may fall on: today, or tomorrow if today's is done. */
  from: ISODate;
  before?: Edge | null;
};

/**
 * "Adjust my plan": she has changed her days or her session length, so the
 * rest of the plan is laid out again on the new days, from `from` to the end
 * of the 28 days. Sessions that are done stay as they are and still count
 * towards the mix and the repeats. Sessions still to do are replaced by the
 * ones returned here, in date order.
 */
export function rebuildRemaining({
  profile,
  catalogue,
  planStart,
  block,
  sessions,
  from,
  before = null,
}: RebuildArgs): { sessions: PlannedSession[]; relaxed: Relaxation[] } {
  validateProfile(profile);
  if (!isISODate(from)) throw new PlanInputError('The start date must be YYYY-MM-DD.');

  const eligible = eligibleClasses(catalogue, profile);
  const byId = new Map(catalogue.map((cls) => [cls.id, cls]));
  const planEnd = addDays(planStart, DAYS_IN_PLAN - 1);

  type Day = { week: Week; date: ISODate; kept?: ClassInfo[] };
  const done: Day[] = sessions
    .filter((session) => session.status === 'done')
    .map((session) => ({
      week: session.week,
      date: session.date,
      kept: session.classIds
        .map((id) => byId.get(id))
        .filter((cls): cls is ClassInfo => cls !== undefined),
    }));
  const taken = new Set(done.map((day) => day.date));

  // Rule 7 again, for what is left of the 28 days. Never two sessions on one day.
  const fresh: Day[] = [];
  for (let date = from > planStart ? from : planStart; date <= planEnd; date = addDays(date, 1)) {
    if (!profile.weekdays.includes(isoWeekday(date)) || taken.has(date)) continue;
    fresh.push({ week: Math.min(4, Math.max(1, weekOf(planStart, date))) as Week, date });
  }
  if (fresh.length === 0) return { sessions: [], relaxed: [] };

  const live = [...done, ...fresh].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const closers =
    profile.weekdays.length >= MOBILITY_CLOSE_FROM_DAYS ? lastOfEachWeek(live) : new Set<number>();

  // Rule 3 still holds if she has not started: her first session is "Start here".
  const startAt = block === 1 && done.length === 0 ? live.findIndex((day) => !day.kept) : -1;
  const start = eligible.find((cls) => cls.slug === START_HERE_SLUG);

  const fixed = (index: number): Focus | undefined => {
    const day = live[index];
    if (day.kept) return day.kept[0]?.focus;
    if (index === startAt) return start?.focus ?? 'foundations';
    if (closers.has(index)) return 'mobility';
    return undefined;
  };

  const focuses = planFocuses(
    live.map((day, index) => ({ week: day.week, fixed: fixed(index) })),
    focusWeights(profile),
  );

  const slots: FillSlot[] = live.map((day, index) => {
    const base = { week: day.week, date: day.date };
    if (day.kept) return { ...base, kind: 'kept', classes: day.kept };
    if (index === startAt) return { ...base, kind: 'start' };
    return { ...base, kind: 'open', focus: focuses[index], locked: closers.has(index) };
  });

  const { bundles, relaxed } = fillSlots(slots, { profile, eligible, before });

  return {
    sessions: live.flatMap((day, index) => (day.kept ? [] : [toSession(day, bundles[index])])),
    relaxed,
  };
}
