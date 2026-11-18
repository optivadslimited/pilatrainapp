import {
  addDays,
  buildNextBlock,
  buildPlan,
  completeSession,
  isISODate,
  isOpen,
  moveSession,
  PlanInputError,
  reconcileMissed,
  type BuiltPlan,
  type ClassInfo,
  type ISODate,
  type PlanProfile,
  type Scheduled,
  type SessionStatus,
  type Week,
} from './engine/index.ts';

/**
 * What happens to a plan over time: it is built from her answers, kept up to
 * date each time she opens the app, and changed when she moves or completes a
 * session.
 *
 * The rules themselves are in ./engine. This file decides when to apply them
 * and what to save. It reaches storage only through `PlanStore`, so the same
 * code runs against Supabase in the Edge Function and against the phone's own
 * storage in local mode, and can be tested with neither.
 */

/** Her answers, as the engine needs them. */
export type QuizInput = Omit<PlanProfile, 'intensityShift'>;

export type StoredSession = {
  id: string;
  week: Week;
  date: ISODate;
  /** Where the engine first put it, before any move. */
  originalDate: ISODate;
  /** In playing order. Two when a 30-minute session pairs a 20 and a 10. */
  classIds: string[];
  status: SessionStatus;
  /** ISO timestamp. */
  completedAt: string | null;
};

export type StoredPlan = {
  id: string;
  block: number;
  startDate: ISODate;
  endDate: ISODate;
  status: 'active' | 'completed';
  profile: PlanProfile;
  /** The day the plan last moved or dropped a missed session, so Today can say so once. */
  movedNoticeDate: ISODate | null;
  sessions: StoredSession[];
};

export type NewPlan = {
  block: number;
  startDate: ISODate;
  endDate: ISODate;
  profile: PlanProfile;
  sessions: { week: Week; date: ISODate; classIds: string[] }[];
};

export interface PlanStore {
  /** Published classes. */
  listClasses(): Promise<ClassInfo[]>;
  getQuizInput(userId: string): Promise<QuizInput | null>;
  getActivePlan(userId: string): Promise<StoredPlan | null>;
  /** Close any live plan and save this one as the live plan, all or nothing. */
  replaceActivePlan(userId: string, plan: NewPlan): Promise<StoredPlan>;
  updateSessions(planId: string, sessions: StoredSession[]): Promise<void>;
  updatePlan(planId: string, fields: { movedNoticeDate?: ISODate | null }): Promise<void>;
}

export type PlanServiceErrorCode = 'no_answers' | 'no_plan';

export class PlanServiceError extends Error {
  constructor(public readonly code: PlanServiceErrorCode) {
    super(
      code === 'no_answers' ? 'There are no quiz answers to build from.' : 'There is no plan yet.',
    );
    this.name = 'PlanServiceError';
  }
}

/**
 * A new block only steps up if she did at least this share of the last one.
 * ASSUMPTION: the brief says every new block is one step harder. Making it
 * harder for someone who did little of the last block would be unkind, so
 * below this share the next block stays where it is.
 */
const STEP_UP_SHARE = 0.5;

const toNewPlan = (built: BuiltPlan): NewPlan => ({
  block: built.block,
  startDate: built.startDate,
  endDate: built.endDate,
  profile: built.profile,
  sessions: built.sessions.map((session) => ({
    week: session.week,
    date: session.date,
    classIds: session.classIds,
  })),
});

