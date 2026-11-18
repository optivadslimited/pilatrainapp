import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton, Screen, Text, TextField, toast } from '@/components';
import { auth } from '@/features/account/account';
import { useAuthOutcome } from '@/features/account/AccountEntry';
import type { AuthIntent } from '@/features/account/types';
import { useGoBack } from '@/lib/useGoBack';
import { t } from '@/strings';
import { size, space } from '@/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Continue with email. She types her address and we email her a link; opening
 * it on this phone finishes the job (src/app/auth.tsx). The same email carries
 * a 6-digit code, for when the link opens somewhere else.
 */
export default function Email() {
  const goBack = useGoBack('/today');
  const params = useLocalSearchParams<{ intent?: string; then?: string }>();
  const asked: AuthIntent = params.intent === 'sign_in' ? 'sign_in' : 'create';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  /** Set once the email has gone. An address that already has an account turns a sign-up into a sign-in. */
  const [sent, setSent] = useState<AuthIntent | null>(null);

  const finish = useAuthOutcome(sent ?? asked, params.then);
  const address = email.trim().toLowerCase();

  const send = async (again = false) => {
    if (busy) return;
    if (!EMAIL.test(address)) {
      setError(t.account.emailInvalid);
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await auth.sendEmail(address, sent ?? asked);
    setBusy(false);

    if (result.status === 'sent') {
      setSent(result.intent);
      if (again) toast.show(t.account.resent);
    } else {
      toast.show(result.reason === 'no_account' ? t.account.noAccount : t.account.sendFailed);
    }
  };

  const verify = async () => {
    if (busy || !sent) return;
    setBusy(true);
    const done = await finish(await auth.verifyEmailCode(address, code.trim(), sent));
    if (!done) setBusy(false);
  };

  return (
    <Screen
      scroll
      testID="email"
      footer={
        sent ? (
          <>
            <Button
              label={t.account.verify}
              onPress={verify}
              disabled={code.trim().length < 6}
              loading={busy}
              testID="email-verify"
            />
            <Button
              label={t.account.resend}
              variant="text"
              onPress={() => send(true)}
              disabled={busy}
              testID="email-resend"
            />
          </>
        ) : (
          <Button
            label={t.account.send}
            onPress={() => send()}
            loading={busy}
            testID="email-send"
          />
        )
      }>
      <View style={styles.header}>
        <IconButton
          icon="back"
          accessibilityLabel={t.common.back}
          onPress={sent ? () => setSent(null) : goBack}
          testID="email-back"
        />
      </View>

      {sent ? (
        <View style={styles.copy}>
          <Text variant="display">{t.account.sentTitle}</Text>
          <Text variant="body" color="textSecondary" testID="email-sent-body">
            {t.account.sentBody(address)}
          </Text>
          <View style={styles.field}>
            <TextField
              label={t.account.codeLabel}
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={verify}
              testID="email-code"
            />
          </View>
        </View>
      ) : (
        <View style={styles.copy}>
          <Text variant="display">{t.account.emailTitle}</Text>
          <Text variant="body" color="textSecondary">
            {t.account.emailBody}
          </Text>
          <View style={styles.field}>
            <TextField
              label={t.account.emailLabel}
              placeholder={t.account.emailPlaceholder}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError(undefined);
              }}
              error={error}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={() => send()}
              testID="email-address"
            />
          </View>
        </View>
      )}
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
  field: { paddingTop: space.md },
});
