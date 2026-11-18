import { isOpen } from '@engine';

import { trialReminderAt, type Entitlement } from '@/features/membership/entitlement';
import { planOf } from '@/features/membership/products';
import { sessionCard, type Catalogue } from '@/features/plan/cards';
import type { StoredPlan } from '@/features/plan/types';
import { formatDay } from '@/lib/format';
import type { ScheduledReminder } from '@/lib/reminders';
import { t } from '@/strings';

/**
 * What to remind her of, and when. Plain functions: the plan, the time and
 * the clock go in, a list of notifications comes out.
 *
 * The rules:
 *  - one notification on each day she has a session, at her chosen time;
 *  - nothing for a day already done, a day that has passed, or a rest day;
 *  - never a second notification about the same session, and never one
 *    about a session she did not do.
 */
export const SESSION_PREFIX = 'session-';
export const TRIAL_REMINDER_ID = 'trial-ending';

/** iOS keeps 64 pending notifications per app. This leaves room and covers a whole plan. */
const MAX_SESSION_REMINDERS = 24;

/** A calendar date and a wall-clock time on this phone, as a moment. */
export function localMoment(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function sessionReminders(
  plan: StoredPlan,
  catalogue: Catalogue,
  time: string,
  now: Date,
): ScheduledReminder[] {
  return plan.sessions
    .filter(isOpen)
    .map((session) => ({ session, at: localMoment(session.date, time) }))
    .filter(({ at }) => at > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_SESSION_REMINDERS)
    .flatMap(({ session, at }) => {
      const card = sessionCard(session, catalogue);
      if (!card) return [];
      return [
        {
          id: `${SESSION_PREFIX}${session.id}`,
          at,
          title: t.reminders.sessionTitle(card.title),
          body: t.reminders.sessionBody(card.minutes),
        },
      ];
    });
}

/** The price she agreed to at the paywall, kept so it can be quoted back to her exactly. */
export type AgreedPrice = { productId: string; price: string };

/**
 * The notice that her free week is ending: two days before it does, naming
 * the date and the price. `null` if there is nothing to warn her about.
 */
export function trialReminder(
  entitlement: Entitlement,
  agreed: AgreedPrice | null,
  now: Date,
): ScheduledReminder | null {
  const at = trialReminderAt(entitlement);
  if (!at || !entitlement.expiresAt || at <= now) return null;

  const plan = planOf(entitlement.productId);
  const priced = agreed && plan && agreed.productId === entitlement.productId;

  return {
    id: TRIAL_REMINDER_ID,
    at,
    title: t.reminders.trialTitle(formatDay(localDate(new Date(entitlement.expiresAt)))),
    body: priced
      ? t.reminders.trialBody(agreed.price, t.paywall.period[plan])
      : t.reminders.trialBodyNoPrice,
  };
}

/** The calendar date of a moment, on this phone. */
export function localDate(moment: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
}