export function createPlanService(store: PlanStore) {
  /** The engine's view of the sessions: each needs its intensity for rule 5. */
  const withIntensity = (
    sessions: readonly StoredSession[],
    catalogue: readonly ClassInfo[],
  ): (StoredSession & Scheduled)[] => {
    const intensity = new Map(catalogue.map((cls) => [cls.id, cls.intensity]));
    return sessions.map((session) => ({
      ...session,
      intensity: Math.max(1, ...session.classIds.map((id) => intensity.get(id) ?? 1)),
    }));
  };

  const withoutIntensity = (sessions: readonly (StoredSession & Scheduled)[]): StoredSession[] =>
    sessions.map(({ intensity: _intensity, ...session }) => session);

  const changedFrom = (before: readonly StoredSession[], after: readonly StoredSession[]) =>
    after.filter((session, index) => {
      const was = before[index];
      return (
        was.date !== session.date ||
        was.status !== session.status ||
        was.week !== session.week ||
        was.completedAt !== session.completedAt
      );
    });

  async function requirePlan(userId: string): Promise<StoredPlan> {
    const plan = await store.getActivePlan(userId);
    if (!plan) throw new PlanServiceError('no_plan');
    return plan;
  }

  /** Rule 10. The block has ended: close it and build the next. */
  async function rollOver(
    userId: string,
    plan: StoredPlan,
    catalogue: readonly ClassInfo[],
    today: ISODate,
  ): Promise<StoredPlan> {
    const done = plan.sessions
      .filter((session) => session.status === 'done')
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = withIntensity(done.slice(-1), catalogue)[0];
    const dayAfter = addDays(plan.endDate, 1);

    const next = buildNextBlock({
      previous: plan,
      catalogue,
      before: last ? { date: last.date, intensity: last.intensity, classIds: last.classIds } : null,
      // If she has been away, the new block starts today, not in the past.
      from: today > dayAfter ? today : dayAfter,
      stepUp: done.length >= plan.sessions.length * STEP_UP_SHARE,
    });
    return store.replaceActivePlan(userId, toNewPlan(next));
  }

  return {
    /**
     * Build her first plan from her quiz answers. Replaces any plan she has,
     * which is what "start again" and re-taking the quiz both want.
     */
    async build(userId: string, today: ISODate): Promise<StoredPlan> {
      if (!isISODate(today)) throw new PlanInputError('Today must be YYYY-MM-DD.');
      const answers = await store.getQuizInput(userId);
      if (!answers) throw new PlanServiceError('no_answers');

      const built = buildPlan({
        profile: { ...answers, intensityShift: 0 },
        catalogue: await store.listClasses(),
        from: today,
      });
      return store.replaceActivePlan(userId, toNewPlan(built));
    },

    /**
     * Her plan as it stands today. Call it whenever she opens the app: it
     * moves or drops sessions whose day has passed (rule 9), and starts the
     * next block once this one has ended (rule 10). `null` if she has no plan.
     */
    async current(userId: string, today: ISODate): Promise<StoredPlan | null> {
      if (!isISODate(today)) throw new PlanInputError('Today must be YYYY-MM-DD.');
      const plan = await store.getActivePlan(userId);
      if (!plan) return null;

      const catalogue = await store.listClasses();
      if (today > plan.endDate) return rollOver(userId, plan, catalogue, today);

      const result = reconcileMissed(
        withIntensity(plan.sessions, catalogue),
        plan.startDate,
        today,
      );
      if (result.moved.length + result.dropped.length === 0) return plan;

      const sessions = withoutIntensity(result.sessions);
      await store.updateSessions(plan.id, changedFrom(plan.sessions, sessions));
      await store.updatePlan(plan.id, { movedNoticeDate: today });
      return { ...plan, sessions, movedNoticeDate: today };
    },

    /** Move a session to another free day of its week. */
    async move(
      userId: string,
      sessionId: string,
      to: ISODate,
      today: ISODate,
    ): Promise<StoredPlan> {
      if (!isISODate(to) || !isISODate(today))
        throw new PlanInputError('Dates must be YYYY-MM-DD.');
      const plan = await requirePlan(userId);
      const catalogue = await store.listClasses();

      const sessions = withoutIntensity(
        moveSession(withIntensity(plan.sessions, catalogue), plan.startDate, sessionId, to, today),
      );
      await store.updateSessions(plan.id, changedFrom(plan.sessions, sessions));
      return { ...plan, sessions };
    },

    /** Mark a session done. `now` is the moment she finished, as an ISO timestamp. */
    async complete(
      userId: string,
      sessionId: string,
      today: ISODate,
      now: string,
    ): Promise<StoredPlan> {
      if (!isISODate(today)) throw new PlanInputError('Today must be YYYY-MM-DD.');
      const plan = await requirePlan(userId);
      const target = plan.sessions.find((session) => session.id === sessionId);
      if (target?.status === 'done') return plan;

      const catalogue = await store.listClasses();
      const sessions = withoutIntensity(
        completeSession(withIntensity(plan.sessions, catalogue), plan.startDate, sessionId, today),
      ).map((session) => (session.id === sessionId ? { ...session, completedAt: now } : session));

      await store.updateSessions(plan.id, changedFrom(plan.sessions, sessions));
      return { ...plan, sessions };
    },
  };
}

export type PlanService = ReturnType<typeof createPlanService>;

/** Sessions still to do, soonest first. */
export const openSessions = (plan: Pick<StoredPlan, 'sessions'>) =>
  plan.sessions.filter(isOpen).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
