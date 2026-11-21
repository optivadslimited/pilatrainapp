import type { ISODate, Minutes, Rating, Weekday } from '@engine';
import {
  createPlanService,
  type FeedbackEffect,
  type StoredPlan,
  type StoredRating,
} from '@shared/plan-service';
import { supabasePlanStore } from '@shared/supabase-store';

import { brand } from '@/config/brand';
import { quizAnswersRow, quizInputFrom } from '@/features/onboarding/answers';
import { useOnboardingStore } from '@/features/onboarding/store';
import { deviceTimezone, today } from '@/lib/clock';
import { storage } from '@/lib/storage';
import { ensureSession, supabase } from '@/lib/supabase';

import { createLocalPlanStore, localCatalogue, PROGRESS_KEY } from './localStore';
import type { ClassDetails } from './types';

/** How far she has got through a class, so the player can pick up where she left off. */
export type ClassProgress = { positionSec: number; percent: number };

export type Instructor = { id: string; name: string; credential: string };

/** Everything she has done: every plan she has had, and how the classes felt. */
export type History = { plans: StoredPlan[]; ratings: StoredRating[] };

/**
 * Where plans come from. The screens only ever talk to this interface.
 *
 *  - Local: no Supabase keys yet. The plan service runs on the phone.
 *  - Remote: the `plan` Edge Function runs the same service on the server.
 */
export interface PlanRepository {
  readonly mode: 'local' | 'remote';
  getCatalogue(): Promise<ClassDetails[]>;
  getInstructors(): Promise<Instructor[]>;
  /** Build her first plan from her quiz answers. */
  buildPlan(): Promise<StoredPlan>;
  /** Her plan as it stands today, with missed sessions moved. `null` if she has none. */
  getCurrentPlan(): Promise<StoredPlan | null>;
  moveSession(sessionId: string, to: ISODate): Promise<StoredPlan>;
  completeSession(sessionId: string): Promise<StoredPlan>;
  /** Save how a finished session felt. The plan may change in answer (rule 8). */
  rateSession(
    sessionId: string,
    rating: Rating,
  ): Promise<{ plan: StoredPlan; effect: FeedbackEffect }>;
  /** "Adjust my plan": lay the rest of the plan out again on new days or a new length. */
  adjustPlan(changes: { weekdays: readonly Weekday[]; minutes: Minutes }): Promise<StoredPlan>;
  getHistory(): Promise<History>;
  getClassProgress(classId: string): Promise<ClassProgress | null>;
  saveClassProgress(classId: string, progress: ClassProgress): Promise<void>;
}

const LOCAL_USER = 'local';

function createLocalRepository(): PlanRepository {
  const store = createLocalPlanStore(() => quizInputFrom(useOnboardingStore.getState()));
  const service = createPlanService(store);
  const now = () => new Date().toISOString();

  const readProgress = (): Record<string, ClassProgress> => {
    try {
      return JSON.parse(storage.getString(PROGRESS_KEY) ?? '{}');
    } catch {
      return {};
    }
  };

  return {
    mode: 'local',
    getCatalogue: async () => localCatalogue.filter((cls) => cls.published),
    getInstructors: async () => [
      {
        id: localCatalogue[0]?.instructorId ?? 'instructor',
        name: brand.instructor.name,
        credential: brand.instructor.credential,
      },
    ],
    buildPlan: () => service.build(LOCAL_USER, today()),
    getCurrentPlan: () => service.current(LOCAL_USER, today()),
    moveSession: (sessionId, to) => service.move(LOCAL_USER, sessionId, to, today()),
    completeSession: (sessionId) => service.complete(LOCAL_USER, sessionId, today(), now()),
    rateSession: (sessionId, rating) => service.rate(LOCAL_USER, sessionId, rating, today(), now()),
    adjustPlan: (changes) => service.adjust(LOCAL_USER, changes, today()),
    getHistory: async () => ({
      plans: await store.listPlans(LOCAL_USER),
      ratings: await store.listRatings(LOCAL_USER),
    }),
    getClassProgress: async (classId) => readProgress()[classId] ?? null,
    saveClassProgress: async (classId, progress) => {
      storage.set(PROGRESS_KEY, JSON.stringify({ ...readProgress(), [classId]: progress }));
    },
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
  highlights: string[];
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
    highlights: row.highlights,
    isFree: row.is_free,
    published: row.published,
  }) as ClassDetails;

/**
 * Run on 21 November 2026 in the Simulator against the Supabase project: the
 * quiz answers were saved and the plan function built and returned her
 * 28-day plan. Not yet run: moving, completing and rating sessions, and
 * "Adjust my plan", against the live project.
 */
function createRemoteRepository(client: NonNullable<typeof supabase>): PlanRepository {
  // Reads go straight to the database; row-level security keeps them to her own rows.
  const store = supabasePlanStore(client);

  async function call<T>(body: Record<string, unknown>): Promise<T> {
    await ensureSession();
    const { data, error } = await client.functions.invoke<T>('plan', { body });
    if (error) throw error;
    return data as T;
  }

  const required = async (body: Record<string, unknown>): Promise<StoredPlan> => {
    const { plan } = await call<{ plan: StoredPlan | null }>(body);
    if (!plan) throw new Error('The plan function returned no plan.');
    return plan;
  };

  const userId = async (): Promise<string> => {
    const id = await ensureSession();
    if (!id) throw new Error('There is no session.');
    return id;
  };

  /** Her name, timezone and quiz answers, saved to our own database. */
  async function saveAnswers(): Promise<void> {
    const id = await userId();
    const state = useOnboardingStore.getState();
    const row = quizAnswersRow(state, id);
    if (!row) throw new Error('The quiz is not finished.');

    const user = await client.from('users').upsert({
      id,
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

    async getInstructors() {
      const { data, error } = await client.from('instructors').select('id, name, credential');
      if (error) throw error;
      return data as Instructor[];
    },

    async buildPlan() {
      await saveAnswers();
      return required({ action: 'build' });
    },

    getCurrentPlan: async () =>
      (await call<{ plan: StoredPlan | null }>({ action: 'current' })).plan,
    moveSession: (sessionId, to) => required({ action: 'move', sessionId, to }),
    completeSession: (sessionId) => required({ action: 'complete', sessionId }),
    rateSession: (sessionId, rating) => call({ action: 'rate', sessionId, rating }),

    async adjustPlan(changes) {
      // The quiz answers hold her days and length too, so a later rebuild agrees with this one.
      await saveAnswers();
      return required({ action: 'adjust', weekdays: changes.weekdays, minutes: changes.minutes });
    },

    async getHistory() {
      const id = await userId();
      return { plans: await store.listPlans(id), ratings: await store.listRatings(id) };
    },

    async getClassProgress(classId) {
      const id = await userId();
      const { data, error } = await client
        .from('class_progress')
        .select('position_sec, percent')
        .eq('user_id', id)
        .eq('class_id', classId)
        .maybeSingle();
      if (error) throw error;
      return data ? { positionSec: data.position_sec, percent: data.percent } : null;
    },

    async saveClassProgress(classId, progress) {
      const id = await userId();
      const { error } = await client.from('class_progress').upsert({
        user_id: id,
        class_id: classId,
        position_sec: Math.round(progress.positionSec),
        percent: Math.round(progress.percent),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
  };
}

export const planRepository: PlanRepository = supabase
  ? createRemoteRepository(supabase)
  : createLocalRepository();
