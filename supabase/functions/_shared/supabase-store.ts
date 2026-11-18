import type { ClassInfo, ISODate, PlanProfile, SessionStatus, Week } from './engine/index.ts';
import type { NewPlan, PlanStore, QuizInput, StoredPlan, StoredSession } from './plan-service.ts';

/**
 * `PlanStore` on Supabase. It is given a client signed in as the user, so
 * row-level security applies to everything here: it can only ever read and
 * write her own rows.
 *
 * NOT YET RUN AGAINST A REAL PROJECT. The SQL it relies on is tested
 * (`npm run db:check`), and the service above it is tested against the
 * phone's store, but this mapping between rows and plans has only been
 * type-checked. TODO(owner): supply a Supabase project so it can be run.
 */

/** The little of supabase-js this file uses, so it type-checks in both Deno and the app. */
// deno-lint-ignore no-explicit-any
type Query = any;
export type SupabaseLike = {
  from: (table: string) => Query;
  rpc: (fn: string, args: Record<string, unknown>) => Query;
};

type ClassRow = {
  id: string;
  slug: string;
  length_min: number;
  level: number;
  focus: string;
  intensity: number;
  equipment: string[];
  unsuitable_for: string[];
  published: boolean;
};

type SessionRow = {
  id: string;
  class_id: string;
  paired_class_id: string | null;
  scheduled_date: ISODate;
  original_date: ISODate;
  week: number;
  status: SessionStatus;
  completed_at: string | null;
};

type PlanRow = {
  id: string;
  block: number;
  start_date: ISODate;
  end_date: ISODate;
  status: 'active' | 'completed';
  profile: PlanProfile;
  moved_notice_date: ISODate | null;
  plan_sessions: SessionRow[];
};

const PLAN_COLUMNS =
  'id, block, start_date, end_date, status, profile, moved_notice_date, ' +
  'plan_sessions (id, class_id, paired_class_id, scheduled_date, original_date, week, status, completed_at)';

const toClass = (row: ClassRow): ClassInfo => ({
  id: row.id,
  slug: row.slug,
  lengthMin: row.length_min as ClassInfo['lengthMin'],
  level: row.level as ClassInfo['level'],
  focus: row.focus as ClassInfo['focus'],
  intensity: row.intensity as ClassInfo['intensity'],
  equipment: row.equipment as ClassInfo['equipment'],
  unsuitableFor: row.unsuitable_for as ClassInfo['unsuitableFor'],
  published: row.published,
});

const toSession = (row: SessionRow): StoredSession => ({
  id: row.id,
  week: row.week as Week,
  date: row.scheduled_date,
  originalDate: row.original_date,
  classIds: row.paired_class_id ? [row.class_id, row.paired_class_id] : [row.class_id],
  status: row.status,
  completedAt: row.completed_at,
});

const toPlan = (row: PlanRow): StoredPlan => ({
  id: row.id,
  block: row.block,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status,
  profile: row.profile,
  movedNoticeDate: row.moved_notice_date,
  sessions: row.plan_sessions
    .map(toSession)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
});

async function unwrap<T>(
  query: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export function supabasePlanStore(
  client: SupabaseLike,
): PlanStore & { getTimezone(userId: string): Promise<string> } {
  let classes: Promise<ClassInfo[]> | null = null;

  const getPlan = async (filter: (query: Query) => Query): Promise<StoredPlan | null> => {
    const row = await unwrap<PlanRow | null>(
      filter(client.from('plans').select(PLAN_COLUMNS)).maybeSingle(),
    );
    return row ? toPlan(row) : null;
  };

  return {
    // One request serves several reads of the catalogue.
    listClasses() {
      classes ??= unwrap<ClassRow[]>(
        client
          .from('classes')
          .select(
            'id, slug, length_min, level, focus, intensity, equipment, unsuitable_for, published',
          )
          .eq('published', true),
      ).then((rows) => rows.map(toClass));
      return classes;
    },

    async getQuizInput(userId: string): Promise<QuizInput | null> {
      const row = await unwrap<Record<string, unknown> | null>(
        client
          .from('quiz_answers')
          .select('goal, level, minutes, days, equipment, work_around, gentle')
          .eq('user_id', userId)
          .maybeSingle(),
      );
      if (!row) return null;
      return {
        goal: row.goal,
        level: row.level,
        minutes: row.minutes,
        weekdays: row.days,
        equipment: row.equipment,
        workAround: row.work_around,
        gentle: row.gentle,
      } as QuizInput;
    },

    getActivePlan(userId: string) {
      return getPlan((query) => query.eq('user_id', userId).eq('status', 'active'));
    },

    async replaceActivePlan(_userId: string, plan: NewPlan): Promise<StoredPlan> {
      // One transaction in the database: see public.save_plan in the migration.
      const id = await unwrap<string>(
        client.rpc('save_plan', {
          new_plan: {
            start_date: plan.startDate,
            end_date: plan.endDate,
            block: plan.block,
            profile: plan.profile,
          },
          new_sessions: plan.sessions.map((session) => ({
            class_id: session.classIds[0],
            paired_class_id: session.classIds[1] ?? null,
            scheduled_date: session.date,
            week: session.week,
          })),
        }),
      );
      const saved = await getPlan((query) => query.eq('id', id));
      if (!saved) throw new Error('The plan was saved but could not be read back.');
      return saved;
    },

    async updateSessions(_planId: string, sessions: StoredSession[]): Promise<void> {
      for (const session of sessions) {
        await unwrap(
          client
            .from('plan_sessions')
            .update({
              scheduled_date: session.date,
              week: session.week,
              status: session.status,
              completed_at: session.completedAt,
            })
            .eq('id', session.id),
        );
      }
    },

    async updatePlan(planId: string, fields: { movedNoticeDate?: ISODate | null }): Promise<void> {
      if (fields.movedNoticeDate === undefined) return;
      await unwrap(
        client.from('plans').update({ moved_notice_date: fields.movedNoticeDate }).eq('id', planId),
      );
    },

    async getTimezone(userId: string): Promise<string> {
      const row = await unwrap<{ timezone: string } | null>(
        client.from('users').select('timezone').eq('id', userId).maybeSingle(),
      );
      return row?.timezone ?? 'UTC';
    },
  };
}
