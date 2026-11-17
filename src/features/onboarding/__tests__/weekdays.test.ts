import { DAYS_PER_WEEK, type Weekday } from '../questions';
import { suggestedWeekdays, toggleWeekday, weekdaysMatch } from '../weekdays';

/** The longest run of back-to-back days, treating the week as a circle (Sunday meets Monday). */
function longestRun(days: Weekday[]): number {
  if (days.length === 7) return 7;
  const chosen = new Set<number>(days);
  let best = 0;
  for (let start = 1; start <= 7; start++) {
    if (chosen.has(((start + 5) % 7) + 1)) continue; // not the start of a run
    let run = 0;
    let day = start;
    while (chosen.has(day)) {
      run++;
      day = (day % 7) + 1;
    }
    best = Math.max(best, run);
  }
  return best;
}

describe('suggestedWeekdays', () => {
  it.each(DAYS_PER_WEEK)('suggests exactly %i days, in order, without repeats', (count) => {
    const days = suggestedWeekdays(count);
    expect(days).toHaveLength(count);
    expect(new Set(days).size).toBe(count);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    for (const day of days) expect(day >= 1 && day <= 7).toBe(true);
  });

  it('puts a rest day between every session when the count allows it', () => {
    expect(longestRun(suggestedWeekdays(2))).toBe(1);
    expect(longestRun(suggestedWeekdays(3))).toBe(1);
  });

  it('never asks for more than two days in a row at four days', () => {
    expect(longestRun(suggestedWeekdays(4))).toBeLessThanOrEqual(2);
  });

  it('never asks for more than three days in a row at five days', () => {
    expect(longestRun(suggestedWeekdays(5))).toBeLessThanOrEqual(3);
  });

  it('returns a fresh array each time', () => {
    const first = suggestedWeekdays(3);
    first.push(7);
    expect(suggestedWeekdays(3)).toEqual([1, 3, 5]);
  });
});

describe('toggleWeekday', () => {
  it('switches a chosen day off', () => {
    expect(toggleWeekday([1, 3, 5], 3, 3)).toEqual([1, 5]);
  });

  it('switches a day on while there is room, keeping the days in order', () => {
    expect(toggleWeekday([1, 5], 2, 3)).toEqual([1, 2, 5]);
  });

  it('does not add a day once the week is full', () => {
    expect(toggleWeekday([1, 3, 5], 6, 3)).toEqual([1, 3, 5]);
  });
});

describe('weekdaysMatch', () => {
  it('is true only when the number of days equals the count', () => {
    expect(weekdaysMatch([1, 3, 5], 3)).toBe(true);
    expect(weekdaysMatch([1, 3], 3)).toBe(false);
    expect(weekdaysMatch(undefined, 3)).toBe(false);
    expect(weekdaysMatch([1, 3, 5], undefined)).toBe(false);
  });
});
