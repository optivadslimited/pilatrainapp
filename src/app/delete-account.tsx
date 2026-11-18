import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton, Screen, Text, toast } from '@/components';
import { deleteAccount } from '@/features/account/account';
import { useMembership } from '@/features/membership/membership';
import { purchases } from '@/features/membership/purchases';
import { useGoBack } from '@/lib/useGoBack';
import { t } from '@/strings';
import { size, space } from '@/theme';

/**
 * Delete account, in the app, in two steps.
 *
 * Step one says what goes, and that a subscription is Apple's to cancel
 * (deleting the account does not stop the billing, and it would be wrong to
 * let her think it did). Step two asks once more, then does it: an Edge
 * Function removes her user and every row that belongs to her.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const goBack = useGoBack('/today');
  const { isMember } = useMembership();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    const deleted = await deleteAccount();
    if (!deleted) {
      setBusy(false);
      toast.show(t.deleteAccount.failed);
      return;
    }
    toast.show(t.deleteAccount.done);
    router.dismissTo('/welcome');
  };

  return (
    <Screen
      scroll
      testID={`delete-account-${step}`}
      footer={
        step === 1 ? (
          <>
            <Button label={t.deleteAccount.keep} onPress={goBack} testID="delete-keep" />
            <Button
              label={t.deleteAccount.next}
              variant="secondary"
              onPress={() => setStep(2)}
              testID="delete-next"
            />
          </>
        ) : (
          <>
            <Button
              label={t.deleteAccount.keep}
              onPress={goBack}
              disabled={busy}
              testID="delete-keep"
            />
            <Button
              label={t.deleteAccount.confirm}
              variant="secondary"
              onPress={confirm}
              loading={busy}
              testID="delete-confirm"
            />
          </>
        )
      }>
      <View style={styles.header}>
        <IconButton
          icon="back"
          accessibilityLabel={t.common.back}
          onPress={step === 2 && !busy ? () => setStep(1) : goBack}
          disabled={busy}
          testID="delete-back"
        />
      </View>

      {step === 1 ? (
        <View style={styles.copy}>
          <Text variant="display">{t.deleteAccount.title}</Text>
          <Text variant="body" color="textSecondary">
            {t.deleteAccount.body}
          </Text>
          <Text variant="body" color="textSecondary">
            {t.deleteAccount.subscriptionNote}
          </Text>
          {isMember ? (
            <Button
              label={t.deleteAccount.manage}
              variant="text"
              onPress={() => purchases.manage().catch(() => {})}
              style={styles.manage}
              testID="delete-manage"
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.copy}>
          <Text variant="display">{t.deleteAccount.confirmTitle}</Text>
          <Text variant="body" color="textSecondary">
            {t.deleteAccount.confirmBody}
          </Text>
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
  copy: { gap: space.md, paddingTop: space.lg },
  manage: { alignSelf: 'flex-start' },
});
