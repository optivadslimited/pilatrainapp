import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState, Screen, Text } from '@/components';
import { auth } from '@/features/account/account';
import { useAuthOutcome } from '@/features/account/AccountEntry';
import { t } from '@/strings';
import { space, useTheme } from '@/theme';

/**
 * Where the emailed link lands: `<scheme>://auth?token_hash=...&type=...`.
 * It finishes the sign-in and sends her on. If the link is old or has been
 * used, it says so and offers the way back.
 */
export default function AuthCallback() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token_hash: tokenHash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();
  const finish = useAuthOutcome(type === 'email_change' ? 'create' : 'sign_in', undefined);
  const [failed, setFailed] = useState(!tokenHash);

  useEffect(() => {
    if (!tokenHash) return;
    let alive = true;
    (async () => {
      try {
        const result = await auth.verifyEmailLink(tokenHash, type ?? 'email');
        if (!alive) return;
        if (result.status === 'ok') await finish(result);
        else setFailed(true);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
    // Once, for this link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenHash, type]);

  if (failed) {
    return (
      <Screen testID="auth-failed">
        <EmptyState
          icon="info"
          title={t.account.linkFailedTitle}
          body={t.account.linkFailedBody}
          action={{ label: t.common.continue, onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="auth">
      <View style={styles.centred}>
        <ActivityIndicator color={colors.primary} />
        <Text variant="body" color="textSecondary">
          {t.account.finishing}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
});
