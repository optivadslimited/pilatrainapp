import type { ISODate, Week, Weekday } from './domain.ts';

/**
 * Calendar-date arithmetic on `YYYY-MM-DD` strings. Everything is done in UTC
 * on whole days, so no timezone or daylight-saving change can shift a date.
 */
const DAY_MS = 86_400_000;

const toUTC = (date: ISODate): number => {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = toUTC(value);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date(toUTC(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Positive when `to` is later. */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

/** 1 for Monday through 7 for Sunday. */
export function isoWeekday(date: ISODate): Weekday {
  const day = new Date(toUTC(date)).getUTCDay();
  return (day === 0 ? 7 : day) as Weekday;
}

/**
 * Today's date in a timezone, e.g. `todayIn('Europe/London')`. An unknown
 * timezone falls back to UTC rather than failing.
 */
export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    if (isISODate(date)) return date;
  } catch {
    // Fall through to UTC.
  }
  return now.toISOString().slice(0, 10);
}

/**
 * A plan's weeks are seven-day windows counted from its start date, not
 * calendar weeks, so every week holds each weekday exactly once.
 */
export function weekOf(planStart: ISODate, date: ISODate): number {
  return Math.floor(diffDays(planStart, date) / 7) + 1;
}

export function weekStart(planStart: ISODate, week: Week | number): ISODate {
  return addDays(planStart, (week - 1) * 7);
}

export function weekEnd(planStart: ISODate, week: Week | number): ISODate {
  return addDays(planStart, week * 7 - 1);
}
