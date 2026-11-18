import { addDays, isoWeekday, PlanInputError, START_HERE_SLUG } from '@engine';
import { createPlanService, PlanServiceError, type QuizInput } from '@shared/plan-service';

import { storage } from '@/lib/storage';

import { createLocalPlanStore, localCatalogue, readLocalPlan } from '../localStore';

/**
 * The plan service, run against the phone's own store: the same service the
 * Edge Function runs against Supabase.
 */
const USER = 'local';
/** Monday 2 November 2026. Her days are Mon, Wed, Fri. */
const MON = '2026-11-02';
const day = (n: number) => addDays(MON, n);

const answers: QuizInput = {
  goal: 'posture',
  level: 1,
  minutes: 20,
  weekdays: [1, 3, 5],
  equipment: ['mat'],
  workAround: ['none'],
  gentle: false,
};

let quiz: QuizInput | null;
const service = createPlanService(createLocalPlanStore(() => quiz));

beforeEach(() => {
  storage.clearAll();
  quiz = answers;
});

describe('building a plan', () => {
  it('refuses until the quiz is finished', async () => {
    quiz = null;
    await expect(service.build(USER, MON)).rejects.toThrow(PlanServiceError);
    await expect(service.build(USER, MON)).rejects.toMatchObject({ code: 'no_answers' });
  });

  it('builds 28 days from her answers and saves them', async () => {
    const plan = await service.build(USER, MON);

    expect(plan).toMatchObject({ block: 1, startDate: MON, endDate: day(27), status: 'active' });
    expect(plan.profile).toEqual({ ...answers, intensityShift: 0 });
    expect(plan.sessions).toHaveLength(12);
    expect(new Set(plan.sessions.map((session) => session.id)).size).toBe(12);
    for (const session of plan.sessions) {
      expect(session).toMatchObject({
        status: 'planned',
        completedAt: null,
        originalDate: session.date,
      });
      expect([1, 3, 5]).toContain(isoWeekday(session.date));
    }

    const first = localCatalogue.find((cls) => cls.id === plan.sessions[0].classIds[0]);
    expect(first?.slug).toBe(START_HERE_SLUG);

    // It is on the phone, and it is what `current` returns.
    expect(readLocalPlan()).toEqual(plan);
    expect(await service.current(USER, MON)).toEqual(plan);
  });

  it('replaces the plan she had when it is built again', async () => {
    const first = await service.build(USER, MON);
    const second = await service.build(USER, day(1));
    expect(second.id).not.toBe(first.id);
    expect(second.startDate).toBe(day(1));
    expect((await service.current(USER, day(1)))?.id).toBe(second.id);
  });

  it('rejects a date it cannot read', async () => {
    await expect(service.build(USER, 'today')).rejects.toThrow(PlanInputError);
  });
});

describe('her plan today', () => {
  it('is nothing before she has one', async () => {
    expect(await service.current(USER, MON)).toBeNull();
  });

  it('is unchanged when nothing is overdue', async () => {
    const plan = await service.build(USER, MON);
    expect(await service.current(USER, MON)).toEqual(plan);
    expect((await service.current(USER, MON))?.movedNoticeDate).toBeNull();
  });

  it('moves a missed session to the next free day and remembers that it did', async () => {
    const plan = await service.build(USER, MON);
    const monday = plan.sessions[0];

    // She did not train on Monday. She opens the app on Tuesday.
    const tuesday = await service.current(USER, day(1));
    const moved = tuesday!.sessions.find((session) => session.id === monday.id)!;

    expect(moved).toMatchObject({ date: day(1), status: 'moved', originalDate: MON });
    expect(tuesday!.movedNoticeDate).toBe(day(1));
    // Saved, not just returned.
    expect(readLocalPlan()).toEqual(tuesday);
    // Opening the app again the same day changes nothing more.
    expect(await service.current(USER, day(1))).toEqual(tuesday);
  });

  it('drops what cannot fit once the week is over, without touching the weeks ahead', async () => {
    await service.build(USER, MON);
    const later = await service.current(USER, day(7)); // the following Monday
    const weekOne = later!.sessions.filter((session) => session.week === 1);
    expect(weekOne.every((session) => session.status === 'dropped')).toBe(true);
    expect(
      later!.sessions.filter((session) => session.week > 1).every((s) => s.status === 'planned'),
    ).toBe(true);
  });
});

