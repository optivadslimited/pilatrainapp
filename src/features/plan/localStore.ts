import type {
  NewPlan,
  NewSession,
  PlanStore,
  QuizInput,
  StoredPlan,
  StoredRating,
  StoredSession,
} from '@shared/plan-service';

import { storage } from '@/lib/storage';

import seedClasses from './data/seedClasses.json';
import type { ClassDetails } from './types';

/**
 * Local mode: the plan kept on the phone.
 *
 * Until the Supabase keys exist there is no server, so the plan service runs
 * on the device against this store and the sixteen bundled placeholder
 * classes. It implements the same `PlanStore` the server does, so the rules
 * that run here are exactly the ones that will run there.
 *
 * Nothing in local mode leaves the phone.
 */
const PLAN_KEY = 'plan.active';
const HISTORY_KEY = 'plan.history';
const RATINGS_KEY = 'plan.ratings';
const COUNTER_KEY = 'plan.counter';

/** The sixteen placeholder classes. TODO(owner): replaced by the real catalogue from the database. */
export const localCatalogue = seedClasses as unknown as ClassDetails[];

function read<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const write = (key: string, value: unknown) => storage.set(key, JSON.stringify(value));

/** Plans saved before a field existed read back with its default. */
const withDefaults = (plan: StoredPlan): StoredPlan => ({
  ...plan,
  adjustedAt: plan.adjustedAt ?? null,
});

export function readLocalPlan(): StoredPlan | null {
  const plan = read<StoredPlan | null>(PLAN_KEY, null);
  return plan ? withDefaults(plan) : null;
}

/** Forget every plan and rating on this phone. Used when onboarding is restarted. */
export function clearLocalPlan(): void {
  for (const key of [PLAN_KEY, HISTORY_KEY, RATINGS_KEY]) storage.remove(key);
}

const nextNumber = (): number => {
  const number = (storage.getNumber(COUNTER_KEY) ?? 0) + 1;
  storage.set(COUNTER_KEY, number);
  return number;
};

const toStored = (session: NewSession, id: string): StoredSession => ({
  id,
  week: session.week,
  date: session.date,
  originalDate: session.date,
  classIds: session.classIds,
  status: 'planned',
  completedAt: null,
});

const byDate = (a: StoredSession, b: StoredSession) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

export function createLocalPlanStore(getQuizInput: () => QuizInput | null): PlanStore {
  return {
    async listClasses() {
      return localCatalogue.filter((cls) => cls.published);
    },

    async getQuizInput() {
      return getQuizInput();
    },

    async getActivePlan() {
      const plan = readLocalPlan();
      return plan?.status === 'active' ? plan : null;
    },

    async listPlans() {
      const history = read<StoredPlan[]>(HISTORY_KEY, []).map(withDefaults);
      const active = readLocalPlan();
      return active ? [...history, active] : history;
    },

    async replaceActivePlan(_userId: string, plan: NewPlan): Promise<StoredPlan> {
      // The plan being replaced is kept, closed, so Progress can still count it.
      const previous = readLocalPlan();
      if (previous) {
        write(HISTORY_KEY, [
          ...read<StoredPlan[]>(HISTORY_KEY, []),
          { ...previous, status: 'completed' },
        ]);
      }

      const id = `local-${nextNumber()}`;
      const saved: StoredPlan = {
        id,
        block: plan.block,
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: 'active',
        profile: plan.profile,
        movedNoticeDate: null,
        adjustedAt: null,
        sessions: plan.sessions.map((session, index) => toStored(session, `${id}-${index + 1}`)),
      };
      write(PLAN_KEY, saved);
      return saved;
    },

    async updateSessions(planId: string, sessions: StoredSession[]) {
      const plan = readLocalPlan();
      if (!plan || plan.id !== planId) return;
      const changed = new Map(sessions.map((session) => [session.id, session]));
      write(PLAN_KEY, {
        ...plan,
        sessions: plan.sessions.map((session) => changed.get(session.id) ?? session),
      });
    },

    async updatePlan(planId: string, fields: { movedNoticeDate?: string | null }) {
      const plan = readLocalPlan();
      if (!plan || plan.id !== planId) return;
      write(PLAN_KEY, { ...plan, ...fields });
    },

    async replaceSessions(planId, removeIds, add, fields): Promise<StoredPlan> {
      const plan = readLocalPlan();
      if (!plan || plan.id !== planId) throw new Error('There is no such plan on this phone.');

      const remove = new Set(removeIds);
      // As on the server: a session that is done is never taken out.
      const kept = plan.sessions.filter(
        (session) => !remove.has(session.id) || session.status === 'done',
      );
      const added = add.map((session) => toStored(session, `${planId}-n${nextNumber()}`));

      const updated: StoredPlan = {
        ...plan,
        profile: fields.profile ?? plan.profile,
        adjustedAt: fields.adjustedAt ?? plan.adjustedAt,
        sessions: [...kept, ...added].sort(byDate),
      };
      write(PLAN_KEY, updated);
      return updated;
    },

    async listRatings(_userId: string, planId?: string) {
      const ratings = read<StoredRating[]>(RATINGS_KEY, []);
      return planId ? ratings.filter((rating) => rating.planId === planId) : ratings;
    },

    async addRating(_userId: string, rating: StoredRating) {
      write(RATINGS_KEY, [...read<StoredRating[]>(RATINGS_KEY, []), rating]);
    },
  };
}
