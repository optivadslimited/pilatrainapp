import { themeOf, WEEKS } from '@engine';

import { t } from '@/strings';

import { sessionCard, type Catalogue, type SessionCard } from './cards';
import type { StoredPlan } from './types';

/** Everything the plan preview shows, worked out from the plan that was just built. */
export type PlanPreview = {
  /** "Your 28-day plan, Amira" */
  headline: string;
  /** "3 days a week", "20 min", "Core focus" */
  chips: string[];
  /** Week 1, in full. */
  weekOne: { title: string; sessions: SessionCard[] };
  /** Weeks 2 to 4, as titled rows: Build, Strengthen, Flow. */
  laterWeeks: { week: number; title: string; summary: string }[];
};

export function planPreview(
  plan: StoredPlan,
  catalogue: Catalogue,
  firstName?: string,
): PlanPreview {
  const name = firstName?.trim();
  const { profile } = plan;
  const title = (week: number) => t.preview.weekTitle(week, t.themes[themeOf(week)]);
  const inWeek = (week: number) =>
    plan.sessions.filter((session) => session.week === week && session.status !== 'dropped');

  return {
    headline: name ? t.preview.headline(name) : t.preview.headlineNoName,
    chips: [
      t.preview.daysChip(profile.weekdays.length),
      t.preview.minutesChip(profile.minutes),
      t.preview.focusChip[profile.goal],
    ],
    weekOne: {
      title: title(1),
      sessions: inWeek(1)
        .map((session) => sessionCard(session, catalogue))
        .filter((card): card is SessionCard => card !== null),
    },
    laterWeeks: WEEKS.filter((week) => week > 1).map((week) => ({
      week,
      title: title(week),
      summary: t.preview.sessions(inWeek(week).length),
    })),
  };
}
