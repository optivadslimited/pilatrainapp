import { isOpen } from '@engine';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow, Screen, Text } from '@/components';
import { brand } from '@/config/brand';
import { useOnboardingStore } from '@/features/onboarding/store';
import { clearLocalPlan } from '@/features/plan/localStore';
import { planKeys, useCompleteSession, useCurrentPlan } from '@/features/plan/queries';
import { planRepository } from '@/features/plan/repository';
import { devDayOffset, setDevDayOffset } from '@/lib/clock';
import { openLink } from '@/lib/links';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * You: her name, the legal pages and the app version.
 *
 * TODO(milestone 4): plan settings, membership, restore purchases, help,
 * delete account (two steps, in the app) and sign out.
 */
export default function You() {
  const firstName = useOnboardingStore((state) => state.answers.firstName);
  const version = Constants.expoConfig?.version ?? '';

  return (
    <Screen scroll edges={['top']} testID="you">
      <Text variant="display" style={styles.title}>
        {firstName ? t.you.greeting(firstName) : t.you.greetingNoName}
      </Text>

      <View style={styles.section}>
        <Text variant="caption" color="textSecondary" weight="600">
          {t.you.legal}
        </Text>
        <ListRow
          label={t.you.terms}
          onPress={() => openLink(brand.urls.terms)}
          testID="you-terms"
        />
        <ListRow
          label={t.you.privacy}
          onPress={() => openLink(brand.urls.privacy)}
          testID="you-privacy"
        />
        <ListRow
          label={t.you.healthDisclaimer}
          onPress={() => openLink(brand.urls.healthDisclaimer)}
          testID="you-health-disclaimer"
          divider={false}
        />
      </View>

      {__DEV__ ? <DeveloperTools /> : null}

      <Text variant="caption" color="textSecondary" center style={styles.version}>
        {brand.name} · {t.you.version(version)}
      </Text>
    </Screen>
  );
}

/**
 * Development builds only. Ways to reach the states that otherwise take days
 * to arrive: a finished session, a rest day, a missed day, the next block.
 */
function DeveloperTools() {
  const router = useRouter();
  const client = useQueryClient();
  const reset = useOnboardingStore((state) => state.reset);
  const plan = useCurrentPlan().data;
  const complete = useCompleteSession();
  const [offset, setOffset] = useState(devDayOffset);

  const moveDate = (days: number) => {
    setDevDayOffset(days);
    setOffset(days);
    client.invalidateQueries({ queryKey: planKeys.current });
  };

  const next = plan?.sessions
    .filter(isOpen)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0];

  return (
    <View style={styles.section}>
      <Text variant="caption" color="textSecondary" weight="600">
        {t.you.developer}
      </Text>
      <ListRow
        label={planRepository.mode === 'local' ? t.you.localMode : t.you.remoteMode}
        value={offset > 0 ? t.you.daysAhead(offset) : undefined}
      />
      <ListRow
        label={t.you.completeToday}
        onPress={() => next && complete.mutate({ sessionId: next.id })}
        testID="dev-complete"
      />
      <ListRow label={t.you.skipDay} onPress={() => moveDate(offset + 1)} testID="dev-skip-day" />
      <ListRow label={t.you.resetDate} onPress={() => moveDate(0)} testID="dev-reset-date" />
      <ListRow
        label={t.you.gallery}
        onPress={() => router.push('/dev/gallery')}
        testID="you-gallery"
      />
      <ListRow
        label={t.you.restartOnboarding}
        onPress={() => {
          reset();
          clearLocalPlan();
          setDevDayOffset(0);
          client.clear();
          router.dismissTo('/welcome');
        }}
        testID="you-restart"
        divider={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space.md },
  section: { marginTop: space.xl },
  version: { marginTop: space.xl },
});
