import { AccountEntry } from '@/features/account/AccountEntry';

/** Sign in, from "I already have an account" on the welcome screen. */
export default function SignIn() {
  return <AccountEntry intent="sign_in" />;
}
