import {
  afterDisclaimer,
  afterQuestion,
  afterSafetyCleared,
  launchTarget,
  stepNumber,
  TOTAL_STEPS,
} from '../flow';
import { QUESTIONS, type WorkAround } from '../questions';
import { isGentle, needsSafetyGate } from '../safety';

const state = (
  workAround: WorkAround[] = ['none'],
  gate: 'not_shown' | 'cleared' | 'checking_first' = 'not_shown',
) => ({
  answers: { workAround },
  gate,
});

describe('the order of the quiz', () => {
  it('goes from each question to the next', () => {
    for (let i = 0; i < QUESTIONS.length - 1; i++) {
      expect(afterQuestion(QUESTIONS[i].id, state())).toEqual({
        screen: 'question',
        id: QUESTIONS[i + 1].id,
      });
    }
  });

  it('goes from the last question to the health disclaimer', () => {
    expect(afterQuestion('first_name', state())).toEqual({ screen: 'disclaimer' });
  });

  it('builds the plan only after the disclaimer', () => {
    expect(afterDisclaimer()).toEqual({ screen: 'building' });
  });
});

describe('the safety gate', () => {
  it.each<WorkAround>(['pregnant_postpartum', 'recent_injury_surgery'])(
    'is shown straight after "work around" when she picks %s',
    (answer) => {
      expect(needsSafetyGate([answer])).toBe(true);
      expect(afterQuestion('work_around', state([answer]))).toEqual({ screen: 'safety' });
    },
  );

  it('is shown when a gated answer is one of several', () => {
    expect(afterQuestion('work_around', state(['knees', 'pregnant_postpartum']))).toEqual({
      screen: 'safety',
    });
  });

  const ungated: { answers: WorkAround[] }[] = [
    { answers: ['none'] },
    { answers: ['lower_back'] },
    { answers: ['neck_shoulders', 'knees', 'wrists'] },
  ];

  it.each(ungated)('is not shown for $answers', ({ answers }) => {
    expect(needsSafetyGate(answers)).toBe(false);
    expect(afterQuestion('work_around', state(answers))).toEqual({
      screen: 'question',
      id: 'first_name',
    });
  });

  it('is not shown twice once she has said she is cleared', () => {
    expect(afterQuestion('work_around', state(['recent_injury_surgery'], 'cleared'))).toEqual({
      screen: 'question',
      id: 'first_name',
    });
  });

  it('is shown again if she said she would check first', () => {
    expect(
      afterQuestion('work_around', state(['recent_injury_surgery'], 'checking_first')),
    ).toEqual({
      screen: 'safety',
    });
  });

  it('only applies after the "work around" question', () => {
    expect(afterQuestion('goal', state(['pregnant_postpartum']))).toEqual({
      screen: 'question',
      id: 'experience',
    });
  });

  it('carries on with the quiz once she is cleared', () => {
    expect(afterSafetyCleared()).toEqual({ screen: 'question', id: 'first_name' });
  });
});

describe('the gentle track', () => {
  it('is on when she picked a gated answer and is cleared', () => {
    expect(isGentle(state(['pregnant_postpartum'], 'cleared'))).toBe(true);
  });

  it('is off without a gated answer, or before she is cleared', () => {
    expect(isGentle(state(['knees'], 'cleared'))).toBe(false);
    expect(isGentle(state(['pregnant_postpartum'], 'not_shown'))).toBe(false);
    expect(isGentle(state(['pregnant_postpartum'], 'checking_first'))).toBe(false);
  });
});

describe('progress', () => {
  it('counts the nine questions and the disclaimer as ten steps', () => {
    expect(TOTAL_STEPS).toBe(10);
    expect(stepNumber('goal')).toBe(1);
    expect(stepNumber('first_name')).toBe(9);
    expect(stepNumber('disclaimer')).toBe(10);
  });
});

describe('launchTarget', () => {
  it('sends her to Welcome until the quiz is finished', () => {
    expect(launchTarget('idle')).toBe('welcome');
    expect(launchTarget('in_progress')).toBe('welcome');
  });

  it('sends her to the holding screen if she said she would check first', () => {
    expect(launchTarget('holding')).toBe('holding');
  });

  it('sends her to Today once the quiz is finished', () => {
    expect(launchTarget('complete')).toBe('home');
  });
});
