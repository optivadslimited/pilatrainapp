import type { QuizAnswers } from '@/features/onboarding/questions';
import { useOnboardingStore } from '@/features/onboarding/store';
import { supabase } from '@/lib/supabase';

/** The columns of `quiz_answers` and `users` that the app keeps a copy of. */
export type ProfileRows = {
  user: { first_name: string | null } | null;
  answers: {
    goal: string;
    level: number;
    minutes: number;
    days: number[];
    time_of_day: string;
    equipment: string[];
    work_around: string[];
    gentle: boolean;
    disclaimer_accepted_at: string | null;
  } | null;
};

/**
 * Her saved answers, as the onboarding store holds them. `null` if she never
 * finished the quiz on this account.
 *
 * The database keeps her level, not the wording she picked for her
 * experience, so the experience answer comes back as the first option of
 * that level. Nothing shown after onboarding depends on which.
 */
export function onboardingFrom(rows: ProfileRows) {
  const saved = rows.answers;
  if (!saved || !saved.disclaimer_accepted_at) return null;

  const answers: Partial<QuizAnswers> = {
    goal: saved.goal as QuizAnswers['goal'],
    experience: saved.level >= 2 ? 'sometimes' : 'new',
    minutes: saved.minutes as QuizAnswers['minutes'],
    daysPerWeek: saved.days.length as QuizAnswers['daysPerWeek'],
    weekdays: saved.days as QuizAnswers['weekdays'],
    timeOfDay: saved.time_of_day as QuizAnswers['timeOfDay'],
    equipment: saved.equipment as QuizAnswers['equipment'],
    workAround: (saved.work_around.length > 0
      ? saved.work_around
      : ['none']) as QuizAnswers['workAround'],
    firstName: rows.user?.first_name ?? '',
  };

  return {
    status: 'complete' as const,
    answers,
    // A gentle plan means she passed the safety gate and said she was cleared.
    gate: saved.gentle ? ('cleared' as const) : ('not_shown' as const),
    disclaimerAcceptedAt: saved.disclaimer_accepted_at,
    holdingReminderAt: null,
  };
}

/**
 * After signing in on a new phone: fetch her answers from our own database
 * and put them back on the device. Her plan itself arrives through the plan
 * queries. Returns whether there was a finished quiz to restore.
 *
 * NOT YET RUN AGAINST A REAL PROJECT.
 */
export async function restoreProfile(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: session } = await supabase.auth.getSession();
    const id = session.session?.user.id;
    if (!id) return false;

    const [user, answers] = await Promise.all([
      supabase.from('users').select('first_name').eq('id', id).maybeSingle(),
      supabase.from('quiz_answers').select('*').eq('user_id', id).maybeSingle(),
    ]);
    const restored = onboardingFrom({
      user: user.data as ProfileRows['user'],
      answers: answers.data as ProfileRows['answers'],
    });
    if (!restored) return false;

    useOnboardingStore.setState(restored);
    return true;
  } catch {
    return false;
  }
}
