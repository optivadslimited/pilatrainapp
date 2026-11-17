import { addAnalyticsSink, quizAnswerForAnalytics, track } from '../analytics';

describe('quizAnswerForAnalytics: the privacy rule', () => {
  it('reduces "work around" to a single yes-or-no flag', () => {
    expect(quizAnswerForAnalytics('work_around', ['none'])).toBe(false);
    expect(quizAnswerForAnalytics('work_around', [])).toBe(false);
    expect(quizAnswerForAnalytics('work_around', ['knees'])).toBe(true);
    expect(quizAnswerForAnalytics('work_around', ['pregnant_postpartum'])).toBe(true);
    expect(quizAnswerForAnalytics('work_around', ['lower_back', 'recent_injury_surgery'])).toBe(
      true,
    );
  });

  it('never lets a health answer through, whatever she picked', () => {
    const health = [
      'lower_back',
      'neck_shoulders',
      'knees',
      'wrists',
      'pregnant_postpartum',
      'recent_injury_surgery',
    ];
    for (const answer of health) {
      const sent = quizAnswerForAnalytics('work_around', [answer]);
      expect(typeof sent).toBe('boolean');
      expect(String(sent)).not.toContain(answer);
    }
  });

  it('sends whether she gave a first name, never the name', () => {
    expect(quizAnswerForAnalytics('first_name', 'Amira')).toBe(true);
    expect(quizAnswerForAnalytics('first_name', '   ')).toBe(false);
    expect(quizAnswerForAnalytics('first_name', '')).toBe(false);
  });

  it('sends ordinary answers as they are', () => {
    expect(quizAnswerForAnalytics('goal', 'posture')).toBe('posture');
    expect(quizAnswerForAnalytics('minutes', 20)).toBe(20);
    expect(quizAnswerForAnalytics('weekdays', [1, 3, 5])).toBe('1,3,5');
    expect(quizAnswerForAnalytics('equipment', ['band', 'ball'])).toBe('band,ball');
  });
});

describe('track', () => {
  it('delivers the event name and properties to every sink', () => {
    const sink = jest.fn();
    const remove = addAnalyticsSink(sink);
    track('quiz_step_completed', { step: 'goal', answer: 'posture' });
    track('onboarding_started');
    expect(sink).toHaveBeenCalledWith('quiz_step_completed', { step: 'goal', answer: 'posture' });
    expect(sink).toHaveBeenCalledWith('onboarding_started', undefined);
    remove();
  });

  it('stops delivering once a sink is removed', () => {
    const sink = jest.fn();
    addAnalyticsSink(sink)();
    track('app_opened');
    expect(sink).not.toHaveBeenCalled();
  });

  it('never lets a failing sink break the app or the other sinks', () => {
    const good = jest.fn();
    const removeBad = addAnalyticsSink(() => {
      throw new Error('network down');
    });
    const removeGood = addAnalyticsSink(good);
    expect(() => track('app_opened')).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    removeBad();
    removeGood();
  });
});
