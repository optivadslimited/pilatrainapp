/**
 * Her membership, as the store reports it, and what follows from it.
 *
 * `Entitlement` is RevenueCat's `member` entitlement reduced to the fields
 * the app acts on. Everything else in this file is worked out from it, so
 * every state she can be in is decided, and tested, in one place.
 */
export type Entitlement = {
  /** Access right now. True through a trial and through Apple's billing grace period. */
  active: boolean;
  /** The product she has, or last had. `null` if she has never subscribed. */
  productId: string | null;
  period: 'trial' | 'paid' | null;
  /** When the current period ends: the trial's last moment, or the next renewal. ISO timestamp. */
  expiresAt: string | null;
  willRenew: boolean;
  /** Set while Apple cannot take payment and is retrying. ISO timestamp. */
  billingIssueAt: string | null;
};

export const NO_ENTITLEMENT: Entitlement = {
  active: false,
  productId: null,
  period: null,
  expiresAt: null,
  willRenew: false,
  billingIssueAt: null,
};

/**
 *   none     never a member
 *   trial    in the free week
 *   active   paid and current
 *   grace    payment failed; she keeps access while Apple retries
 *   lapsed   was a member, is not now
 */
export type MembershipStatus = 'none' | 'trial' | 'active' | 'grace' | 'lapsed';

export function membershipStatus(entitlement: Entitlement): MembershipStatus {
  if (!entitlement.active) return entitlement.productId ? 'lapsed' : 'none';
  if (entitlement.billingIssueAt) return 'grace';
  return entitlement.period === 'trial' ? 'trial' : 'active';
}

export const isMember = (entitlement: Entitlement): boolean => entitlement.active;

/** The reminder goes out this many days before the free week ends. */
export const TRIAL_REMINDER_LEAD_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When to remind her that the trial is ending: two days before it does.
 * `null` if she is not in a trial, or has already cancelled (nothing will be
 * charged, so there is nothing to warn her about).
 */
export function trialReminderAt(entitlement: Entitlement): Date | null {
  if (membershipStatus(entitlement) !== 'trial') return null;
  if (!entitlement.willRenew || !entitlement.expiresAt) return null;
  return new Date(new Date(entitlement.expiresAt).getTime() - TRIAL_REMINDER_LEAD_DAYS * DAY_MS);
}

/** True from two days before the trial ends until it does, unless she has cancelled. */
export function isTrialEnding(entitlement: Entitlement, now: Date): boolean {
  const from = trialReminderAt(entitlement);
  if (!from || !entitlement.expiresAt) return false;
  return now >= from && now < new Date(entitlement.expiresAt);
}

/** The banner Today shows about her membership, if any. One at most. */
export type MembershipNotice = 'billing_issue' | 'trial_ending' | null;

export function membershipNotice(entitlement: Entitlement, now: Date): MembershipNotice {
  if (membershipStatus(entitlement) === 'grace') return 'billing_issue';
  return isTrialEnding(entitlement, now) ? 'trial_ending' : null;
}
