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
