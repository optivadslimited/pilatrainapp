/**
 * Who may watch what. One rule, used twice: by the app, to decide what is
 * locked on screen, and by the `playback-token` function, which is the check
 * that counts, because it decides whether a video address is handed out.
 *
 *   A member may watch every class.
 *   Anyone may watch a class marked free.
 *   Anyone may take the first session of her first plan: "Try the first
 *   class free". It stays free until she has finished it.
 */
export type AccessSession = {
  id: string;
  date: string;
  classIds: readonly string[];
  status: string;
};

export type AccessPlan = {
  block: number;
  sessions: readonly AccessSession[];
};

const isOpen = (session: AccessSession) =>
  session.status === 'planned' || session.status === 'moved';

/**
 * The session a non-member may take: the earliest one still open in her first
 * plan, as long as she has not finished any. `null` once the free class is used.
 */
export function freeSessionId(plan: AccessPlan | null): string | null {
  if (!plan || plan.block !== 1) return null;
  if (plan.sessions.some((session) => session.status === 'done')) return null;
  const open = plan.sessions
    .filter(isOpen)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return open[0]?.id ?? null;
}

/** Whether she may play this session of her plan. */
export function canPlaySession(
  isMember: boolean,
  plan: AccessPlan | null,
  sessionId: string,
): boolean {
  return isMember || freeSessionId(plan) === sessionId;
}

/** Whether she may watch this class, on its own or as part of her free session. */
export function canWatchClass(
  isMember: boolean,
  cls: { id: string; isFree: boolean },
  plan: AccessPlan | null,
): boolean {
  if (isMember || cls.isFree) return true;
  const freeId = freeSessionId(plan);
  if (!freeId) return false;
  return (
    plan?.sessions.find((session) => session.id === freeId)?.classIds.includes(cls.id) ?? false
  );
}
