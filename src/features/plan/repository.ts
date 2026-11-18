import type { ISODate } from '@engine';
import { createPlanService, type StoredPlan } from '@shared/plan-service';

import { quizAnswersRow, quizInputFrom } from '@/features/onboarding/answers';
import { useOnboardingStore } from '@/features/onboarding/store';
import { deviceTimezone, today } from '@/lib/clock';
import { ensureSession, supabase } from '@/lib/supabase';

import { createLocalPlanStore, localCatalogue } from './localStore';
import type { ClassDetails } from './types';

/**
 * Where plans come from. The screens only ever talk to this interface.
 *
 *  - Local: no Supabase keys yet. The plan service runs on the phone.
 *  - Remote: the `plan` Edge Function runs the same service on the server.
 */
export interface PlanRepository {
  readonly mode: 'local' | 'remote';
  getCatalogue(): Promise<ClassDetails[]>;
  /** Build her first plan from her quiz answers. */
  buildPlan(): Promise<StoredPlan>;
  /** Her plan as it stands today, with missed sessions moved. `null` if she has none. */
  getCurrentPlan(): Promise<StoredPlan | null>;
  moveSession(sessionId: string, to: ISODate): Promise<StoredPlan>;
  completeSession(sessionId: string): Promise<StoredPlan>;
}

const LOCAL_USER = 'local';

function createLocalRepository(): PlanRepository {
  const service = createPlanService(
    createLocalPlanStore(() => quizInputFrom(useOnboardingStore.getState())),
  );

  return {
    mode: 'local',
    getCatalogue: async () => localCatalogue.filter((cls) => cls.published),
    buildPlan: () => service.build(LOCAL_USER, today()),
    getCurrentPlan: () => service.current(LOCAL_USER, today()),
    moveSession: (sessionId, to) => service.move(LOCAL_USER, sessionId, to, today()),
    completeSession: (sessionId) =>
      service.complete(LOCAL_USER, sessionId, today(), new Date().toISOString()),
  };
}

type ClassRow = {
  id: string;
  slug: string;
  title: string;
  instructor_id: string;
  length_min: number;
  level: number;
  focus: string;
  intensity: number;
  equipment: string[];
  unsuitable_for: string[];
  mux_playback_id: string | null;
  thumbnail_url: string | null;
  captions_url: string | null;
  chapters: { title: string; start_sec: number }[];
  easier_options: { chapter: string; text: string }[];
  is_free: boolean;
  published: boolean;
};

const toClassDetails = (row: ClassRow): ClassDetails =>
  ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    instructorId: row.instructor_id,
    lengthMin: row.length_min,
    level: row.level,
    focus: row.focus,
    intensity: row.intensity,
    equipment: row.equipment,
    unsuitableFor: row.unsuitable_for,
    muxPlaybackId: row.mux_playback_id,
    thumbnailUrl: row.thumbnail_url,
    captionsUrl: row.captions_url,
    chapters: row.chapters.map((chapter) => ({
      title: chapter.title,
      startSec: chapter.start_sec,
    })),
    easierOptions: row.easier_options,
    isFree: row.is_free,
    published: row.published,
  }) as ClassDetails;

/**
 * NOT YET RUN AGAINST A REAL PROJECT: there are no Supabase keys yet.
 * TODO(owner): supply them, then this path can be exercised end to end.
 */
function createRemoteRepository(client: NonNullable<typeof supabase>): PlanRepository {
  async function call(body: Record<string, unknown>): Promise<StoredPlan | null> {
    await ensureSession();
    const { data, error } = await client.functions.invoke<{ plan: StoredPlan | null }>('plan', {
      body,
    });
    if (error) throw error;
    return data?.plan ?? null;
  }

  const required = async (body: Record<string, unknown>): Promise<StoredPlan> => {
    const plan = await call(body);
    if (!plan) throw new Error('The plan function returned no plan.');
    return plan;
  };

  /** Her name, timezone and quiz answers, saved to our own database before a plan is built. */
  async function saveAnswers(): Promise<void> {
    const userId = await ensureSession();
    const state = useOnboardingStore.getState();
    const row = userId ? quizAnswersRow(state, userId) : null;
    if (!userId || !row) throw new Error('The quiz is not finished.');

    const user = await client.from('users').upsert({
      id: userId,
      first_name: state.answers.firstName?.trim() || null,
      timezone: deviceTimezone(),
    });
    if (user.error) throw user.error;

    const answers = await client.from('quiz_answers').upsert(row);
    if (answers.error) throw answers.error;
  }

  return {
    mode: 'remote',

    async getCatalogue() {
      const { data, error } = await client.from('classes').select('*').eq('published', true);
      if (error) throw error;
      return (data as ClassRow[]).map(toClassDetails);
    },

    async buildPlan() {
      await saveAnswers();
      return required({ action: 'build' });
    },

    getCurrentPlan: () => call({ action: 'current' }),
    moveSession: (sessionId, to) => required({ action: 'move', sessionId, to }),
    completeSession: (sessionId) => required({ action: 'complete', sessionId }),
  };
}

export const planRepository: PlanRepository = supabase
  ? createRemoteRepository(supabase)
  : createLocalRepository();
