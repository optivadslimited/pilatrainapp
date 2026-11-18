import { addDays, isOpen, themeOf, weekOf, weekStart, WEEKS, type ISODate } from '@engine';

import { formatDay } from '@/lib/format';
import { t } from '@/strings';

import { sessionCard, type Catalogue, type SessionCard } from './cards';
import type { StoredPlan } from './types';

/** Everything the Plan tab shows: four weeks down the screen, each with its theme. */
export type PlanTabView = {
  weeks: {
    week: number;
    /** "Week 2 · Build" */
    title: string;
    /** "Monday 9 November to Sunday 15 November" */
    range: string;
    isCurrent: boolean;
    sessions: {
      card: SessionCard;
      /** "Wednesday 11 November", or "Today". */
      eyebrow: string;
      /** A session still to do can be moved. */
      canMove: boolean;
    }[];
    /** Shown in place of sessions when the week has none left to show. */
    note: string | null;
  }[];
};

export function planTabView(plan: StoredPlan, catalogue: Catalogue, today: ISODate): PlanTabView {
  const currentWeek = Math.min(4, Math.max(1, weekOf(plan.startDate, today)));

  return {
    weeks: WEEKS.map((week) => {
      const start = weekStart(plan.startDate, week);
      // A dropped session is gone from her plan. It is not listed.
      const sessions = plan.sessions
        .filter((session) => session.week === week && session.status !== 'dropped')
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .map((session) => {
          const card = sessionCard(session, catalogue);
          return card
            ? {
                card,
                eyebrow: session.date === today ? t.plan.today : formatDay(session.date),
                canMove: isOpen(session),
              }
            : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return {
        week,
        title: t.preview.weekTitle(week, t.themes[themeOf(week)]),
        range: t.plan.weekRange(formatDay(start), formatDay(addDays(start, 6))),
        isCurrent: week === currentWeek,
        sessions,
        note: sessions.length === 0 ? t.plan.weekEmpty : null,
      };
    }),
  };
}