describe('moving and completing', () => {
  it('moves a session to another free day of its week', async () => {
    const plan = await service.build(USER, MON);
    const wednesday = plan.sessions[1];
    const after = await service.move(USER, wednesday.id, day(3), MON);

    expect(after.sessions.find((s) => s.id === wednesday.id)).toMatchObject({
      date: day(3),
      status: 'moved',
    });
    expect(readLocalPlan()).toEqual(after);
  });

  it('refuses a move to a taken day, and leaves the plan as it was', async () => {
    const plan = await service.build(USER, MON);
    await expect(service.move(USER, plan.sessions[1].id, day(4), MON)).rejects.toThrow(
      PlanInputError,
    );
    expect(readLocalPlan()).toEqual(plan);
  });

  it('marks a session done, with the time she finished', async () => {
    const plan = await service.build(USER, MON);
    const finished = '2026-11-02T07:45:00.000Z';
    const after = await service.complete(USER, plan.sessions[0].id, MON, finished);

    expect(after.sessions[0]).toMatchObject({ status: 'done', completedAt: finished, date: MON });
    expect(readLocalPlan()).toEqual(after);
  });

  it('completing twice changes nothing the second time', async () => {
    const plan = await service.build(USER, MON);
    const once = await service.complete(USER, plan.sessions[0].id, MON, '2026-11-02T07:45:00.000Z');
    const twice = await service.complete(
      USER,
      plan.sessions[0].id,
      MON,
      '2026-11-02T19:00:00.000Z',
    );
    expect(twice).toEqual(once);
  });

  it('records an early session on the day she did it', async () => {
    // Built on a Tuesday; her first session is Wednesday. She does it straight away.
    const plan = await service.build(USER, day(1));
    expect(plan.sessions[0].date).toBe(day(2));
    const after = await service.complete(
      USER,
      plan.sessions[0].id,
      day(1),
      '2026-11-03T18:00:00.000Z',
    );
    expect(after.sessions[0]).toMatchObject({ status: 'done', date: day(1), originalDate: day(2) });
  });

  it('needs a plan', async () => {
    await expect(service.move(USER, 'x', day(1), MON)).rejects.toMatchObject({ code: 'no_plan' });
    await expect(service.complete(USER, 'x', MON, 'now')).rejects.toMatchObject({
      code: 'no_plan',
    });
  });
});

describe('rule 10: when the 28 days are over', () => {
  const completeAll = async (count: number) => {
    const plan = await service.build(USER, MON);
    for (const session of plan.sessions.slice(0, count)) {
      await service.complete(USER, session.id, session.date, `${session.date}T08:00:00.000Z`);
    }
    return plan;
  };

  it('still shows the first block on day 28', async () => {
    const plan = await completeAll(12);
    expect((await service.current(USER, day(27)))?.id).toBe(plan.id);
  });

  it('builds the next block the day after, one step harder', async () => {
    const first = await completeAll(12);
    const next = await service.current(USER, day(28));

    expect(next).toMatchObject({
      block: 2,
      startDate: day(28),
      endDate: day(55),
      status: 'active',
    });
    expect(next!.id).not.toBe(first.id);
    expect(next!.profile.intensityShift).toBe(1);
    expect(next!.sessions).toHaveLength(12);
    // It does not send her back to "Start here".
    const opener = localCatalogue.find((cls) => cls.id === next!.sessions[0].classIds[0]);
    expect(opener?.slug).not.toBe(START_HERE_SLUG);
  });

  it('keeps the same step if she did less than half of the last block', async () => {
    await completeAll(5);
    const next = await service.current(USER, day(28));
    expect(next!.block).toBe(2);
    expect(next!.profile.intensityShift).toBe(0);
  });

  it('steps up at exactly half', async () => {
    await completeAll(6);
    expect((await service.current(USER, day(28)))!.profile.intensityShift).toBe(1);
  });

  it('starts the new block today if she has been away, not in the past', async () => {
    await completeAll(12);
    const back = day(28 + 40);
    const next = await service.current(USER, back);
    expect(next!.startDate).toBe(back);
    expect(next!.sessions.every((session) => session.date >= back)).toBe(true);
    expect(next!.sessions.every((session) => session.status === 'planned')).toBe(true);
  });
});

