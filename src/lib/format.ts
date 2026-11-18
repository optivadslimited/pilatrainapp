import { t } from '@/strings';

/** Seconds as a clock: 75 → "1:15", 3725 → "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * The one-line summary under a class title: "20 min · Beginner · Mat".
 * Equipment beyond the mat is listed; a mat-only class just says "Mat".
 */
export function formatClassMeta(input: {
  minutes: number;
  level: number;
  equipment: readonly string[];
}): string {
  const extras = input.equipment.filter((item) => item !== 'mat');
  const kit = (extras.length > 0 ? extras : ['mat'])
    .map((item) => t.classMeta.equipment[item] ?? item)
    .join(', ');
  const level = t.classMeta.level[input.level] ?? '';
  return [t.classMeta.minutes(input.minutes), level, kit].filter(Boolean).join(' · ');
}

const dateParts = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  // getUTCDay is 0 for Sunday; the strings list starts on Monday.
  const weekdayIndex = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  return { day, monthIndex: month - 1, weekdayIndex };
};

/** The weekday of a `YYYY-MM-DD` date: "Thursday". */
export function weekdayName(date: string): string {
  return t.weekdays.long[dateParts(date).weekdayIndex];
}

/** One letter for the weekday of a date: "T". */
export function weekdayLetter(date: string): string {
  return t.weekdays.letter[dateParts(date).weekdayIndex];
}

/** A `YYYY-MM-DD` date written out: "Thursday 19 November". */
export function formatDay(date: string): string {
  const { day, monthIndex, weekdayIndex } = dateParts(date);
  return t.date(t.weekdays.long[weekdayIndex], day, t.months[monthIndex]);
}

/** ISO weekdays (1 Monday to 7 Sunday) as a short list: "Mon, Wed, Fri". */
export function weekdayList(weekdays: readonly number[]): string {
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((day) => t.weekdays.short[day - 1])
    .join(', ');
}

/** A wall-clock time ("07:30") the way this phone writes times: "7:30 am" or "07:30". */
export function formatTime(time: string, locale?: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const moment = new Date(2000, 0, 1, hours, minutes);
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(moment);
  } catch {
    return time;
  }
}

/** The calendar date of a moment on this phone, written out: "Thursday 19 November". */
export function formatMoment(iso: string): string {
  const moment = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return formatDay(
    `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`,
  );
}
