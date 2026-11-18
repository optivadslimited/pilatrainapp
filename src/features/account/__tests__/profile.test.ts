import { onboardingFrom, type ProfileRows } from '../profile';

const rows: ProfileRows = {
  user: { first_name: 'Ada' },
  answers: {
    goal: 'posture',
    level: 2,
    minutes: 20,
    days: [1, 3, 5],
    time_of_day: 'evening',
    equipment: ['mat', 'band'],
    work_around: ['knees'],
    gentle: false,
    disclaimer_accepted_at: '2026-11-18T09:00:00.000Z',
  },
};

describe('restoring her answers after sign-in', () => {
  it('puts the saved answers back as a finished quiz', () => {
    expect(onboardingFrom(rows)).toEqual({
      status: 'complete',
      answers: {
        goal: 'posture',
        experience: 'sometimes',
        minutes: 20,
        daysPerWeek: 3,
        weekdays: [1, 3, 5],
        timeOfDay: 'evening',
        equipment: ['mat', 'band'],
        workAround: ['knees'],
        firstName: 'Ada',
      },
      gate: 'not_shown',
      disclaimerAcceptedAt: '2026-11-18T09:00:00.000Z',
      holdingReminderAt: null,
    });
  });

  it('remembers that she passed the safety gate', () => {
    const gentle = onboardingFrom({
      ...rows,
      answers: { ...rows.answers!, gentle: true, level: 1 },
    });
    expect(gentle?.gate).toBe('cleared');
    expect(gentle?.answers.experience).toBe('new');
  });

  it('treats no ticked answers as "None", and a missing name as skipped', () => {
    const restored = onboardingFrom({ user: null, answers: { ...rows.answers!, work_around: [] } });
    expect(restored?.answers.workAround).toEqual(['none']);
    expect(restored?.answers.firstName).toBe('');
  });

  it('restores nothing if the quiz was never finished on this account', () => {
    expect(onboardingFrom({ user: rows.user, answers: null })).toBeNull();
    expect(
      onboardingFrom({ ...rows, answers: { ...rows.answers!, disclaimer_accepted_at: null } }),
    ).toBeNull();
  });
});
