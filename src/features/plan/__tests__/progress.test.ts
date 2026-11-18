import { addDays } from '@engine';
import { createPlanService, type QuizInput } from '@shared/plan-service';

import { storage } from '@/lib/storage';

import { indexCatalogue } from '../cards';
import { createLocalPlanStore, localCatalogue } from '../localStore';
import { planTabView } from '../planTab';
import { afterClassView, feelLine, progressView, totals } from '../progress';

/**
 * The Progress tab, the after-class screen and the Plan tab, worked out from
 * real plans built by the real service.
 */
const USER = 'local';
/** Monday 2 November 2026. Her days are Mon, Wed, Fri. */
const MON = '2026-11-02';
const day = (n: number) => addDays(MON, n);
const catalogue = indexCatalogue(localCatalogue);

const answers: QuizInput = {
  goal: 'posture',
  level: 1,
  minutes: 20,
  weekdays: [1, 3, 5],
  equipment: ['mat'],
  workAround: ['none'],
  gentle: false,
};

const store = createLocalPlanStore(() => answers);
const service = createPlanService(store);

beforeEach(() => storage.clearAll());

const history = async () => ({
  plans: await store.listPlans(USER),
  ratings: await store.listRatings(USER),
});

/** Finish the sessions at these positions, each on its own day. */
async function finish(indexes: number[]) {
  let plan = (await service.current(USER, MON)) ?? (await service.build(USER, MON));
  for (const index of indexes) {
    const session = plan.sessions[index];
    plan = await service.complete(USER, session.id, session.date, `${session.date}T08:00:00.000Z`);
  }
  return plan;
}

describe('totals', () => {
  it('counts sessions, minutes and the weeks she was active', async () => {
    await service.build(USER, MON);
    await finish([0, 1, 3]); // Mon and Wed of week 1, Mon of week 2
    const result = totals((await history()).plans, catalogue);
    expect(result.sessions).toBe(3);
    // Start here is 10 minutes; the other two are 20.
    expect(result.minutes).toBe(50);
    expect(result.weeksActive).toBe(2);
  });

  it('adds up across every plan she has had', async () => {
    await service.build(USER, MON);
    await finish([0, 1, 2, 3, 4, 5]);
    const next = (await service.current(USER, day(28)))!; // block 2
    await service.complete(USER, next.sessions[0].id, next.sessions[0].date, 'x');
    const result = totals((await history()).plans, catalogue);
    expect(result.sessions).toBe(7);
    expect(result.weeksActive).toBe(3);
  });

  it('is zero before she has done anything', async () => {
    await service.build(USER, MON);
    expect(totals((await history()).plans, catalogue)).toEqual({
      sessions: 0,
      minutes: 0,
      weeksActive: 0,
    });
  });
});

