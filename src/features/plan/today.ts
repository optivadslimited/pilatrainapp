import { addDays, isOpen, weekOf, weekStart, type ISODate } from '@engine';

import type { DayState } from '@/components';
import { weekdayLetter, weekdayName } from '@/lib/format';
import { t } from '@/strings';

import { sessionCard, type Catalogue, type SessionCard } from './cards';
import type { StoredPlan } from './types';

/**
 * Everything the Today screen shows, worked out from her plan and today's
 * date. The screen itself only lays this out, so every state she can be in is
 * decided, and tested, here.
 *
 *   session        a session is due today
 *   done           today's session is done
 *   rest           no session today
 *   moved          the plan moved a missed session since she last looked
 *   before_first   her first session is still ahead and today is not one of her days
 *   block_done     the last session of the block is behind her
 */
export type TodayState = 'session' | 'done' | 'rest' | 'moved' | 'before_first' | 'block_done';

export type TodayView = {
  state: TodayState;
  /** "Tuesday · Week 2 of 4" */
  dateLine: string;
  headline: string;
  /** The large card: today's session, or the next one. */
  feature: {
    card: SessionCard;
    /** `today`: due today. `done`: done today. `next`: the next one, shown ahead of its day. */
    kind: 'today' | 'done' | 'next';
    /** A line above the title, e.g. "Next: Thursday". */
    eyebrow: string | null;
    canStart: boolean;
    startLabel: string;
  } | null;
  /** "Next: Thursday · Full-body flow", once today's session is done. */
  nextLine: string | null;
  weekStrip: { date: ISODate; letter: string; label: string; state: DayState }[];
  ring: { done: number; total: number; label: string; spoken: string };
  /** The rest of this week's sessions, soonest first. */
  comingUp: SessionCard[];
  /** One quiet line drawn from her own numbers. Never guilt, never streak pressure. */
  encouragement: string;
};

const WEEKS = 4;
const byDate = (a: { date: ISODate }, b: { date: ISODate }) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

export function todayView(plan: StoredPlan, catalogue: Catalogue, today: ISODate): TodayView {
  const week = Math.min(WEEKS, Math.max(1, weekOf(plan.startDate, today)));
  const card = (session: StoredPlan['sessions'][number]) => sessionCard(session, catalogue);

  // A dropped session is gone from her plan. Nothing here mentions it.
  const live = plan.sessions.filter((session) => session.status !== 'dropped').sort(byDate);
  const thisWeek = live.filter((session) => session.week === week);
  const todays = live.find((session) => session.date === today);
  const upcoming = live.filter((session) => isOpen(session) && session.date > today);

  const doneEver = live.filter((session) => session.status === 'done').length;
  const doneThisWeek = thisWeek.filter((session) => session.status === 'done');
  const firstStillAhead = plan.block === 1 && doneEver === 0;
  const justMoved = plan.movedNoticeDate === today;

  const todaysCard = todays ? card(todays) : null;
  const nextCard = upcoming.map(card).find((item): item is SessionCard => item !== null) ?? null;

  let state: TodayState;
  let headline: string;
  let feature: TodayView['feature'] = null;

  if (todaysCard?.isDone) {
    state = 'done';
    headline = t.today.headline.done;
    feature = {
      card: todaysCard,
      kind: 'done',
      eyebrow: null,
      canStart: false,
      startLabel: t.common.start,
    };
  } else if (todaysCard) {
    state = justMoved ? 'moved' : 'session';
    headline = justMoved ? t.today.headline.moved : t.today.headline.session(todaysCard.title);
    feature = {
      card: todaysCard,
      kind: 'today',
      eyebrow: null,
      canStart: true,
      startLabel: t.common.start,
    };
  } else if (nextCard) {
    state = firstStillAhead ? 'before_first' : justMoved ? 'moved' : 'rest';
    headline =
      state === 'before_first'
        ? t.today.headline.beforeFirst(nextCard.weekday)
        : state === 'moved'
          ? t.today.headline.moved
          : t.today.headline.rest;
    feature = {
      card: nextCard,
      kind: 'next',
      eyebrow: t.today.next(nextCard.weekday),
      // She has just finished the quiz. If she wants her first class now, she can have it.
      canStart: firstStillAhead,
      startLabel: t.today.startEarly,
    };
  } else {
    state = 'block_done';
    headline = t.today.headline.blockDone;
  }

  const showsNextLine = state === 'done' && nextCard !== null;

  const start = weekStart(plan.startDate, week);
  const weekStrip = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const session = live.find((item) => item.date === date);
    const dayState: DayState =
      session?.status === 'done'
        ? 'done'
        : date === today
          ? 'today'
          : session && isOpen(session)
            ? 'planned'
            : 'rest';
    // A planned session today is read out as such; the outline alone would not say it.
    const spokenState =
      dayState === 'today' && session
        ? `${t.dayPill.today}, ${t.dayPill.planned}`
        : t.dayPill[dayState];
    return {
      date,
      letter: weekdayLetter(date),
      label: `${weekdayName(date)}, ${spokenState}`,
      state: dayState,
    };
  });

  const ring = {
    done: doneThisWeek.length,
    total: thisWeek.length,
    label: t.today.ring(doneThisWeek.length, thisWeek.length),
    spoken: t.today.ringSpoken(doneThisWeek.length, thisWeek.length),
  };

  const comingUp = thisWeek
    .filter((session) => isOpen(session) && session.date > today)
    .filter((session) => feature?.kind !== 'next' || session.id !== feature.card.session.id)
    .map(card)
    .filter((item): item is SessionCard => item !== null);

  const minutesThisWeek = doneThisWeek
    .map(card)
    .reduce((sum, item) => sum + (item?.minutes ?? 0), 0);

  const lines = t.today.encouragement;
  const encouragement = ((): string => {
    switch (state) {
      case 'before_first':
        return lines.beforeFirst;
      case 'moved':
        return lines.moved;
      case 'block_done':
        return lines.blockDone;
      case 'done':
        return doneEver === 1 ? lines.firstDone : lines.doneThisWeek(ring.done, ring.total);
      case 'rest':
        return ring.done > 0 ? lines.restAfterWork(minutesThisWeek) : lines.rest;
      case 'session':
        if (firstStillAhead) return lines.firstSession(todaysCard?.minutes ?? plan.profile.minutes);
        return ring.done > 0 ? lines.momentum(ring.done) : lines.weekStart(week);
    }
  })();

  return {
    state,
    dateLine: t.today.dateLine(weekdayName(today), week, WEEKS),
    headline,
    feature,
    nextLine: showsNextLine && nextCard ? t.today.nextLine(nextCard.weekday, nextCard.title) : null,
    weekStrip,
    ring,
    comingUp,
    encouragement,
  };
}
