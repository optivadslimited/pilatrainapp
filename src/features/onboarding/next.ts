/**
 * What follows the paywall, or the end of the free class:
 *
 *   an account, if she has none and accounts are switched on
 *   the reminder question, if she has not been asked
 *   home
 *
 * Each is offered once and can be declined.
 */
export type NextStep = 'account' | 'reminders' | 'home';

export type NextState = {
  hasAccount: boolean;
  accountsAvailable: boolean;
  remindersAsked: boolean;
};

export function stepAfterPaywall(state: NextState): NextStep {
  if (!state.hasAccount && state.accountsAvailable) return 'account';
  return stepAfterAccount(state);
}

export function stepAfterAccount(state: Pick<NextState, 'remindersAsked'>): NextStep {
  return state.remindersAsked ? 'home' : 'reminders';
}
