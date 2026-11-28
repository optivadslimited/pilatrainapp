import { useMembershipStore } from '@/features/membership/membership';
import { REMINDER_TIMES } from '@/features/onboarding/questions';
import { useOnboardingStore } from '@/features/onboarding/store';
import { indexCatalogue } from '@/features/plan/cards';
import { planKeys } from '@/features/plan/queries';
import type { ClassDetails, StoredPlan } from '@/features/plan/types';
import { now } from '@/lib/clock';
import { queryClient } from '@/lib/queryClient';
import { replaceReminders } from '@/lib/reminders';

import { SESSION_PREFIX, sessionReminders, TRIAL_REMINDER_ID, trialReminder } from './schedule';
import { useReminderStore } from './store';

/** The time her reminders arrive, from her "best time of day" answer. */
export function reminderTime(): string {
  const timeOfDay = useOnboardingStore.getState().answers.timeOfDay ?? 'varies';
  return REMINDER_TIMES[timeOfDay];
}

/**
 * Bring the scheduled session reminders in line with her plan as it is now.
 * Run whenever the plan changes (a session done, moved, or the plan
 * adjusted), so a reminder never arrives for a session that is not there.
 */
export async function syncSessionReminders(): Promise<void> {
  const { enabled } = useReminderStore.getState();
  const plan = queryClient.getQueryData<StoredPlan | null>(planKeys.current);
  const classes = queryClient.getQueryData<ClassDetails[]>(planKeys.catalogue);

  if (!enabled || !plan || !classes) {
    // Off, or nothing to remind her of: clear whatever is scheduled.
    if (!enabled) await replaceReminders(SESSION_PREFIX, []);
    return;
  }
  await replaceReminders(
    SESSION_PREFIX,
    sessionReminders(plan, indexCatalogue(classes), reminderTime(), now()),
  );
}

/**
 * Schedule (or cancel) the notice that her free week is ending. It goes out
 * whether or not she wanted session reminders, as long as notifications are
 * allowed: it is about her money, not about nudging her.
 */
export async function syncTrialReminder(): Promise<void> {
  const { entitlement, agreed } = useMembershipStore.getState();
  const reminder = trialReminder(entitlement, agreed, now());
  await replaceReminders(TRIAL_REMINDER_ID, reminder ? [reminder] : []);
}

let watching = false;

/** Keep reminders in step with the plan from now on. Called once at launch. */
export function watchReminders(): void {
  if (watching) return;
  watching = true;

  let timer: ReturnType<typeof setTimeout> | undefined;
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.query.queryKey[0] !== planKeys.current[0]) return;
    // Several updates arrive together when a plan is saved; schedule once.
    clearTimeout(timer);
    timer = setTimeout(() => {
      syncSessionReminders().catch(() => {});
    }, 500);
  });

  useReminderStore.subscribe(() => {
    syncSessionReminders().catch(() => {});
    // Turning reminders on is when notifications are first allowed: the
    // trial notice ("Day 5: we remind you") must be scheduled then too.
    syncTrialReminder().catch(() => {});
  });
  useMembershipStore.subscribe(() => {
    syncTrialReminder().catch(() => {});
  });
}