describe('rule 8: rating a session', () => {
  /** Build a plan and finish its first `count` sessions, each on its own day. */
  const withDone = async (count: number, overrides: Partial<QuizInput> = {}) => {
    quiz = { ...answers, ...overrides };
    let plan = await service.build(USER, MON);
    const ids = plan.sessions.slice(0, count).map((session) => session.id);
    for (const [index, id] of ids.entries()) {
      plan = await service.complete(
        USER,
        id,
        plan.sessions[index].date,
        `${plan.sessions[index].date}T08:00:00.000Z`,
      );
    }
    return { plan, ids };
  };
  const at = (n: number) => `2026-11-${String(2 + n).padStart(2, '0')}T09:00:00.000Z`;
  const intensityOf = (id: string) => localCatalogue.find((cls) => cls.id === id)!.intensity;
  const focusOf = (id: string) => localCatalogue.find((cls) => cls.id === id)!.focus;

  it('saves the rating and changes nothing after a single "too hard"', async () => {
    const { plan, ids } = await withDone(1);
    const result = await service.rate(USER, ids[0], 'hard', MON, at(0));
    expect(result.effect).toBeNull();
    expect(result.plan.sessions).toEqual(plan.sessions);
  });

  it('changes nothing for "just right"', async () => {
    const { ids } = await withDone(2);
    await service.rate(USER, ids[0], 'right', MON, at(0));
    expect((await service.rate(USER, ids[1], 'right', day(2), at(2))).effect).toBeNull();
  });

  it('two "too hard" in a row ease next week and add a foundations class', async () => {
    // An improver, so there is intensity to take away.
    const { plan, ids } = await withDone(2, { level: 2, goal: 'tone' });
    await service.rate(USER, ids[0], 'hard', MON, at(0));
    const { plan: eased, effect } = await service.rate(USER, ids[1], 'hard', day(2), at(2));

    expect(effect).toBe('eased');
    expect(eased.profile.intensityShift).toBe(-1);
    expect(eased.adjustedAt).toBe(at(2));

    // This week is exactly as it was.
    const week = (p: typeof plan, n: number) => p.sessions.filter((session) => session.week === n);
    expect(week(eased, 1).map((s) => s.classIds)).toEqual(week(plan, 1).map((s) => s.classIds));

    // Next week has the same days, a foundations class, and nothing above the lower cap.
    expect(week(eased, 2).map((s) => s.date)).toEqual(week(plan, 2).map((s) => s.date));
    expect(week(eased, 2).some((s) => focusOf(s.classIds[0]) === 'foundations')).toBe(true);
    for (const session of eased.sessions.filter((s) => s.week >= 2)) {
      for (const id of session.classIds)
        expect(intensityOf(id)).toBeLessThanOrEqual(session.week >= 3 ? 2 : 1);
    }
    expect(readLocalPlan()).toEqual(eased);
  });

  it('two "too easy" in a row step next week up', async () => {
    const { ids } = await withDone(2);
    await service.rate(USER, ids[0], 'easy', MON, at(0));
    const { plan: harder, effect } = await service.rate(USER, ids[1], 'easy', day(2), at(2));
    expect(effect).toBe('stepped_up');
    expect(harder.profile.intensityShift).toBe(1);
    expect(harder.profile.minutes).toBe(20);
  });

  it('lengthens sessions instead when she is already at the top', async () => {
    // Gentle track: intensity is capped at 2, and a beginner's weeks already reach it.
    const { ids } = await withDone(4, {
      gentle: true,
      workAround: ['pregnant_postpartum'],
      minutes: 10,
    });
    await service.rate(USER, ids[0], 'easy', MON, at(0));
    const first = await service.rate(USER, ids[1], 'easy', day(2), at(2));
    expect(first.effect).toBe('stepped_up'); // week 1's cap rises from 1 to 2
    await service.rate(USER, ids[2], 'easy', day(4), at(4));
    const second = await service.rate(USER, ids[3], 'easy', day(7), at(7));
    expect(second.effect).toBe('longer');
    expect(second.plan.profile.minutes).toBe(20);
    expect(second.plan.profile.intensityShift).toBe(1);
  });

  it('acts once on each pair: a third "too hard" needs a fourth', async () => {
    const { ids } = await withDone(4, { level: 2 });
    await service.rate(USER, ids[0], 'hard', MON, at(0));
    expect((await service.rate(USER, ids[1], 'hard', day(2), at(2))).effect).toBe('eased');
    expect((await service.rate(USER, ids[2], 'hard', day(4), at(4))).effect).toBeNull();
    const fourth = await service.rate(USER, ids[3], 'hard', day(7), at(7));
    expect(fourth.effect).toBe('eased');
    expect(fourth.plan.profile.intensityShift).toBe(-2);
  });

  it('a mixed pair changes nothing', async () => {
    const { ids } = await withDone(2);
    await service.rate(USER, ids[0], 'hard', MON, at(0));
    expect((await service.rate(USER, ids[1], 'easy', day(2), at(2))).effect).toBeNull();
  });

  it('rates a session once: a second rating is ignored', async () => {
    const { ids } = await withDone(2);
    await service.rate(USER, ids[0], 'hard', MON, at(0));
    const again = await service.rate(USER, ids[0], 'hard', MON, at(1));
    expect(again.effect).toBeNull();
    // Still only one "too hard" on record, so the next one makes the pair.
    expect((await service.rate(USER, ids[1], 'hard', day(2), at(2))).effect).toBe('eased');
  });

  it('only a finished session can be rated', async () => {
    const plan = await service.build(USER, MON);
    await expect(service.rate(USER, plan.sessions[0].id, 'right', MON, at(0))).rejects.toThrow(
      PlanInputError,
    );
    await expect(service.rate(USER, 'nope', 'right', MON, at(0))).rejects.toThrow(PlanInputError);
  });

  it('in the last week the change is kept for the next block', async () => {
    const { plan, ids } = await withDone(12, { level: 2 });
    await service.rate(USER, ids[10], 'hard', day(23), at(21));
    const result = await service.rate(USER, ids[11], 'hard', day(25), at(23));
    expect(result.effect).toBe('eased');
    expect(result.plan.profile.intensityShift).toBe(-1);
    expect(result.plan.sessions.map((s) => s.id)).toEqual(plan.sessions.map((s) => s.id));
    // The next block steps up from the eased level: back to where she started.
    const next = await service.current(USER, day(28));
    expect(next!.profile.intensityShift).toBe(0);
  });
});

