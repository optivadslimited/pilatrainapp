import {
  addDays,
  buildNextBlock,
  buildPlan,
  completeSession,
  easier,
  feedbackSignal,
  harder,
  isISODate,
  isOpen,
  moveSession,
  PlanInputError,
  rebuildRemaining,
  reconcileMissed,
  replan,
  validateProfile,
  weekOf,
  type BuiltPlan,
  type ClassInfo,
  type ISODate,
  type Minutes,
  type PlannedSession,
  type PlanProfile,
  type Rating,
  type Scheduled,
  type SessionStatus,
  type Week,
  type Weekday,
} from './engine/index.ts';

/**
 * What happens to a plan over time: it is built from her answers, kept up to
 * date each time she opens the app, and changed when she moves, completes or
 * rates a session, or adjusts her days.
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
  /** When her feedback last changed the plan (ISO timestamp). Ratings before it are spent. */
  adjustedAt: string | null;
  sessions: StoredSession[];
};

export type NewSession = { week: Week; date: ISODate; classIds: string[] };

export type NewPlan = {
  block: number;
  startDate: ISODate;
  endDate: ISODate;
  profile: PlanProfile;
  sessions: NewSession[];
};

export type StoredRating = {
  planId: string;
  sessionId: string;
  rating: Rating;
  /** ISO timestamp. */
  createdAt: string;
};

export interface PlanStore {
  /** Published classes. */
  listClasses(): Promise<ClassInfo[]>;
  getQuizInput(userId: string): Promise<QuizInput | null>;
  getActivePlan(userId: string): Promise<StoredPlan | null>;
  /** Every plan she has had, oldest first, the live one last. */
  listPlans(userId: string): Promise<StoredPlan[]>;
  /** Close any live plan and save this one as the live plan, all or nothing. */
  replaceActivePlan(userId: string, plan: NewPlan): Promise<StoredPlan>;
  updateSessions(planId: string, sessions: StoredSession[]): Promise<void>;
  updatePlan(planId: string, fields: { movedNoticeDate?: ISODate | null }): Promise<void>;
  /**
   * Take some not-yet-done sessions out of a plan and put new ones in, and
   * update the plan's profile, all or nothing. Returns the plan as it now is.
   */
  replaceSessions(
    planId: string,
    removeIds: string[],
    add: NewSession[],
    fields: { profile?: PlanProfile; adjustedAt?: string },
  ): Promise<StoredPlan>;
  /** Her ratings, oldest first. All of them, or one plan's. */
  listRatings(userId: string, planId?: string): Promise<StoredRating[]>;
  addRating(userId: string, rating: StoredRating): Promise<void>;
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
 * How her feedback changed the plan, if it did.
 *  - eased: two "too hard" in a row. Next week is gentler and gains a foundations class.
 *  - stepped_up: two "too easy" in a row. Next week is more intense.
 *  - longer: two "too easy" in a row at the top of intensity. Sessions get longer.
 */
export type FeedbackEffect = 'eased' | 'stepped_up' | 'longer' | null;

/**
 * A new block only steps up if she did at least this share of the last one.
 * ASSUMPTION: the brief says every new block is one step harder. Making it
 * harder for someone who did little of the last block would be unkind, so
 * below this share the next block stays where it is.
 */
const STEP_UP_SHARE = 0.5;

const toNewSession = (session: PlannedSession): NewSession => ({
  week: session.week,
  date: session.date,
  classIds: session.classIds,
});

const toNewPlan = (built: BuiltPlan): NewPlan => ({
  block: built.block,
  startDate: built.startDate,
  endDate: built.endDate,
  profile: built.profile,
  sessions: built.sessions.map(toNewSession),
});

const byDate = (a: { date: ISODate }, b: { date: ISODate }) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

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
    const done = plan.sessions.filter((session) => session.status === 'done').sort(byDate);
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
      if (!isISODate(to) || !isISODate(today)) {
        throw new PlanInputError('Dates must be YYYY-MM-DD.');
      }
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

