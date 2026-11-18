import { addDays, type ISODate } from '@engine';

import { storage } from './storage';

/**
 * Today's date, as the app sees it.
 *
 * In development the date can be moved forward (You → Developer), which is
 * how rest days, missed days and the next block are tested without waiting
 * for them. The offset is never applied in a production build.
 */
const OFFSET_KEY = 'dev.dayOffset';

const pad = (n: number) => String(n).padStart(2, '0');

/** The calendar date on this phone, in its own timezone. */
function deviceToday(now: Date = new Date()): ISODate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function devDayOffset(): number {
  return __DEV__ ? (storage.getNumber(OFFSET_KEY) ?? 0) : 0;
}

export function setDevDayOffset(days: number): void {
  if (__DEV__) storage.set(OFFSET_KEY, Math.max(0, Math.round(days)));
}

export function today(now: Date = new Date()): ISODate {
  return addDays(deviceToday(now), devDayOffset());
}

/**
 * This moment, as the app sees it: the real time, moved forward by the same
 * development offset as `today()`, so a trial can be watched running out.
 */
export function now(real: Date = new Date()): Date {
  return new Date(real.getTime() + devDayOffset() * 24 * 60 * 60 * 1000);
}

/** Her timezone, e.g. "Europe/London". Stored on her users row so the server knows her "today". */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
