import { addDays, diffDays, weekEnd, weekOf, weekStart } from './dates.ts';
import { PlanInputError, type ISODate, type SessionStatus, type Week } from './domain.ts';

/**
 * Rule 9. A session not completed by the end of its day moves to the next free
 * day in the same week. If the week has no free day, it is dropped. Never two
 * sessions on one day.
 *
 * The same rules govern a move she makes herself. Rule 5 still holds after any
 * move: two intensity-3 sessions never end up on consecutive days.
 *
 * Nothing here knows why a day was missed, and nothing built on it should
 * ever say so. The plan simply moves.
 */

export type Scheduled = {
  id: string;
  week: Week;
  date: ISODate;
  status: SessionStatus;
  intensity: number;
};

/** Still to do. */
export const isOpen = (session: Pick<Scheduled, 'status'>) =>
  session.status === 'planned' || session.status === 'moved';

/** Takes up its day: still to do, or done. A dropped session leaves its day free. */
const occupies = (session: Pick<Scheduled, 'status'>) => session.status !== 'dropped';

/** Would an intensity-3 session on `date` sit next to another one? */
function nextToIntense(sessions: readonly Scheduled[], id: string, date: ISODate): boolean {
  return sessions.some(
    (other) =>
      other.id !== id &&
      occupies(other) &&
      other.intensity >= 3 &&
      Math.abs(diffDays(other.date, date)) === 1,
  );
}

/**
 * The days this session could move to: free days in its own week, from `from`
 * onward, where it would not break rule 5. Its current day is not offered.
 */
export function moveTargets(
  sessions: readonly Scheduled[],
  planStart: ISODate,
  id: string,
  from: ISODate,
): ISODate[] {
  const session = sessions.find((item) => item.id === id);
  if (!session || !isOpen(session)) return [];

  const taken = new Set(
    sessions.filter((item) => item.id !== id && occupies(item)).map((item) => item.date),
  );
  const first = weekStart(planStart, session.week);
  const last = weekEnd(planStart, session.week);

  const targets: ISODate[] = [];
  for (let date = first > from ? first : from; date <= last; date = addDays(date, 1)) {
    if (date === session.date || taken.has(date)) continue;
    if (session.intensity >= 3 && nextToIntense(sessions, id, date)) continue;
    targets.push(date);
  }
  return targets;
}

/** Move a session to another day of its week. Throws if that day is not one of `moveTargets`. */
export function moveSession<T extends Scheduled>(
  sessions: readonly T[],
  planStart: ISODate,
  id: string,
  to: ISODate,
  today: ISODate,
): T[] {
  if (!moveTargets(sessions, planStart, id, today).includes(to)) {
    throw new PlanInputError('That session cannot move to that day.');
  }
  return sessions.map((session) =>
    session.id === id ? { ...session, date: to, status: 'moved' } : session,
  );
}

/**
 * Bring the plan up to date for `today`. Every session still to do whose day
 * has passed moves to the next free day of its week, or is dropped if there is
 * none. Sessions are taken in date order, so an earlier one gets the earlier day.
 */
export function reconcileMissed<T extends Scheduled>(
  sessions: readonly T[],
  planStart: ISODate,
  today: ISODate,
): { sessions: T[]; moved: string[]; dropped: string[] } {
  let current = [...sessions];
  const moved: string[] = [];
  const dropped: string[] = [];

  const overdue = current
    .filter((session) => isOpen(session) && session.date < today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  for (const session of overdue) {
    const [next] = moveTargets(current, planStart, session.id, today);
    current = current.map((item) => {
      if (item.id !== session.id) return item;
      return next ? { ...item, date: next, status: 'moved' } : { ...item, status: 'dropped' };
    });
    (next ? moved : dropped).push(session.id);
  }

  return { sessions: current, moved, dropped };
}

/**
 * Mark a session done. If she did it on a different day than planned and that
 * day is free, the session is recorded on the day she did it.
 */
export function completeSession<T extends Scheduled>(
  sessions: readonly T[],
  planStart: ISODate,
  id: string,
  today: ISODate,
): T[] {
  const session = sessions.find((item) => item.id === id);
  if (!session) throw new PlanInputError('Unknown session.');
  if (session.status === 'dropped')
    throw new PlanInputError('That session is no longer in the plan.');

  const dayIsFree = !sessions.some(
    (item) => item.id !== id && occupies(item) && item.date === today,
  );
  const week = Math.min(4, Math.max(1, weekOf(planStart, today))) as Week;
  const onTheDay = session.date !== today && dayIsFree ? { date: today, week } : {};

  return sessions.map((item) => (item.id === id ? { ...item, ...onTheDay, status: 'done' } : item));
}
