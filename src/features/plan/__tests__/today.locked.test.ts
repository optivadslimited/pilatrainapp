import { addDays } from '@engine';
import { createPlanService, type QuizInput } from '@shared/plan-service';

import { storage } from '@/lib/storage';

import { indexCatalogue } from '../cards';
import { createLocalPlanStore, localCatalogue } from '../localStore';
import { todayView } from '../today';

/** Today without a membership: what is free, what is locked, and what it says. */
const USER = 'local';
const MON = '2026-11-02';
const day = (n: number) => addDays(MON, n);
const catalogue = indexCatalogue(localCatalogue);
const quiz: QuizInput = {
  goal: 'posture',
  level: 1,
  minutes: 20,
  weekdays: [1, 3, 5],
  equipment: ['mat'],
  workAround: ['none'],
  gentle: false,
};
const service = createPlanService(createLocalPlanStore(() => quiz));
const guest = { isMember: false };

beforeEach(() => storage.clearAll());

describe('Today without a membership', () => {
  it('lets her start her first class: it is free', async () => {
    const plan = await service.build(USER, MON);
    const view = todayView(plan, catalogue, MON, guest);
    expect(view.feature).toMatchObject({
      kind: 'today',
      locked: false,
      canStart: true,
      startLabel: 'Start',
    });
    // The sessions after it need a membership.
    expect(view.comingUpLocked).toBe(true);
  });

  it('keeps the first class free on a day before it, too', async () => {
    const plan = await service.build(USER, day(1));
    const view = todayView(plan, catalogue, day(1), guest);
    expect(view.state).toBe('before_first');
    expect(view.feature).toMatchObject({ kind: 'next', locked: false, canStart: true });
  });

  it('shows the next session locked once the free class is done, with "Continue your plan"', async () => {
    const plan = await service.build(USER, MON);
    const done = await service.complete(USER, plan.sessions[0].id, MON, `${MON}T08:00:00.000Z`);

    // The same day: the finished class is shown as done, not locked.
    const sameDay = todayView(done, catalogue, MON, guest);
    expect(sameDay.feature).toMatchObject({ kind: 'done', locked: false });

    // Her next session's day: it is there, and locked.
    const next = todayView(done, catalogue, day(2), guest);
    expect(next.state).toBe('session');
    expect(next.feature).toMatchObject({
      kind: 'today',
      locked: true,
      canStart: true,
      startLabel: 'Continue your plan',
    });
    expect(next.encouragement).toBe('Your plan is saved and waiting for you.');
  });

  it('shows a rest day’s next session locked as well', async () => {
    const plan = await service.build(USER, MON);
    const done = await service.complete(USER, plan.sessions[0].id, MON, `${MON}T08:00:00.000Z`);
    const rest = todayView(done, catalogue, day(1), guest);
    expect(rest.state).toBe('rest');
    expect(rest.feature).toMatchObject({
      kind: 'next',
      locked: true,
      startLabel: 'Continue your plan',
    });
  });

  it('never blames her for the lock', async () => {
    const plan = await service.build(USER, MON);
    const done = await service.complete(USER, plan.sessions[0].id, MON, `${MON}T08:00:00.000Z`);
    const view = todayView(done, catalogue, day(2), guest);
    const said = [view.headline, view.encouragement, view.feature?.startLabel].join(' ');
    expect(said).not.toMatch(/\b(expired|lapsed|missed|lost|locked out|pay up|behind)\b/i);
  });

  it('locks nothing for a member', async () => {
    const plan = await service.build(USER, MON);
    const done = await service.complete(USER, plan.sessions[0].id, MON, `${MON}T08:00:00.000Z`);
    const view = todayView(done, catalogue, day(2), { isMember: true });
    expect(view.feature?.locked).toBe(false);
    expect(view.comingUpLocked).toBe(false);
    // Left out, she is taken to be a member.
    expect(todayView(done, catalogue, day(2)).feature?.locked).toBe(false);
  });
});
