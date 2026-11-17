import type { DaysPerWeek, Weekday } from './questions';

/**
 * The spread of days pre-selected on the "Which days" question. Each one puts
 * rest between sessions where the count allows it and keeps Sunday free.
 * She can change any of them.
 *
 *   2 days: Mon, Thu
 *   3 days: Mon, Wed, Fri
 *   4 days: Mon, Tue, Thu, Sat
 *   5 days: Mon, Tue, Wed, Fri, Sat
 *
 * ASSUMPTION: the spec asks for "a sensible spread"; these are our choice.
 */
const SUGGESTED: Record<DaysPerWeek, Weekday[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
};

export function suggestedWeekdays(count: DaysPerWeek): Weekday[] {
  return [...SUGGESTED[count]];
}

/**
 * Toggle a day in the picker. A day can always be switched off. A day can only
 * be switched on while fewer than `count` are chosen, so the selection can
 * never exceed what she said in the previous question.
 */
export function toggleWeekday(current: readonly Weekday[], day: Weekday, count: number): Weekday[] {
  if (current.includes(day)) return current.filter((item) => item !== day);
  if (current.length >= count) return [...current];
  return [...current, day].sort((a, b) => a - b);
}

/** The chosen days are valid when there are exactly as many as she asked for. */
export function weekdaysMatch(current: readonly Weekday[] | undefined, count: number | undefined) {
  return current !== undefined && count !== undefined && current.length === count;
}