describe('the Progress tab', () => {
  it('is empty until her first session', async () => {
    await service.build(USER, MON);
    const view = progressView(await history(), catalogue, MON);
    expect(view.isEmpty).toBe(true);
    expect(view.consistency).toBeNull();
    expect(view.feel).toBeNull();
  });

  it('shows consistency as done out of planned, over the last four weeks', async () => {
    await service.build(USER, MON);
    await finish([0]); // Monday done. Wednesday and Friday are not.
    await service.current(USER, day(7)); // the week ends: the other two are dropped

    const view = progressView(await history(), catalogue, day(7));
    expect(view.consistency).toMatchObject({ done: 1, planned: 3 });
    expect(view.consistency!.ratio).toBeCloseTo(1 / 3, 5);
    expect(view.consistency!.body).toBe('1 of 3 planned sessions in the last four weeks.');
  });

  it('does not count sessions that are still ahead of her', async () => {
    await service.build(USER, MON);
    await finish([0]);
    // Wednesday of week 1: one done, the rest are still to come.
    const view = progressView(await history(), catalogue, day(2));
    expect(view.consistency).toMatchObject({ done: 1, planned: 1, ratio: 1 });
  });

  it('forgets what is older than four weeks', async () => {
    await service.build(USER, MON);
    await finish([0]);
    const later = day(40);
    await service.current(USER, later);
    expect(progressView(await history(), catalogue, later).consistency).toBeNull();
  });

  it('charts this plan week by week against her target', async () => {
    await service.build(USER, MON);
    await finish([0, 1, 3]);
    const view = progressView(await history(), catalogue, day(8));
    expect(view.chart!.target).toBe(3);
    expect(view.chart!.targetLabel).toBe('Your plan: 3 a week');
    expect(view.chart!.bars.map((bar) => bar.value)).toEqual([2, 1, 0, 0]);
    expect(view.chart!.bars.map((bar) => bar.label)).toEqual(['W1', 'W2', 'W3', 'W4']);
    expect(view.chart!.bars.map((bar) => bar.isCurrent)).toEqual([false, true, false, false]);
    expect(view.chart!.bars[0].spoken).toBe('Week 1: 2 of 3');
  });

  it('lays the month out from Monday, with a dot on each day she trained', async () => {
    await service.build(USER, MON);
    await finish([0, 1]);
    const view = progressView(await history(), catalogue, day(3));

    expect(view.month.title).toBe('November 2026');
    // 1 November 2026 is a Sunday: six empty cells, then thirty days.
    expect(view.month.days.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(view.month.days).toHaveLength(36);
    const days = view.month.days.filter((item) => item !== null);
    expect(days.filter((item) => item.trained).map((item) => item.day)).toEqual([2, 4]);
    expect(days.filter((item) => item.isToday).map((item) => item.day)).toEqual([5]);
    expect(view.month.summary).toBe('2 days with a session this month.');
    expect(days[1].label).toBe('Monday, 2, session done');
    expect(days[2].label).toBe('Tuesday, 3');
  });

  it('says how the classes have felt', async () => {
    const plan = await service.build(USER, MON);
    await finish([0, 1, 2]);
    await service.rate(USER, plan.sessions[0].id, 'right', MON, '2026-11-02T09:00:00.000Z');
    await service.rate(USER, plan.sessions[1].id, 'right', day(2), '2026-11-04T09:00:00.000Z');
    await service.rate(USER, plan.sessions[2].id, 'hard', day(4), '2026-11-06T09:00:00.000Z');
    expect(progressView(await history(), catalogue, day(4)).feel).toBe(
      'Classes have mostly felt just right.',
    );
  });

  it('never mentions weight, measurements or how she looks', async () => {
    await service.build(USER, MON);
    await finish([0, 1]);
    const view = progressView(await history(), catalogue, day(3));
    // Every word the tab writes.
    const written = [
      view.consistency?.body,
      view.chart?.targetLabel,
      ...(view.chart?.bars.flatMap((bar) => [bar.label, bar.spoken]) ?? []),
      view.month.title,
      view.month.summary,
      ...view.month.days.map((item) => item?.label),
      view.feel,
    ]
      .filter(Boolean)
      .join(' ');
    expect(written).not.toMatch(
      /\b(weight|kilos?|pounds?|inch(es)?|waist|calories?|before|after|body|bodies|measure\w*)\b/i,
    );
  });
});

describe('how classes have felt', () => {
  it.each([
    [['right', 'right', 'easy'], 'Classes have mostly felt just right.'],
    [['easy', 'easy'], 'Classes have mostly felt on the easy side.'],
    [['hard', 'hard', 'right'], 'Classes have mostly felt on the hard side.'],
    [['easy', 'hard'], 'Classes have felt like a mix so far.'],
    [['easy', 'right', 'hard'], 'Classes have felt like a mix so far.'],
  ] as const)('%j → %s', (ratings, line) => {
    expect(feelLine(ratings)).toBe(line);
  });

  it('says nothing until she has rated one', () => {
    expect(feelLine([])).toBeNull();
  });
});

describe('after class', () => {
  it('fills the weekly ring by one and shows what is next', async () => {
    const built = await service.build(USER, MON);
    const plan = await finish([0]);
    const view = afterClassView(
      plan,
      (await history()).plans,
      catalogue,
      built.sessions[0].id,
      MON,
    );

    expect(view.ring).toMatchObject({ before: 0, after: 1, total: 3, label: '1 of 3' });
    expect(view.sessions).toBe(1);
    expect(view.minutes).toBe(10);
    expect(view.next).toMatch(/^Next: Wednesday · /);
  });

  it('counts the session once even while the history is still catching up', async () => {
    const built = await service.build(USER, MON);
    const stale = await history(); // read before the session was finished
    const plan = await finish([0]);
    const view = afterClassView(plan, stale.plans, catalogue, built.sessions[0].id, MON);
    expect(view.sessions).toBe(1);
  });

  it('has no "next" after the last session of the block', async () => {
    const built = await service.build(USER, MON);
    const plan = await finish(built.sessions.map((_, index) => index));
    const last = built.sessions[built.sessions.length - 1];
    const view = afterClassView(plan, (await history()).plans, catalogue, last.id, last.date);
    expect(view.next).toBeNull();
    expect(view.ring).toMatchObject({ before: 2, after: 3, total: 3 });
  });
});

describe('the Plan tab', () => {
  it('shows four weeks, each with its theme and its dates', async () => {
    const plan = await service.build(USER, MON);
    const view = planTabView(plan, catalogue, MON);
    expect(view.weeks.map((week) => week.title)).toEqual([
      'Week 1 · Foundations',
      'Week 2 · Build',
      'Week 3 · Strengthen',
      'Week 4 · Flow',
    ]);
    expect(view.weeks[0].range).toBe('Monday 2 November to Sunday 8 November');
    expect(view.weeks[3].range).toBe('Monday 23 November to Sunday 29 November');
    expect(view.weeks.map((week) => week.isCurrent)).toEqual([true, false, false, false]);
    expect(view.weeks.map((week) => week.sessions.length)).toEqual([3, 3, 3, 3]);
  });

  it('shows each session’s day and state, and lets her move what is still to do', async () => {
    await service.build(USER, MON);
    const plan = await finish([0]);
    const [first, second] = planTabView(plan, catalogue, MON).weeks[0].sessions;
    expect(first).toMatchObject({ eyebrow: 'Today', canMove: false });
    expect(first.card.isDone).toBe(true);
    expect(second).toMatchObject({ eyebrow: 'Wednesday 4 November', canMove: true });
  });

  it('does not list a dropped session, and says so plainly when a week has none', async () => {
    await service.build(USER, MON);
    const later = (await service.current(USER, day(7)))!; // nothing done in week 1
    const view = planTabView(later, catalogue, day(7));
    expect(view.weeks[0].sessions).toEqual([]);
    expect(view.weeks[0].note).toBe('Nothing planned this week.');
    expect(view.weeks[1].isCurrent).toBe(true);
    expect(view.weeks[1].note).toBeNull();
  });
});
