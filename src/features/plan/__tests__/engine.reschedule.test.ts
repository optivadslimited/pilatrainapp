import {
  completeSession,
  moveSession,
  moveTargets,
  PlanInputError,
  reconcileMissed,
  type Scheduled,
  type SessionStatus,
  type Week,
} from '@engine';

/**
 * Rule 9. A week starting Monday 2 November 2026, so the dates read easily:
 * Mon 02, Tue 03, Wed 04, Thu 05, Fri 06, Sat 07, Sun 08. Week 2 starts Mon 09.
 */
const START = '2026-11-02';
const day = (n: number) => `2026-11-${String(n).padStart(2, '0')}`;

const session = (
  id: string,
  date: number,
  status: SessionStatus = 'planned',
  intensity = 1,
): Scheduled => ({ id, date: day(date), week: (date <= 8 ? 1 : 2) as Week, status, intensity });

const at = (sessions: readonly Scheduled[], id: string) => sessions.find((item) => item.id === id)!;

const oneADay = (sessions: readonly Scheduled[]) => {
  const live = sessions.filter((item) => item.status !== 'dropped').map((item) => item.date);
  expect(new Set(live).size).toBe(live.length);
};

describe('rule 9: a missed session moves to the next free day of its week', () => {
  const week = [session('mon', 2), session('wed', 4), session('fri', 6)];

  it('moves to the next free day', () => {
    // Monday was not done. It is now Tuesday.
    const result = reconcileMissed(week, START, day(3));
    expect(at(result.sessions, 'mon')).toMatchObject({ date: day(3), status: 'moved', week: 1 });
    expect(result.moved).toEqual(['mon']);
    expect(result.dropped).toEqual([]);
  });

  it('skips days that already hold a session', () => {
    // Monday was not done, and she opens the app on Wednesday, which has its own session.
    const result = reconcileMissed(week, START, day(4));
    expect(at(result.sessions, 'mon').date).toBe(day(5));
    expect(at(result.sessions, 'wed').date).toBe(day(4));
    oneADay(result.sessions);
  });

  it('never moves a session into a day that has already gone', () => {
    const result = reconcileMissed(week, START, day(5));
    // Monday and Wednesday are both overdue on Thursday.
    expect(at(result.sessions, 'mon').date).toBe(day(5));
    expect(at(result.sessions, 'wed').date).toBe(day(7));
    expect(at(result.sessions, 'fri').date).toBe(day(6));
    for (const item of result.sessions) expect(item.date >= day(5)).toBe(true);
    oneADay(result.sessions);
  });

  it('gives the earlier free day to the earlier session', () => {
    const result = reconcileMissed(week, START, day(5));
    expect(at(result.sessions, 'mon').date < at(result.sessions, 'wed').date).toBe(true);
    expect(result.moved).toEqual(['mon', 'wed']);
  });

  it('drops a session when its week has no free day left', () => {
    // Friday's session, the only one not done. On Sunday, Sunday is still free: it moves.
    const friOnly = [session('mon', 2, 'done'), session('wed', 4, 'done'), session('fri', 6)];
    expect(at(reconcileMissed(friOnly, START, day(8)).sessions, 'fri')).toMatchObject({
      date: day(8),
      status: 'moved',
    });

    // On the Monday after, week 1 is over. Whatever was not done is dropped.
    const result = reconcileMissed(week, START, day(9));
    for (const id of ['mon', 'wed', 'fri']) expect(at(result.sessions, id).status).toBe('dropped');
    expect(result.dropped).toEqual(['mon', 'wed', 'fri']);
    expect(result.moved).toEqual([]);
  });

  it('drops only as many as do not fit', () => {
    // A full week, five sessions, nothing done by Saturday. Two days are left.
    const full = [
      session('a', 2),
      session('b', 3),
      session('c', 4),
      session('d', 5),
      session('e', 6),
    ];
    const result = reconcileMissed(full, START, day(7));
    expect(result.moved).toEqual(['a', 'b']);
    expect(result.dropped).toEqual(['c', 'd', 'e']);
    expect(at(result.sessions, 'a').date).toBe(day(7));
    expect(at(result.sessions, 'b').date).toBe(day(8));
    oneADay(result.sessions);
  });

  it('never moves a session into the next week', () => {
    const twoWeeks = [...week, session('next-mon', 9), session('next-wed', 11)];
    const result = reconcileMissed(twoWeeks, START, day(10));
    for (const id of ['mon', 'wed', 'fri']) expect(at(result.sessions, id).status).toBe('dropped');
    // Week 2's Monday moves within week 2.
    expect(at(result.sessions, 'next-mon')).toMatchObject({
      date: day(10),
      week: 2,
      status: 'moved',
    });
    expect(at(result.sessions, 'next-wed').date).toBe(day(11));
  });

  it('leaves done sessions and future sessions alone', () => {
    const sessions = [session('mon', 2, 'done'), session('wed', 4), session('fri', 6)];
    const result = reconcileMissed(sessions, START, day(4));
    expect(result.sessions).toEqual(sessions);
    expect(result.moved).toEqual([]);
  });

  it('treats a day whose session was done as taken, and a dropped one as free', () => {
    const sessions = [session('mon', 2), session('tue', 3, 'done'), session('wed', 4, 'dropped')];
    const result = reconcileMissed(sessions, START, day(3));
    // Tuesday is taken by a done session; Wednesday's was dropped, so it is free.
    expect(at(result.sessions, 'mon').date).toBe(day(4));
  });

  it('moves a session that was already moved once', () => {
    const sessions = [session('mon', 3, 'moved'), session('fri', 6)];
    const result = reconcileMissed(sessions, START, day(5));
    expect(at(result.sessions, 'mon')).toMatchObject({ date: day(5), status: 'moved' });
  });

  it('does nothing when nothing is overdue, and is safe to run twice', () => {
    expect(reconcileMissed(week, START, day(2)).sessions).toEqual(week);
    const once = reconcileMissed(week, START, day(4));
    const twice = reconcileMissed(once.sessions, START, day(4));
    expect(twice.sessions).toEqual(once.sessions);
    expect(twice.moved).toEqual([]);
  });

  it('keeps rule 5: will not land an intensity-3 session beside another one', () => {
    const sessions = [session('mon', 2, 'planned', 3), session('thu', 5, 'planned', 3)];
    // On Tuesday: Tue is free and not next to Thursday. Fine.
    expect(at(reconcileMissed(sessions, START, day(3)).sessions, 'mon').date).toBe(day(3));
    // On Wednesday: Wed and Fri sit beside Thursday's intensity 3, so it goes to Saturday.
    expect(at(reconcileMissed(sessions, START, day(4)).sessions, 'mon').date).toBe(day(7));
  });

  it('drops an intensity-3 session rather than break rule 5', () => {
    const sessions = [session('fri', 6, 'planned', 3), session('sun', 8, 'planned', 3)];
    // Saturday is the only free day left, and it is beside Sunday's intensity 3.
    const result = reconcileMissed(sessions, START, day(7));
    expect(at(result.sessions, 'fri').status).toBe('dropped');
  });
});

