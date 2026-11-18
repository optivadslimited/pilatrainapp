import {
  isMember,
  isTrialEnding,
  membershipNotice,
  membershipStatus,
  NO_ENTITLEMENT,
  trialReminderAt,
  type Entitlement,
} from '../entitlement';

const at = (iso: string) => new Date(iso);
const trial: Entitlement = {
  active: true,
  productId: 'pilatrain_quarterly',
  period: 'trial',
  expiresAt: '2026-12-08T10:00:00.000Z',
  willRenew: true,
  billingIssueAt: null,
};
const paid: Entitlement = { ...trial, period: 'paid', expiresAt: '2027-03-08T10:00:00.000Z' };

describe('membership status', () => {
  it('reads each state from the entitlement', () => {
    expect(membershipStatus(NO_ENTITLEMENT)).toBe('none');
    expect(membershipStatus(trial)).toBe('trial');
    expect(membershipStatus(paid)).toBe('active');
    expect(membershipStatus({ ...paid, billingIssueAt: '2027-03-08T10:00:00.000Z' })).toBe('grace');
    expect(membershipStatus({ ...paid, active: false, willRenew: false })).toBe('lapsed');
  });

  it('keeps access through the trial and the billing grace period, and not after', () => {
    expect(isMember(trial)).toBe(true);
    expect(isMember(paid)).toBe(true);
    expect(isMember({ ...paid, billingIssueAt: '2027-03-08T10:00:00.000Z' })).toBe(true);
    expect(isMember({ ...paid, active: false })).toBe(false);
    expect(isMember(NO_ENTITLEMENT)).toBe(false);
  });
});

describe('the trial reminder', () => {
  it('is due two days before the free week ends: day 5 of 7', () => {
    expect(trialReminderAt(trial)?.toISOString()).toBe('2026-12-06T10:00:00.000Z');
  });

  it('is not sent if she has already cancelled, or is not in a trial', () => {
    expect(trialReminderAt({ ...trial, willRenew: false })).toBeNull();
    expect(trialReminderAt(paid)).toBeNull();
    expect(trialReminderAt(NO_ENTITLEMENT)).toBeNull();
    expect(trialReminderAt({ ...trial, expiresAt: null })).toBeNull();
  });

  it('shows the banner from then until the trial ends', () => {
    expect(isTrialEnding(trial, at('2026-12-06T09:59:59.000Z'))).toBe(false);
    expect(isTrialEnding(trial, at('2026-12-06T10:00:00.000Z'))).toBe(true);
    expect(isTrialEnding(trial, at('2026-12-08T09:59:59.000Z'))).toBe(true);
    expect(isTrialEnding(trial, at('2026-12-08T10:00:00.000Z'))).toBe(false);
    expect(isTrialEnding({ ...trial, willRenew: false }, at('2026-12-07T10:00:00.000Z'))).toBe(
      false,
    );
  });
});

describe('the Today banner', () => {
  it('shows one notice at most, and the payment problem first', () => {
    const now = at('2026-12-07T10:00:00.000Z');
    expect(membershipNotice(trial, now)).toBe('trial_ending');
    expect(membershipNotice({ ...trial, billingIssueAt: now.toISOString() }, now)).toBe(
      'billing_issue',
    );
    expect(membershipNotice(paid, now)).toBeNull();
    expect(membershipNotice(NO_ENTITLEMENT, now)).toBeNull();
    expect(membershipNotice(trial, at('2026-12-02T10:00:00.000Z'))).toBeNull();
  });
});
