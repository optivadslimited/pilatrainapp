import { storage } from '@/lib/storage';

import { useOnboardingStore } from '../store';

const store = () => useOnboardingStore.getState();

beforeEach(() => {
  store().reset();
});

describe('onboarding store', () => {
  it('starts idle and empty', () => {
    expect(store().status).toBe('idle');
    expect(store().answers).toEqual({});
    expect(store().gate).toBe('not_shown');
    expect(store().disclaimerAcceptedAt).toBeNull();
  });

  it('moves to in progress on the first answer', () => {
    store().setAnswer('goal', 'posture');
    expect(store().status).toBe('in_progress');
    expect(store().answers.goal).toBe('posture');
  });

  it('pre-selects a spread of days when she chooses how many days a week', () => {
    store().setAnswer('daysPerWeek', 3);
    expect(store().answers.weekdays).toEqual([1, 3, 5]);
  });

  it('suggests a new spread when the number of days changes', () => {
    store().setAnswer('daysPerWeek', 3);
    store().setAnswer('weekdays', [2, 4, 6]);
    store().setAnswer('daysPerWeek', 2);
    expect(store().answers.weekdays).toEqual([1, 4]);
  });

  it('keeps her own days when she re-confirms the same number', () => {
    store().setAnswer('daysPerWeek', 3);
    store().setAnswer('weekdays', [2, 4, 6]);
    store().setAnswer('daysPerWeek', 3);
    expect(store().answers.weekdays).toEqual([2, 4, 6]);
  });

  it('holds when she says she will check first, keeping her answers', () => {
    store().setAnswer('goal', 'mobility');
    store().setAnswer('workAround', ['recent_injury_surgery']);
    store().checkFirst();
    expect(store().status).toBe('holding');
    expect(store().gate).toBe('checking_first');
    expect(store().answers.goal).toBe('mobility');
  });

  it('resumes the quiz when she is cleared, and drops the holding reminder', () => {
    store().setAnswer('workAround', ['pregnant_postpartum']);
    store().checkFirst();
    store().setHoldingReminder('2026-11-24T09:00:00.000Z');
    store().clearGate();
    expect(store().status).toBe('in_progress');
    expect(store().gate).toBe('cleared');
    expect(store().holdingReminderAt).toBeNull();
  });

  it('forgets the gate if she removes the gated answers', () => {
    store().setAnswer('workAround', ['pregnant_postpartum']);
    store().clearGate();
    store().setAnswer('workAround', ['knees']);
    expect(store().gate).toBe('not_shown');
  });

  it('keeps the gate cleared while a gated answer remains', () => {
    store().setAnswer('workAround', ['pregnant_postpartum']);
    store().clearGate();
    store().setAnswer('workAround', ['pregnant_postpartum', 'wrists']);
    expect(store().gate).toBe('cleared');
  });

  it('records when the health disclaimer was ticked and completes onboarding', () => {
    store().acceptDisclaimer('2026-11-17T10:00:00.000Z');
    expect(store().disclaimerAcceptedAt).toBe('2026-11-17T10:00:00.000Z');
    expect(store().status).toBe('complete');
  });

  it('saves to the device so the quiz survives a restart', () => {
    store().setAnswer('goal', 'tone');
    store().setAnswer('minutes', 20);
    const saved = JSON.parse(storage.getString('onboarding') ?? '{}');
    expect(saved.state.answers).toEqual({ goal: 'tone', minutes: 20 });
    expect(saved.state.status).toBe('in_progress');
  });

  it('clears everything on reset', () => {
    store().setAnswer('goal', 'tone');
    store().acceptDisclaimer('2026-11-17T10:00:00.000Z');
    store().reset();
    expect(store().status).toBe('idle');
    expect(store().answers).toEqual({});
    expect(store().disclaimerAcceptedAt).toBeNull();
  });
});
