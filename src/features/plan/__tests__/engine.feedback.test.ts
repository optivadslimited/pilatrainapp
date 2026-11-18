import {
  addDays,
  buildNextBlock,
  buildPlan,
  easier,
  feedbackSignal,
  harder,
  isoWeekday,
  replan,
  START_HERE_SLUG,
  weekCap,
  WEEKS,
  type BuiltPlan,
  type ExistingSession,
  type Rating,
} from '@engine';

import { cls, lookup, MONDAY, profile, richCatalogue } from './fixtures';

const rich = richCatalogue();
const find = lookup(rich);
const caps = (p: ReturnType<typeof profile>) => WEEKS.map((week) => weekCap(p, week));

const asExisting = (plan: BuiltPlan, doneThrough = 0): ExistingSession[] =>
  plan.sessions.map((session, index) => ({
    week: session.week,
    date: session.date,
    classIds: session.classIds,
    status: index < doneThrough ? 'done' : 'planned',
  }));

describe('rule 8: what her ratings ask for', () => {
  it.each<[Rating[], ReturnType<typeof feedbackSignal>]>([
    [[], null],
    [['hard'], null],
    [['hard', 'hard'], 'lower'],
    [['easy', 'easy'], 'raise'],
    [['right', 'right'], null],
    [['hard', 'right'], null],
    [['hard', 'easy'], null],
    [['easy', 'hard', 'hard'], 'lower'],
    [['hard', 'hard', 'right'], null],
    [['hard', 'easy', 'easy'], 'raise'],
  ])('%j → %s', (ratings, signal) => {
    expect(feedbackSignal(ratings)).toBe(signal);
  });
});