    /**
     * Rule 8. Save how a finished session felt, and act on it: two "too hard"
     * in a row ease next week and add a foundations class; two "too easy"
     * step it up, or lengthen sessions if she is already at the top.
     *
     * The change applies from next week onward, so nothing she can see this
     * week shifts under her. Each pair of ratings changes the plan once.
     */
    async rate(
      userId: string,
      sessionId: string,
      rating: Rating,
      today: ISODate,
      now: string,
    ): Promise<{ plan: StoredPlan; effect: FeedbackEffect }> {
      if (!isISODate(today)) throw new PlanInputError('Today must be YYYY-MM-DD.');
      const plan = await requirePlan(userId);
      const session = plan.sessions.find((item) => item.id === sessionId);
      if (!session || session.status !== 'done') {
        throw new PlanInputError('Only a finished session can be rated.');
      }

      const earlier = await store.listRatings(userId, plan.id);
      // A session is rated once. A second rating is ignored, not an error.
      if (earlier.some((item) => item.sessionId === sessionId)) return { plan, effect: null };

      const saved: StoredRating = { planId: plan.id, sessionId, rating, createdAt: now };
      await store.addRating(userId, saved);

      const fresh = [...earlier, saved].filter(
        (item) => plan.adjustedAt === null || item.createdAt > plan.adjustedAt,
      );
      const signal = feedbackSignal(fresh.map((item) => item.rating));
      if (!signal) return { plan, effect: null };

      const catalogue = await store.listClasses();
      const step =
        signal === 'lower' ? easier(plan.profile, catalogue) : harder(plan.profile, catalogue);
      // Two "too easy" at the very top: there is nothing harder to give her.
      if (signal === 'raise' && step.change === 'none') return { plan, effect: null };

      const result = replan({
        profile: step.profile,
        catalogue,
        sessions: plan.sessions,
        fromWeek: weekOf(plan.startDate, today) + 1,
        addFoundations: signal === 'lower',
      });

      const removeIds = plan.sessions
        .filter((_, index) => result.sessions[index] !== null)
        .map((item) => item.id);
      const add = result.sessions
        .filter((item): item is PlannedSession => item !== null)
        .map(toNewSession);

      const updated = await store.replaceSessions(plan.id, removeIds, add, {
        profile: step.profile,
        adjustedAt: now,
      });
      const effect: FeedbackEffect =
        signal === 'lower' ? 'eased' : step.change === 'length' ? 'longer' : 'stepped_up';
      return { plan: updated, effect };
    },

    /**
     * "Adjust my plan": she has changed her days or her session length. The
     * sessions still to do are laid out again on the new days, from today to
     * the end of the 28 days. What she has done is untouched.
     */
    async adjust(
      userId: string,
      changes: { weekdays: readonly Weekday[]; minutes: Minutes },
      today: ISODate,
    ): Promise<StoredPlan> {
      if (!isISODate(today)) throw new PlanInputError('Today must be YYYY-MM-DD.');
      const plan = await requirePlan(userId);
      const profile: PlanProfile = {
        ...plan.profile,
        weekdays: [...changes.weekdays].sort((a, b) => a - b),
        minutes: changes.minutes,
      };
      validateProfile(profile);

      const doneToday = plan.sessions.some(
        (session) => session.status === 'done' && session.date === today,
      );
      const rebuilt = rebuildRemaining({
        profile,
        catalogue: await store.listClasses(),
        planStart: plan.startDate,
        block: plan.block,
        sessions: plan.sessions,
        from: doneToday ? addDays(today, 1) : today,
      });

      return store.replaceSessions(
        plan.id,
        plan.sessions.filter(isOpen).map((session) => session.id),
        rebuilt.sessions.map(toNewSession),
        { profile },
      );
    },
  };
}

export type PlanService = ReturnType<typeof createPlanService>;

/** Sessions still to do, soonest first. */
export const openSessions = (plan: Pick<StoredPlan, 'sessions'>) =>
  plan.sessions.filter(isOpen).sort(byDate);
