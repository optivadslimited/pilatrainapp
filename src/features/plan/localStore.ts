import type {
  NewPlan,
  PlanStore,
  QuizInput,
  StoredPlan,
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
const COUNTER_KEY = 'plan.counter';

/** The sixteen placeholder classes. TODO(owner): replaced by the real catalogue from the database. */
export const localCatalogue = seedClasses as unknown as ClassDetails[];

export function readLocalPlan(): StoredPlan | null {
  const raw = storage.getString(PLAN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPlan;
  } catch {
    return null;
  }
}

function writeLocalPlan(plan: StoredPlan): void {
  storage.set(PLAN_KEY, JSON.stringify(plan));
}

/** Forget the plan on this phone. Used when onboarding is restarted. */
export function clearLocalPlan(): void {
  storage.remove(PLAN_KEY);
}

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

    async replaceActivePlan(_userId: string, plan: NewPlan): Promise<StoredPlan> {
      const number = (storage.getNumber(COUNTER_KEY) ?? 0) + 1;
      storage.set(COUNTER_KEY, number);
      const id = `local-${number}`;

      const saved: StoredPlan = {
        id,
        block: plan.block,
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: 'active',
        profile: plan.profile,
        movedNoticeDate: null,
        sessions: plan.sessions.map((session, index) => ({
          id: `${id}-${index + 1}`,
          week: session.week,
          date: session.date,
          originalDate: session.date,
          classIds: session.classIds,
          status: 'planned',
          completedAt: null,
        })),
      };
      writeLocalPlan(saved);
      return saved;
    },

    async updateSessions(planId: string, sessions: StoredSession[]) {
      const plan = readLocalPlan();
      if (!plan || plan.id !== planId) return;
      const changed = new Map(sessions.map((session) => [session.id, session]));
      writeLocalPlan({
        ...plan,
        sessions: plan.sessions.map((session) => changed.get(session.id) ?? session),
      });
    },

    async updatePlan(planId: string, fields: { movedNoticeDate?: string | null }) {
      const plan = readLocalPlan();
      if (!plan || plan.id !== planId) return;
      writeLocalPlan({ ...plan, ...fields });
    },
  };
}
