import { formatClassMeta, formatClock } from '../format';

describe('formatClock', () => {
  it('formats minutes and seconds', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(1200)).toBe('20:00');
  });

  it('adds hours when needed', () => {
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('is safe with fractions, negatives and nonsense', () => {
    expect(formatClock(59.9)).toBe('0:59');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(NaN)).toBe('0:00');
  });
});

describe('formatClassMeta', () => {
  it('writes length, level and kit on one line', () => {
    expect(formatClassMeta({ minutes: 20, level: 1, equipment: ['mat'] })).toBe(
      '20 min · Beginner · Mat',
    );
  });

  it('lists kit beyond the mat', () => {
    expect(formatClassMeta({ minutes: 30, level: 2, equipment: ['mat', 'band'] })).toBe(
      '30 min · Improver · Resistance band',
    );
  });

  it('treats no kit as mat only', () => {
    expect(formatClassMeta({ minutes: 10, level: 1, equipment: [] })).toBe(
      '10 min · Beginner · Mat',
    );
  });
});