describe('rule 8: two "too hard" in a row', () => {
  it('lowers intensity by one', () => {
    const before = profile({ level: 2 });
    const { profile: after, change } = easier(before, rich);
    expect(change).toBe('intensity');
    expect(caps(before)).toEqual([2, 2, 3, 3]);
    expect(caps(after)).toEqual([1, 1, 2, 2]);
  });

  it('never goes below the gentlest classes', () => {
    let current = profile({ level: 1 });
    current = easier(current, rich).profile;
    expect(caps(current)).toEqual([1, 1, 1, 1]);
    const again = easier(current, rich);
    expect(again.change).toBe('none');
    expect(again.profile).toEqual(current);
  });

  it('re-plans next week within the lower cap and adds a foundations class', () => {
    const original = profile({ level: 2, goal: 'tone' });
    const plan = buildPlan({ profile: original, catalogue: rich, from: MONDAY });
    const lowered = easier(original, rich).profile;

    // She has done week 1 and found the last two too hard.
    const existing = asExisting(plan, 3);
    const result = replan({
      profile: lowered,
      catalogue: rich,
      sessions: existing,
      fromWeek: 2,
      addFoundations: true,
    });

    // Week 1 is untouched.
    expect(result.sessions.slice(0, 3)).toEqual([null, null, null]);

    const next = result.sessions.filter((session) => session?.week === 2);
    expect(next).toHaveLength(3);
    for (const session of next) expect(session!.intensity).toBeLessThanOrEqual(weekCap(lowered, 2));
    expect(next.some((session) => session!.focus === 'foundations')).toBe(true);

    // And the weeks after stay within the lowered caps too.
    for (const session of result.sessions) {
      if (session) expect(session.intensity).toBeLessThanOrEqual(weekCap(lowered, session.week));
    }
    expect(result.relaxed).toEqual([]);
  });

  it('still closes each re-planned week with mobility', () => {
    const plan = buildPlan({ profile: profile({ level: 2 }), catalogue: rich, from: MONDAY });
    const result = replan({
      profile: easier(plan.profile, rich).profile,
      catalogue: rich,
      sessions: asExisting(plan, 3),
      fromWeek: 2,
      addFoundations: true,
    });
    for (const week of [2, 3, 4]) {
      const sessions = result.sessions.filter((session) => session?.week === week);
      expect(sessions[sessions.length - 1]!.focus).toBe('mobility');
    }
  });

  it('keeps sessions that are done, and the days of the ones it re-plans', () => {
    const plan = buildPlan({ profile: profile(), catalogue: rich, from: MONDAY });
    const existing = asExisting(plan, 5); // week 1 and two sessions of week 2
    const result = replan({
      profile: plan.profile,
      catalogue: rich,
      sessions: existing,
      fromWeek: 2,
    });

    result.sessions.forEach((session, index) => {
      if (index < 5) expect(session).toBeNull();
      else
        expect(session).toMatchObject({ date: existing[index].date, week: existing[index].week });
    });
  });

  it('counts what she has already done towards "no class more than twice"', () => {
    const plan = buildPlan({ profile: profile(), catalogue: rich, from: MONDAY });
    const existing = asExisting(plan, 6);
    const result = replan({
      profile: plan.profile,
      catalogue: rich,
      sessions: existing,
      fromWeek: 3,
    });

    const uses = new Map<string, number>();
    existing.forEach((session, index) => {
      for (const id of result.sessions[index]?.classIds ?? session.classIds) {
        uses.set(id, (uses.get(id) ?? 0) + 1);
      }
    });
    for (const count of uses.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it('leaves dropped sessions out and changes nothing when nothing is left to plan', () => {
    const plan = buildPlan({ profile: profile(), catalogue: rich, from: MONDAY });
    const existing = asExisting(plan).map((session, index) =>
      index === 4 ? { ...session, status: 'dropped' as const } : session,
    );
    const result = replan({
      profile: plan.profile,
      catalogue: rich,
      sessions: existing,
      fromWeek: 2,
    });
    expect(result.sessions[4]).toBeNull();

    const allDone = asExisting(plan, 12);
    expect(
      replan({ profile: plan.profile, catalogue: rich, sessions: allDone, fromWeek: 1 }).sessions,
    ).toEqual(allDone.map(() => null));
  });
});

describe('rule 8: two "too easy" in a row', () => {
  it('raises intensity by one', () => {
    const before = profile({ level: 1 });
    const { profile: after, change } = harder(before, rich);
    expect(change).toBe('intensity');
    expect(caps(before)).toEqual([1, 2, 2, 2]);
    expect(caps(after)).toEqual([2, 3, 3, 3]);
  });

  it('lengthens sessions by one step if she is already at the top', () => {
    // A beginner can only be given level-1 classes, and these stop at intensity 2.
    let current = profile({ level: 1, minutes: 10 });
    current = harder(current, rich).profile; // week 1 rises from 1 to 2
    const step = harder(current, rich);
    expect(step.change).toBe('length');
    expect(step.profile.minutes).toBe(20);
    expect(harder(step.profile, rich).profile.minutes).toBe(30);
  });

  it('treats the gentle cap as the top', () => {
    const gentle = profile({ level: 2, gentle: true, minutes: 20 });
    expect(caps(gentle)).toEqual([2, 2, 2, 2]);
    const step = harder(gentle, rich);
    expect(step.change).toBe('length');
    expect(step.profile.minutes).toBe(30);
    expect(caps(step.profile)).toEqual([2, 2, 2, 2]);
  });

  it('changes nothing once she is at the top of both', () => {
    const top = profile({ level: 2, intensityShift: 1, minutes: 30 });
    expect(caps(top)).toEqual([3, 3, 3, 3]);
    const step = harder(top, rich);
    expect(step.change).toBe('none');
    expect(step.profile).toEqual(top);
  });

  it('looks at the classes she can actually be given, not the scale', () => {
    // Nothing above intensity 1 exists for her, so "harder" can only mean longer.
    const flat = [
      cls({ slug: 'a', intensity: 1, lengthMin: 10 }),
      cls({ slug: 'b', intensity: 1, lengthMin: 20 }),
    ];
    expect(harder(profile({ minutes: 10 }), flat).change).toBe('length');
  });
});

describe('rule 10: the next block', () => {
  const first = buildPlan({
    profile: profile({ weekdays: [1, 3, 5] }),
    catalogue: rich,
    from: MONDAY,
  });
  const last = first.sessions[first.sessions.length - 1];
  const next = buildNextBlock({
    previous: first,
    catalogue: rich,
    before: { date: last.date, intensity: last.intensity, classIds: last.classIds },
  });

  it('starts the day after the last one ends and runs 28 days', () => {
    expect(next.startDate).toBe(addDays(first.endDate, 1));
    expect(next.endDate).toBe(addDays(first.endDate, 28));
    expect(next.block).toBe(2);
  });

  it('keeps her days and the number of sessions', () => {
    expect(next.sessions).toHaveLength(12);
    for (const session of next.sessions) expect([1, 3, 5]).toContain(isoWeekday(session.date));
  });

  it('is one step harder', () => {
    expect(next.profile.intensityShift).toBe(first.profile.intensityShift + 1);
    const total = (plan: BuiltPlan) =>
      plan.sessions.reduce((sum, session) => sum + session.intensity, 0);
    expect(total(next)).toBeGreaterThan(total(first));
  });

  it('gets longer instead when she is already at the top', () => {
    const top = buildPlan({
      profile: profile({ level: 2, intensityShift: 1, minutes: 20 }),
      catalogue: rich,
      from: MONDAY,
    });
    const after = buildNextBlock({ previous: top, catalogue: rich });
    expect(after.profile.minutes).toBe(30);
    expect(after.profile.intensityShift).toBe(1);
  });

  it('does not send her back to "Start here"', () => {
    const slugs = next.sessions.flatMap((session) => session.classIds.map((id) => find(id).slug));
    expect(slugs[0]).not.toBe(START_HERE_SLUG);
  });

  it('does not open with the class that closed the last block', () => {
    for (const id of next.sessions[0].classIds) expect(last.classIds).not.toContain(id);
  });

  it('follows every rule too', () => {
    expect(next.relaxed).toEqual([]);
  });
});
