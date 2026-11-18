import { addDays } from '@engine';
import { createPlanService, type QuizInput } from '@shared/plan-service';

import { storage } from '@/lib/storage';

import { indexCatalogue } from '../cards';
import { createLocalPlanStore, localCatalogue } from '../localStore';
import { planPreview } from '../preview';
import { todayView } from '../today';

/**
 * Today and the plan preview, worked out from a real plan built by the real
 * service from the sixteen seed classes.
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

let quiz: QuizInput = answers;
const service = createPlanService(createLocalPlanStore(() => quiz));

beforeEach(() => {
  storage.clearAll();
  quiz = answers;
});

const finish = (plan: Awaited<ReturnType<typeof service.build>>, index: number, on: string) =>
  service.complete(USER, plan.sessions[index].id, on, `${on}T08:00:00.000Z`);

describe('Today', () => {
  it('a session is due: names it, offers Start, and shows the week', async () => {
    const plan = await service.build(USER, MON);
    const view = todayView(plan, catalogue, MON);

    expect(view.state).toBe('session');
    expect(view.dateLine).toBe('Monday · Week 1 of 4');
    expect(view.headline).toBe('Today: Start here');
    expect(view.feature).toMatchObject({ kind: 'today', canStart: true, eyebrow: null });
    expect(view.feature!.card).toMatchObject({
      title: 'Start here',
      meta: '10 min · Beginner · Mat',
    });
    expect(view.nextLine).toBeNull();

    expect(view.ring).toMatchObject({
      done: 0,
      total: 3,
      label: '0 of 3',
      spoken: '0 of 3 sessions this week',
    });
    expect(view.weekStrip.map((item) => item.state)).toEqual([
      'today',
      'rest',
      'planned',
      'rest',
      'planned',
      'rest',
      'rest',
    ]);
    expect(view.weekStrip.map((item) => item.letter).join('')).toBe('MTWTFSS');
    expect(view.weekStrip[0].label).toBe('Monday, today, session planned');

    // The rest of the week, soonest first, without today's session.
    expect(view.comingUp.map((card) => card.weekday)).toEqual(['Wednesday', 'Friday']);
    expect(view.encouragement).toBe('10 minutes is all today asks.');
  });

  it('done: says so, ticks the day, fills the ring and points to the next one', async () => {
    const plan = await service.build(USER, MON);
    const after = await finish(plan, 0, MON);
    const view = todayView(after, catalogue, MON);

    expect(view.state).toBe('done');
    expect(view.headline).toBe('Done for today.');
    expect(view.feature).toMatchObject({ kind: 'done', canStart: false });
    expect(view.nextLine).toBe(`Next: Wednesday · ${view.comingUp[0].title}`);
    expect(view.ring).toMatchObject({ done: 1, total: 3 });
    expect(view.weekStrip[0]).toMatchObject({ state: 'done', label: 'Monday, done' });
    expect(view.encouragement).toBe('That’s the first one done.');
  });

  it('rest day: says so, shows the next session ahead of its day, with nothing to start', async () => {
    const plan = await service.build(USER, MON);
    const after = await finish(plan, 0, MON);
    const view = todayView(after, catalogue, day(1));

    expect(view.state).toBe('rest');
    expect(view.dateLine).toBe('Tuesday · Week 1 of 4');
    expect(view.headline).toBe('Rest day. You’ve earned it.');
    expect(view.feature).toMatchObject({
      kind: 'next',
      canStart: false,
      eyebrow: 'Next: Wednesday',
    });
    // The featured session is not listed again under "Coming up".
    expect(view.comingUp.map((card) => card.weekday)).toEqual(['Friday']);
    expect(view.weekStrip[1]).toMatchObject({ state: 'today', label: 'Tuesday, today' });
    expect(view.encouragement).toBe('10 minutes moved this week. Rest is part of the plan.');
  });

  it('after a missed day: the plan has moved, and nothing says why', async () => {
    await service.build(USER, MON);
    // She did not train on Monday and opens the app on Tuesday.
    const tuesday = (await service.current(USER, day(1)))!;
    const view = todayView(tuesday, catalogue, day(1));

    expect(view.state).toBe('moved');
    expect(view.headline).toBe('Welcome back. Your plan has moved.');
    // Monday's session is now today's, ready to start.
    expect(view.feature).toMatchObject({ kind: 'today', canStart: true });
    expect(view.feature!.card.title).toBe('Start here');
    expect(view.encouragement).toBe('Plans bend. Yours has made room.');

    // Monday reads as an ordinary rest day. Nothing on the screen marks it as missed.
    expect(view.weekStrip[0]).toMatchObject({ state: 'rest', label: 'Monday, rest day' });
    const everything = JSON.stringify(view).toLowerCase();
    for (const word of ['miss', 'skip', 'late', 'behind', 'fail'])
      expect(everything).not.toContain(word);
  });

  it('the moved headline is only for the day it happened', async () => {
    await service.build(USER, MON);
    const tuesday = (await service.current(USER, day(1)))!;
    // Still not done on Wednesday: Wednesday has its own session, so Tuesday's moves on again.
    const wednesday = (await service.current(USER, day(2)))!;
    expect(todayView(wednesday, catalogue, day(2)).state).toBe('moved');
    // Looked at again the same day, nothing new has moved, but it is still the day it moved.
    expect(todayView(tuesday, catalogue, day(1)).headline).toBe(
      'Welcome back. Your plan has moved.',
    );
    // A day later with nothing new overdue, the notice is gone.
    const done = await service.complete(
      USER,
      wednesday.sessions[1].id,
      day(2),
      `${day(2)}T08:00:00.000Z`,
    );
    expect(todayView(done, catalogue, day(3)).headline).not.toBe(
      'Welcome back. Your plan has moved.',
    );
  });

  it('dropped sessions vanish: they are not counted, listed or mentioned', async () => {
    await service.build(USER, MON);
    // Nothing done in week 1. She comes back the following Monday.
    const later = (await service.current(USER, day(7)))!;
    const view = todayView(later, catalogue, day(7));

    expect(view.dateLine).toBe('Monday · Week 2 of 4');
    expect(view.ring).toMatchObject({ done: 0, total: 3 });
    expect(view.state).toBe('moved');
    expect(view.feature).toMatchObject({ kind: 'today', canStart: true });
    expect(view.comingUp).toHaveLength(2);
  });

  it('before her first session, on a day that is not one of hers: lets her start anyway', async () => {
    // Built on a Tuesday. Her first session is Wednesday.
    const plan = await service.build(USER, day(1));
    const view = todayView(plan, catalogue, day(1));

    expect(view.state).toBe('before_first');
    expect(view.dateLine).toBe('Tuesday · Week 1 of 4');
    expect(view.headline).toBe('Your plan starts on Wednesday.');
    expect(view.feature).toMatchObject({
      kind: 'next',
      eyebrow: 'Next: Wednesday',
      canStart: true,
      startLabel: 'Start now',
    });
    // Her week runs from the day the plan was built.
    expect(view.weekStrip.map((item) => item.letter).join('')).toBe('TWTFSSM');
    expect(view.weekStrip[0].state).toBe('today');
  });

  it('with momentum: counts what she has done this week', async () => {
    const plan = await service.build(USER, MON);
    const after = await finish(plan, 0, MON);
    const view = todayView(after, catalogue, day(2));
    expect(view.state).toBe('session');
    expect(view.encouragement).toBe('One done this week. Here’s the next.');
  });

  it('a new week opens plainly', async () => {
    const plan = await service.build(USER, MON);
    let current = plan;
    for (const index of [0, 1, 2])
      current = await finish(current, index, plan.sessions[index].date);
    const view = todayView(current, catalogue, day(7));
    expect(view.dateLine).toBe('Monday · Week 2 of 4');
    expect(view.ring).toMatchObject({ done: 0, total: 3 });
    expect(view.encouragement).toBe('Week 2 starts here.');
  });

  it('when the last session of the block is behind her', async () => {
    const plan = await service.build(USER, MON);
    let current = plan;
    for (let index = 0; index < plan.sessions.length; index++) {
      current = await finish(current, index, plan.sessions[index].date);
    }
    // The day after her final session, still inside the 28 days.
    const view = todayView(current, catalogue, day(26));
    expect(view.state).toBe('block_done');
    expect(view.headline).toBe('Four weeks, done.');
    expect(view.feature).toBeNull();
    expect(view.dateLine).toBe('Saturday · Week 4 of 4');
  });

  it('a 30-minute session that pairs two classes is one card', async () => {
    quiz = { ...answers, minutes: 30, goal: 'core_strength' };
    const plan = await service.build(USER, MON);
    const paired = plan.sessions.find((session) => session.classIds.length === 2)!;
    const view = todayView(plan, catalogue, paired.date);
    const card =
      view.feature?.card.session.id === paired.id
        ? view.feature.card
        : view.comingUp.find((item) => item.session.id === paired.id)!;

    expect(card.minutes).toBe(30);
    expect(card.meta.startsWith('30 min')).toBe(true);
    expect(card.note).toMatch(/^Then /);
  });
});

describe('the plan preview', () => {
  it('sums the plan up in three chips and greets her by name', async () => {
    const plan = await service.build(USER, MON);
    const preview = planPreview(plan, catalogue, ' Amira ');
    expect(preview.headline).toBe('Your 28-day plan, Amira');
    expect(preview.chips).toEqual(['3 days a week', '20 min', 'Posture focus']);
  });

  it('manages without a name', async () => {
    const plan = await service.build(USER, MON);
    expect(planPreview(plan, catalogue, '').headline).toBe('Your 28-day plan');
    expect(planPreview(plan, catalogue).headline).toBe('Your 28-day plan');
  });

  it('shows week 1 in full and weeks 2 to 4 as Build, Strengthen, Flow', async () => {
    const plan = await service.build(USER, MON);
    const preview = planPreview(plan, catalogue);

    expect(preview.weekOne.title).toBe('Week 1 · Foundations');
    expect(preview.weekOne.sessions.map((card) => card.weekday)).toEqual([
      'Monday',
      'Wednesday',
      'Friday',
    ]);
    expect(preview.weekOne.sessions[0].title).toBe('Start here');
    expect(preview.laterWeeks).toEqual([
      { week: 2, title: 'Week 2 · Build', summary: '3 sessions' },
      { week: 3, title: 'Week 3 · Strengthen', summary: '3 sessions' },
      { week: 4, title: 'Week 4 · Flow', summary: '3 sessions' },
    ]);
  });

  it.each([
    ['core_strength', 'Core focus'],
    ['posture', 'Posture focus'],
    ['mobility', 'Mobility focus'],
    ['tone', 'Full-body focus'],
    ['routine', 'Balanced mix'],
  ] as const)('names the %s goal "%s"', async (goal, chip) => {
    quiz = { ...answers, goal };
    const plan = await service.build(USER, MON);
    expect(planPreview(plan, catalogue).chips[2]).toBe(chip);
  });
});
