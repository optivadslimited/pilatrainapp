import { t } from '@/strings';

import {
  getQuestion,
  levelFor,
  ownedEquipment,
  QUESTIONS,
  REMINDER_TIMES,
  TIMES_OF_DAY,
  toggleOption,
} from '../questions';

describe('the quiz', () => {
  it('asks the nine questions in the specified order', () => {
    expect(QUESTIONS.map((question) => question.id)).toEqual([
      'goal',
      'experience',
      'minutes',
      'days_per_week',
      'weekdays',
      'time_of_day',
      'equipment',
      'work_around',
      'first_name',
    ]);
  });

  it('offers the specified answers', () => {
    const options = (id: string) => {
      const question = getQuestion(id);
      return question && 'options' in question ? [...question.options] : [];
    };
    expect(options('goal')).toHaveLength(5);
    expect(options('experience')).toHaveLength(4);
    expect(options('minutes')).toEqual([10, 20, 30]);
    expect(options('days_per_week')).toEqual([2, 3, 4, 5]);
    expect(options('time_of_day')).toHaveLength(4);
    expect(options('equipment')).toHaveLength(4);
    expect(options('work_around')).toHaveLength(7);
  });

  it('has wording for every question and every answer', () => {
    for (const question of QUESTIONS) {
      const copy = t.quiz.questions[question.id] as {
        title: string;
        options?: Record<string, string>;
      };
      expect(copy.title.length).toBeGreaterThan(0);
      if ('options' in question) {
        for (const option of question.options) {
          expect(copy.options?.[String(option)]).toEqual(expect.any(String));
        }
      }
    }
  });

  it('returns nothing for an unknown step', () => {
    expect(getQuestion('nonsense')).toBeUndefined();
    expect(getQuestion(undefined)).toBeUndefined();
  });
});

describe('levelFor', () => {
  it('maps the first two experience answers to beginner', () => {
    expect(levelFor('new')).toBe(1);
    expect(levelFor('tried')).toBe(1);
  });

  it('maps the third and, at launch, the fourth to improver', () => {
    expect(levelFor('sometimes')).toBe(2);
    expect(levelFor('regular')).toBe(2);
  });
});

describe('reminder times', () => {
  it('gives every time of day a valid 24-hour time', () => {
    for (const time of TIMES_OF_DAY) {
      expect(REMINDER_TIMES[time]).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });
});

describe('ownedEquipment', () => {
  it('always includes the mat', () => {
    expect(ownedEquipment(['mat'])).toEqual(['mat']);
    expect(ownedEquipment(['band', 'weights'])).toEqual(['mat', 'band', 'weights']);
    expect(ownedEquipment([])).toEqual(['mat']);
  });
});

describe('toggleOption', () => {
  it('adds and removes an ordinary answer', () => {
    expect(toggleOption(['knees'], 'wrists', 'none')).toEqual(['knees', 'wrists']);
    expect(toggleOption(['knees', 'wrists'], 'knees', 'none')).toEqual(['wrists']);
  });

  it('clears everything else when "None" is chosen', () => {
    expect(toggleOption(['knees', 'wrists'], 'none', 'none')).toEqual(['none']);
  });

  it('clears "None" when anything else is chosen', () => {
    expect(toggleOption(['none'], 'knees', 'none')).toEqual(['knees']);
  });

  it('treats "Just a mat" the same way for equipment', () => {
    expect(toggleOption(['mat'], 'band', 'mat')).toEqual(['band']);
    expect(toggleOption(['band', 'ball'], 'mat', 'mat')).toEqual(['mat']);
  });
});
