import { addDays, diffDays, isOpen, isoWeekday, weekOf, type ISODate, type Rating } from '@engine';

import { weekdayName } from '@/lib/format';
import { t } from '@/strings';

import { sessionCard, type Catalogue } from './cards';
import type { StoredPlan, StoredRating, StoredSession } from './types';

/**
 * What the Progress tab and the after-class screen show, worked out from
 * everything she has done. Sessions, minutes and weeks: never weight, never
 * measurements, never before-and-after.
 *
 * Only sessions of her plan are counted. A class taken from the library on
 * its own is not (it has no session to belong to).
 */
type History = { plans: readonly StoredPlan[]; ratings: readonly StoredRating[] };

const WINDOW_DAYS = 28;

const minutesOf = (session: StoredSession, catalogue: Catalogue) =>
  session.classIds.reduce((sum, id) => sum + (catalogue.get(id)?.lengthMin ?? 0), 0);

/** The Monday of the calendar week a date falls in. */
const mondayOf = (date: ISODate) => addDays(date, -(isoWeekday(date) - 1));

export type Totals = { sessions: number; minutes: number; weeksActive: number };

/** Sessions completed, minutes moved, and calendar weeks with at least one session. */
export function totals(plans: readonly StoredPlan[], catalogue: Catalogue): Totals {
  const done = plans.flatMap((plan) =>
    plan.sessions.filter((session) => session.status === 'done'),
  );
  return {
    sessions: done.length,
    minutes: done.reduce((sum, session) => sum + minutesOf(session, catalogue), 0),
    weeksActive: new Set(done.map((session) => mondayOf(session.date))).size,
  };
}

export type ProgressView = {
  /** Nothing done yet: the tab shows its empty state. */
  isEmpty: boolean;
  totals: Totals;
  /** Sessions done out of sessions planned over the last four weeks. `null` before any were due. */
  consistency: { done: number; planned: number; ratio: number; body: string } | null;
  /** This plan's four weeks: sessions done in each, against her target. */
  chart: {
    target: number;
    targetLabel: string;
    bars: { label: string; spoken: string; value: number; isCurrent: boolean }[];
  } | null;
  /** This month, a dot on each day she trained. Weeks start on Monday. */
  month: {
    title: string;
    summary: string;
    /** `null` pads the first week so the 1st falls under its weekday. */
    days: ({
      date: ISODate;
      day: number;
      trained: boolean;
      isToday: boolean;
      label: string;
    } | null)[];
  };
  /** "Classes have mostly felt just right." `null` until she has rated one. */
  feel: string | null;
};

export function progressView(history: History, catalogue: Catalogue, today: ISODate): ProgressView {
  const sessions = history.plans.flatMap((plan) => plan.sessions);
  const done = sessions.filter((session) => session.status === 'done');
  const total = totals(history.plans, catalogue);

  // Consistency: over the last 28 days, what was planned and has had its day
  // (done, or dropped when its week ran out) against what was done. Sessions
  // still ahead of her are not counted either way.
  const windowStart = addDays(today, -(WINDOW_DAYS - 1));
  const inWindow = (session: StoredSession) => session.date >= windowStart && session.date <= today;
  const doneInWindow = done.filter(inWindow).length;
  const plannedInWindow =
    doneInWindow +
    sessions.filter((session) => session.status === 'dropped' && inWindow(session)).length;

  const active = history.plans.find((plan) => plan.status === 'active') ?? null;
  const target = active?.profile.weekdays.length ?? 0;
  const currentWeek = active ? Math.min(4, Math.max(1, weekOf(active.startDate, today))) : 0;

  const [year, month] = today.split('-').map(Number);
  const first = `${today.slice(0, 8)}01`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const trainedDates = new Set(done.map((session) => session.date));
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const date = addDays(first, i);
    const trained = trainedDates.has(date);
    return {
      date,
      day: i + 1,
      trained,
      isToday: date === today,
      label: [weekdayName(date), String(i + 1), trained ? t.progress.trained : null]
        .filter(Boolean)
        .join(', '),
    };
  });
  const trainedThisMonth = monthDays.filter((day) => day.trained).length;

  return {
    isEmpty: total.sessions === 0,
    totals: total,
    consistency:
      plannedInWindow > 0
        ? {
            done: doneInWindow,
            planned: plannedInWindow,
            ratio: doneInWindow / plannedInWindow,
            body: t.progress.consistencyBody(doneInWindow, plannedInWindow),
          }
        : null,
    chart: active
      ? {
          target,
          targetLabel: t.progress.chartTarget(target),
          bars: [1, 2, 3, 4].map((week) => {
            const value = active.sessions.filter(
              (session) => session.week === week && session.status === 'done',
            ).length;
            return {
              label: t.progress.chartWeek(week),
              spoken: t.progress.chartSpoken(week, value, target),
              value,
              isCurrent: week === currentWeek,
            };
          }),
        }
      : null,
    month: {
      title: t.progress.monthTitle(t.months[month - 1], year),
      summary: t.progress.daysTrained(trainedThisMonth),
      days: [...Array.from({ length: isoWeekday(first) - 1 }, () => null), ...monthDays],
    },
    feel: feelLine(history.ratings.map((item) => item.rating)),
  };
}

/** One line on how classes have felt. "Mostly" means more than half. */
export function feelLine(ratings: readonly Rating[]): string | null {
  if (ratings.length === 0) return null;
  const count = (rating: Rating) => ratings.filter((item) => item === rating).length;
  const most = (['right', 'easy', 'hard'] as const).find(
    (rating) => count(rating) * 2 > ratings.length,
  );
  return most ? t.progress.feel[most] : t.progress.feel.mixed;
}

export type AfterClassView = {
  /** The weekly ring, as it was before this session and as it is now. */
  ring: { before: number; after: number; total: number; label: string; spoken: string };
  minutes: number;
  sessions: number;
  /** "Next: Thursday · Full-body flow" */
  next: string | null;
};

/** The after-class screen for a session of her plan. */
export function afterClassView(
  plan: StoredPlan,
  plans: readonly StoredPlan[],
  catalogue: Catalogue,
  sessionId: string,
  today: ISODate,
): AfterClassView {
  const session = plan.sessions.find((item) => item.id === sessionId);
  const week = session?.week ?? Math.min(4, Math.max(1, weekOf(plan.startDate, today)));
  const thisWeek = plan.sessions.filter((item) => item.week === week && item.status !== 'dropped');
  const after = thisWeek.filter((item) => item.status === 'done').length;
  const before = Math.max(0, after - (session?.status === 'done' ? 1 : 0));

  // The plan passed in is the freshest copy, so it stands in for its own entry in the history.
  const total = totals([...plans.filter((item) => item.id !== plan.id), plan], catalogue);

  const upcoming = plan.sessions
    .filter((item) => isOpen(item) && item.date > today)
    .sort((a, b) => diffDays(b.date, a.date))
    .map((item) => sessionCard(item, catalogue))
    .find((card) => card !== null);

  return {
    ring: {
      before,
      after,
      total: thisWeek.length,
      label: t.today.ring(after, thisWeek.length),
      spoken: t.today.ringSpoken(after, thisWeek.length),
    },
    minutes: total.minutes,
    sessions: total.sessions,
    next: upcoming ? t.afterClass.next(upcoming.weekday, upcoming.title) : null,
  };
}
