import { useRouter } from 'expo-router';

import { accountsAvailable, useAccountStore } from '@/features/account/account';
import { useReminderStore } from '@/features/reminders/store';

import { stepAfterAccount, stepAfterPaywall, type NextStep } from './next';

/**
 * Moves her on after the paywall or the account screen: to the next thing
 * she has not yet been offered, and then home. The order is decided in
 * next.ts.
 */
export function useContinue() {
  const router = useRouter();

  const go = (step: NextStep) => {
    if (step === 'account') {
      router.replace({ pathname: '/create-account', params: { then: 'continue' } });
    } else if (step === 'reminders') {
      router.replace({ pathname: '/reminders', params: { then: 'continue' } });
    } else {
      router.dismissTo('/today');
    }
  };

  const state = () => ({
    hasAccount: useAccountStore.getState().account !== null,
    accountsAvailable,
    remindersAsked: useReminderStore.getState().asked,
  });

  return {
    afterPaywall: () => go(stepAfterPaywall(state())),
    afterAccount: () => go(stepAfterAccount(state())),
    home: () => router.dismissTo('/today'),
  };
}
