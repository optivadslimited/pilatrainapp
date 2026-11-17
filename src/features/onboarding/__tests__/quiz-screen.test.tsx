import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import QuizStep from '@/app/quiz/[step]';
import { addAnalyticsSink } from '@/lib/analytics';

import { useOnboardingStore } from '../store';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
};
let mockStep = 'goal';

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => ({ step: mockStep }),
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
    Redirect: () => null,
  };
});

const events: [string, unknown][] = [];
let removeSink: () => void;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  events.length = 0;
  removeSink = addAnalyticsSink((name, properties) => events.push([name, properties]));
  useOnboardingStore.getState().reset();
});

afterEach(() => {
  removeSink();
  jest.useRealTimers();
});

const store = () => useOnboardingStore.getState();

describe('a single-choice question', () => {
  beforeEach(() => {
    mockStep = 'goal';
  });

  it('shows the question and its five answers', async () => {
    await render(<QuizStep />);
    expect(screen.getByRole('header', { name: 'Your main goal' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('saves the answer, gives a light tap, and moves on by itself after 250 ms', async () => {
    await render(<QuizStep />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Improve my posture' }));

    expect(store().answers.goal).toBe('posture');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(screen.getByRole('radio', { name: 'Improve my posture' })).toBeChecked();

    // Not yet: the pause lets her see what she chose.
    await act(async () => jest.advanceTimersByTime(249));
    expect(mockRouter.push).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(1));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/quiz/[step]',
      params: { step: 'experience' },
    });
    expect(events).toContainEqual(['quiz_step_completed', { step: 'goal', answer: 'posture' }]);
  });

  it('advances once, with the last choice, if she changes her mind inside the pause', async () => {
    await render(<QuizStep />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Improve my posture' }));
    await act(async () => jest.advanceTimersByTime(100));
    await fireEvent.press(screen.getByRole('radio', { name: 'Build a steady routine' }));
    await act(async () => jest.advanceTimersByTime(250));

    expect(store().answers.goal).toBe('routine');
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });
});

describe('"Anything to work around"', () => {
  beforeEach(() => {
    mockStep = 'work_around';
  });

  it('cannot continue until something is chosen, even "None"', async () => {
    await render(<QuizStep />);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'None' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('goes on to the next question for an ordinary answer', async () => {
    await render(<QuizStep />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Knees' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/quiz/[step]',
      params: { step: 'first_name' },
    });
  });

  it.each(['Pregnant or postpartum', 'Recent injury or surgery'])(
    'opens the safety gate for "%s"',
    async (answer) => {
      await render(<QuizStep />);
      await fireEvent.press(screen.getByRole('checkbox', { name: answer }));
      await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/quiz/safety');
    },
  );

  it('tells analytics only yes or no, never which answer', async () => {
    await render(<QuizStep />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Pregnant or postpartum' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(events).toContainEqual(['quiz_step_completed', { step: 'work_around', answer: true }]);
    expect(JSON.stringify(events)).not.toContain('pregnant');
  });
});

describe('"Which days"', () => {
  beforeEach(() => {
    mockStep = 'weekdays';
  });

  it('pre-selects a spread that matches the number of days', async () => {
    store().setAnswer('daysPerWeek', 3);
    await render(<QuizStep />);
    for (const day of ['Monday', 'Wednesday', 'Friday']) {
      expect(screen.getByRole('checkbox', { name: day })).toBeChecked();
    }
    expect(screen.getByText('3 of 3 chosen')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('cannot continue until the number of days matches', async () => {
    store().setAnswer('daysPerWeek', 3);
    await render(<QuizStep />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Wednesday' }));
    expect(screen.getByText('2 of 3 chosen')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Saturday' }));
    expect(store().answers.weekdays).toEqual([1, 5, 6]);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});

describe('"Your first name"', () => {
  beforeEach(() => {
    mockStep = 'first_name';
  });

  it('offers Skip while the field is empty and goes on to the disclaimer', async () => {
    await render(<QuizStep />);
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(store().answers.firstName).toBe('');
    expect(mockRouter.push).toHaveBeenCalledWith('/quiz/disclaimer');
    expect(events).toContainEqual(['quiz_step_completed', { step: 'first_name', answer: false }]);
  });

  it('saves a trimmed name and never sends it to analytics', async () => {
    await render(<QuizStep />);
    await fireEvent.changeText(screen.getByLabelText('First name'), '  Amira ');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(store().answers.firstName).toBe('Amira');
    expect(JSON.stringify(events)).not.toContain('Amira');
  });
});
