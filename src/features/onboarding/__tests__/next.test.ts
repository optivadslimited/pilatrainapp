import { stepAfterAccount, stepAfterPaywall } from '../next';

describe('what follows the paywall', () => {
  it('offers an account first, if she has none', () => {
    expect(
      stepAfterPaywall({ hasAccount: false, accountsAvailable: true, remindersAsked: false }),
    ).toBe('account');
  });

  it('skips the account when she has one, or accounts are not switched on', () => {
    expect(
      stepAfterPaywall({ hasAccount: true, accountsAvailable: true, remindersAsked: false }),
    ).toBe('reminders');
    expect(
      stepAfterPaywall({ hasAccount: false, accountsAvailable: false, remindersAsked: false }),
    ).toBe('reminders');
  });

  it('asks about reminders once, and never again', () => {
    expect(stepAfterAccount({ remindersAsked: false })).toBe('reminders');
    expect(stepAfterAccount({ remindersAsked: true })).toBe('home');
    expect(
      stepAfterPaywall({ hasAccount: true, accountsAvailable: true, remindersAsked: true }),
    ).toBe('home');
  });
});
