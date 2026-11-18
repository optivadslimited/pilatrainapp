import { addDays } from '@engine';
import { createPlanService, type QuizInput } from '@shared/plan-service';

import { NO_ENTITLEMENT, type Entitlement } from '@/features/membership/entitlement';
import { indexCatalogue } from '@/features/plan/cards';
import { createLocalPlanStore, localCatalogue } from '@/features/plan/localStore';
import { storage } from '@/lib/storage';

import { localMoment, sessionReminders, trialReminder, TRIAL_REMINDER_ID } from '../schedule';

const USER = 'local';
/** Monday 2 November 2026. Her days are Mon, Wed, Fri. */
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

beforeEach(() => storage.clearAll());

describe('session reminders', () => {
  it('sets one for each session still ahead, at her time, on its own day', async () => {
    const plan = await service.build(USER, MON);
    const reminders = sessionReminders(plan, catalogue, '07:30', localMoment(MON, '06:00'));

    // Three days a week for four weeks.
    expect(reminders).toHaveLength(12);
    expect(reminders[0].at).toEqual(localMoment(MON, '07:30'));
    expect(reminders[1].at).toEqual(localMoment(day(2), '07:30'));
    expect(new Set(reminders.map((item) => item.id)).size).toBe(12);
    expect(reminders.every((item) => item.id.startsWith('session-'))).toBe(true);
  });

  it('names the class and its length, and nothing else', async () => {
    const plan = await service.build(USER, MON);
    const [first] = sessionReminders(plan, catalogue, '07:30', localMoment(MON, '06:00'));
    expect(first.title).toBe('Today: Start here');
    expect(first.body).toBe('10 minutes, whenever suits you.');
  });

  it('never reminds her of a time that has passed, or a session she has done', async () => {
    const plan = await service.build(USER, MON);
    // 08:00 on Monday: today's reminder time has gone.
    const later = sessionReminders(plan, catalogue, '07:30', localMoment(MON, '08:00'));
    expect(later).toHaveLength(11);
    expect(later[0].at).toEqual(localMoment(day(2), '07:30'));

    const done = await service.complete(
      USER,
      plan.sessions[1].id,
      day(2),
      `${day(2)}T08:00:00.000Z`,
    );
    const afterDone = sessionReminders(done, catalogue, '07:30', localMoment(MON, '08:00'));
    expect(afterDone).toHaveLength(10);
    expect(afterDone.map((item) => item.id)).not.toContain(`session-${plan.sessions[1].id}`);
  });

  it('follows a session to the day she moves it to', async () => {
    const plan = await service.build(USER, MON);
    const moved = await service.move(USER, plan.sessions[0].id, day(1), MON);
    const [first] = sessionReminders(moved, catalogue, '18:30', localMoment(MON, '06:00'));
    expect(first.at).toEqual(localMoment(day(1), '18:30'));
  });

  it('never uses guilt or pressure', async () => {
    const plan = await service.build(USER, MON);
    const text = sessionReminders(plan, catalogue, '07:30', localMoment(MON, '06:00'))
      .map((item) => `${item.title} ${item.body}`)
      .join(' ');
    expect(text).not.toMatch(/\b(missed|skipped|streak|behind|don[’']t|late|hurry|last chance)\b/i);
  });
});

describe('the trial reminder', () => {
  const trial: Entitlement = {
    active: true,
    productId: 'pilatrain_quarterly',
    period: 'trial',
    expiresAt: localMoment('2026-12-08', '10:00').toISOString(),
    willRenew: true,
    billingIssueAt: null,
  };
  const agreed = { productId: 'pilatrain_quarterly', price: 'PRICE' };
  const now = localMoment('2026-12-01', '10:00');

  it('goes out two days before the free week ends, naming the date and the price', () => {
    const reminder = trialReminder(trial, agreed, now);
    expect(reminder).toEqual({
      id: TRIAL_REMINDER_ID,
      at: localMoment('2026-12-06', '10:00'),
      title: 'Your free week ends on Tuesday 8 December',
      body: 'Your membership then starts at PRICE every 3 months. You can cancel any time in Settings.',
    });
  });

  it('does not quote a price it was not shown for this plan', () => {
    expect(trialReminder(trial, null, now)?.body).toBe(
      'Your membership then starts. You can cancel any time in Settings.',
    );
    expect(
      trialReminder(trial, { productId: 'pilatrain_annual', price: 'PRICE' }, now)?.body,
    ).not.toContain('PRICE');
  });

  it('is not sent if she has cancelled, is not in a trial, or the moment has passed', () => {
    expect(trialReminder({ ...trial, willRenew: false }, agreed, now)).toBeNull();
    expect(trialReminder({ ...trial, period: 'paid' }, agreed, now)).toBeNull();
    expect(trialReminder(NO_ENTITLEMENT, agreed, now)).toBeNull();
    expect(trialReminder(trial, agreed, localMoment('2026-12-07', '10:00'))).toBeNull();
  });
});
