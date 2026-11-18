import { useLocalSearchParams } from 'expo-router';

import { AccountEntry } from '@/features/account/AccountEntry';

/**
 * Create account. Offered after a purchase and at the end of the free class,
 * and always there on the You tab. It attaches Apple or an email address to
 * the anonymous session she already has, so nothing she has done is lost.
 */
export default function CreateAccount() {
  const { then } = useLocalSearchParams<{ then?: string }>();
  return <AccountEntry intent="create" then={then} />;
}