describe('"Adjust my plan"', () => {
  it('lays the rest of the plan out on her new days and keeps what she has done', async () => {
    const plan = await service.build(USER, MON);
    const done = await service.complete(USER, plan.sessions[0].id, MON, '2026-11-02T08:00:00.000Z');

    // On Tuesday she switches from Mon, Wed, Fri to Tue and Thu.
    const adjusted = await service.adjust(USER, { weekdays: [4, 2], minutes: 20 }, day(1));

    expect(adjusted.profile.weekdays).toEqual([2, 4]);
    expect(adjusted.sessions[0]).toEqual(done.sessions[0]);
    const open = adjusted.sessions.filter((session) => session.status === 'planned');
    for (const session of open) expect([2, 4]).toContain(isoWeekday(session.date));
    // Tuesday to the end of the 28 days: eight Tuesdays and Thursdays.
    expect(open).toHaveLength(8);
    expect(open[0].date).toBe(day(1));
    expect(open.every((session) => session.date <= plan.endDate)).toBe(true);
    expect(new Set(adjusted.sessions.map((session) => session.date)).size).toBe(
      adjusted.sessions.length,
    );
    expect(readLocalPlan()).toEqual(adjusted);
  });

  it('changes her session length from here on', async () => {
    const plan = await service.build(USER, MON);
    const adjusted = await service.adjust(USER, { weekdays: [1, 3, 5], minutes: 10 }, MON);
    expect(adjusted.profile.minutes).toBe(10);
    expect(adjusted.sessions).toHaveLength(plan.sessions.length);
    for (const session of adjusted.sessions) {
      const minutes = session.classIds.reduce(
        (sum, id) => sum + localCatalogue.find((cls) => cls.id === id)!.lengthMin,
        0,
      );
      expect(minutes).toBe(10);
    }
  });

  it('starts tomorrow if today’s session is already done', async () => {
    const plan = await service.build(USER, MON);
    await service.complete(USER, plan.sessions[0].id, MON, '2026-11-02T08:00:00.000Z');
    const adjusted = await service.adjust(USER, { weekdays: [1, 2, 3, 4, 5], minutes: 20 }, MON);
    const dates = adjusted.sessions.map((session) => session.date);
    expect(dates.filter((date) => date === MON)).toHaveLength(1);
    expect(dates[1]).toBe(day(1));
  });

  it('still opens with "Start here" if she has not begun', async () => {
    await service.build(USER, MON);
    const adjusted = await service.adjust(USER, { weekdays: [2, 4], minutes: 20 }, MON);
    const first = localCatalogue.find((cls) => cls.id === adjusted.sessions[0].classIds[0]);
    expect(first?.slug).toBe(START_HERE_SLUG);
    expect(adjusted.sessions[0].date).toBe(day(1));
  });

  it('refuses days it cannot plan from, and leaves the plan alone', async () => {
    const plan = await service.build(USER, MON);
    await expect(service.adjust(USER, { weekdays: [], minutes: 20 }, MON)).rejects.toThrow(
      PlanInputError,
    );
    expect(readLocalPlan()).toEqual(plan);
  });
});

describe('history, for the Progress tab', () => {
  it('keeps the plans she has finished and her ratings', async () => {
    const store = createLocalPlanStore(() => quiz);
    const first = await service.build(USER, MON);
    await service.complete(USER, first.sessions[0].id, MON, '2026-11-02T08:00:00.000Z');
    await service.rate(USER, first.sessions[0].id, 'right', MON, '2026-11-02T08:30:00.000Z');
    await service.current(USER, day(28)); // rolls into block 2

    const plans = await store.listPlans(USER);
    expect(plans.map((plan) => [plan.block, plan.status])).toEqual([
      [1, 'completed'],
      [2, 'active'],
    ]);
    expect(plans[0].sessions[0].status).toBe('done');
    expect(await store.listRatings(USER)).toEqual([
      {
        planId: first.id,
        sessionId: first.sessions[0].id,
        rating: 'right',
        createdAt: '2026-11-02T08:30:00.000Z',
      },
    ]);
  });
});
