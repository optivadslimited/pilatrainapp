import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton, Screen, Text, toast } from '@/components';
import { useContinue } from '@/features/onboarding/useContinue';
import { useGoBack } from '@/lib/useGoBack';
import { t } from '@/strings';
import { size, space } from '@/theme';

import { auth, completeAuth } from './account';
import { AppleButton } from './AppleButton';
import type { AuthIntent, AuthResult } from './types';

/**
 * Where a finished sign-in sends her.
 *
 *   continue   she is who she was; carry on from where this screen was opened
 *   home       she is now signed in to an account with a plan
 *   welcome    she is now signed in to an account with no plan yet
 */
export function useAuthOutcome(intent: AuthIntent, then: string | undefined) {
  const router = useRouter();
  const goBack = useGoBack('/today');
  const next = useContinue();

  return async (result: AuthResult): Promise<boolean> => {
    if (result.status !== 'ok') {
      if (result.reason !== 'cancelled') {
        toast.show(
          result.reason === 'no_account'
            ? t.account.noAccount
            : result.reason === 'wrong_code'
              ? t.account.codeWrong
              : result.reason === 'unavailable'
                ? t.account.unavailable
                : t.account.appleFailed,
        );
      }
      return false;
    }

    const where = await completeAuth(result);
    if (where === 'home') {
      toast.show(t.account.signedIn);
      router.dismissTo('/today');
    } else if (where === 'welcome') {
      toast.show(t.account.noAccount);
      router.dismissTo('/welcome');
    } else {
      toast.showAtTop(intent === 'create' ? t.account.created : t.account.signedIn);
      if (then === 'continue') next.afterAccount();
      else goBack();
    }
    return true;
  };
}

/**
 * Create an account, or sign in to one: Sign in with Apple first, an emailed
 * link second. Creating one is always optional.
 */
export function AccountEntry({ intent, then }: { intent: AuthIntent; then?: string }) {
  const router = useRouter();
  const goBack = useGoBack(intent === 'sign_in' ? '/welcome' : '/today');
  const next = useContinue();
  const finish = useAuthOutcome(intent, then);
  const [busy, setBusy] = useState(false);
  const [apple, setApple] = useState(false);

  useEffect(() => {
    let alive = true;
    auth
      .appleAvailable()
      .catch(() => false)
      .then((available) => {
        if (alive) setApple(available);
      });
    return () => {
      alive = false;
    };
  }, []);

  const leave = () => (then === 'continue' ? next.afterAccount() : goBack());

  const withApple = async () => {
    if (busy) return;
    setBusy(true);
    await finish(await auth.withApple(intent));
    setBusy(false);
  };

  const creating = intent === 'create';

  return (
    <Screen
      testID={creating ? 'create-account' : 'sign-in'}
      footer={
        <>
          {apple ? (
            <AppleButton onPress={withApple} disabled={busy} testID="account-apple" />
          ) : null}
          <Button
            label={t.account.email}
            variant={apple ? 'secondary' : 'primary'}
            disabled={busy}
            onPress={() =>
              router.push({ pathname: '/email', params: then ? { intent, then } : { intent } })
            }
            testID="account-email"
          />
          {creating ? (
            <Button
              label={t.common.notNow}
              variant="text"
              disabled={busy}
              onPress={leave}
              testID="account-not-now"
            />
          ) : null}
        </>
      }>
      <View style={styles.header}>
        {creating ? null : (
          <IconButton
            icon="back"
            accessibilityLabel={t.common.back}
            onPress={goBack}
            testID="account-back"
          />
        )}
      </View>
      <View style={styles.copy}>
        <Text variant="display">{creating ? t.account.createTitle : t.account.signInTitle}</Text>
        <Text variant="body" color="textSecondary">
          {creating ? t.account.createBody : t.account.signInBody}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: size.touchTarget,
    marginLeft: -space.xs,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  copy: { gap: space.sm, paddingTop: space.lg },
});