describe('moving a session herself', () => {
  const week = [
    session('mon', 2, 'done'),
    session('wed', 4),
    session('fri', 6),
    session('next', 9),
  ];

  it('offers the free days left in that session’s week, from today', () => {
    // It is Tuesday. Wednesday's session can go to Tue, Thu, Sat or Sun.
    expect(moveTargets(week, START, 'wed', day(3))).toEqual([day(3), day(5), day(7), day(8)]);
  });

  it('never offers a past day, a taken day, its own day or another week', () => {
    const targets = moveTargets(week, START, 'fri', day(5));
    expect(targets).toEqual([day(5), day(7), day(8)]);
    expect(targets).not.toContain(day(4));
    expect(targets).not.toContain(day(6));
    expect(targets).not.toContain(day(9));
  });

  it('offers nothing for a session that is done or dropped', () => {
    expect(moveTargets(week, START, 'mon', day(3))).toEqual([]);
    expect(moveTargets([session('x', 4, 'dropped')], START, 'x', day(3))).toEqual([]);
    expect(moveTargets(week, START, 'nope', day(3))).toEqual([]);
  });

  it('moves the session and marks it moved', () => {
    const moved = moveSession(week, START, 'wed', day(5), day(3));
    expect(at(moved, 'wed')).toMatchObject({ date: day(5), status: 'moved', week: 1 });
    expect(at(moved, 'fri')).toEqual(at(week, 'fri'));
    oneADay(moved);
  });

  it('refuses a day that is not on offer', () => {
    expect(() => moveSession(week, START, 'wed', day(6), day(3))).toThrow(PlanInputError); // taken
    expect(() => moveSession(week, START, 'wed', day(2), day(3))).toThrow(PlanInputError); // past
    expect(() => moveSession(week, START, 'wed', day(10), day(3))).toThrow(PlanInputError); // next week
    expect(() => moveSession(week, START, 'mon', day(5), day(3))).toThrow(PlanInputError); // done
  });

  it('will not offer a day that puts two intensity-3 sessions side by side', () => {
    const sessions = [session('a', 2, 'planned', 3), session('b', 5, 'planned', 3)];
    expect(moveTargets(sessions, START, 'a', day(2))).toEqual([day(3), day(7), day(8)]);
  });
});

describe('completing a session', () => {
  const week = [session('mon', 2), session('wed', 4), session('fri', 6)];

  it('marks it done on its day', () => {
    const done = completeSession(week, START, 'mon', day(2));
    expect(at(done, 'mon')).toMatchObject({ status: 'done', date: day(2) });
  });

  it('records it on the day she did it, if she did it early on a free day', () => {
    // She does Wednesday's session on Tuesday.
    const done = completeSession(week, START, 'wed', day(3));
    expect(at(done, 'wed')).toMatchObject({ status: 'done', date: day(3), week: 1 });
    oneADay(done);
  });

  it('keeps its date if that day already holds another session', () => {
    const done = completeSession(week, START, 'fri', day(4));
    expect(at(done, 'fri')).toMatchObject({ status: 'done', date: day(6) });
  });

  it('refuses an unknown or dropped session', () => {
    expect(() => completeSession(week, START, 'nope', day(2))).toThrow(PlanInputError);
    expect(() => completeSession([session('x', 2, 'dropped')], START, 'x', day(2))).toThrow(
      PlanInputError,
    );
  });
});
