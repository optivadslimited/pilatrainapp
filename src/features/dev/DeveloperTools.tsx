import { isOpen } from '@engine';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow, Text } from '@/components';
import { applyEntitlement } from '@/features/membership/membership';
import { purchases } from '@/features/membership/purchases';
import {
  PREVIEW_MEMBERSHIPS,
  PREVIEW_OUTCOMES,
  previewStore,
} from '@/features/membership/purchases/preview';
import { membershipKeys } from '@/features/membership/queries';
import { useOnboardingStore } from '@/features/onboarding/store';
import { clearLocalPlan } from '@/features/plan/localStore';
import { planKeys, useCompleteSession, useCurrentPlan } from '@/features/plan/queries';
import { planRepository } from '@/features/plan/repository';
import { useReminderStore } from '@/features/reminders/store';
import { devDayOffset, setDevDayOffset } from '@/lib/clock';
import { useOnlineStore } from '@/lib/useOnline';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * Development builds only. Ways to reach the states that otherwise take days,
 * or a real purchase, to arrive: a finished session, a rest day, a missed day,
 * the next block, a trial about to end, a failed payment, a lapsed membership.
 *
 * This file is only ever loaded behind `__DEV__`, so it and the preview store
 * it controls are left out of release builds.
 */
export function DeveloperTools() {
  const router = useRouter();
  const client = useQueryClient();
  const reset = useOnboardingStore((state) => state.reset);
  const plan = useCurrentPlan().data;
  const complete = useCompleteSession();
  const [offset, setOffset] = useState(devDayOffset);
  const pretendOffline = useOnlineStore((state) => state.pretendOffline);
  const setPretendOffline = useOnlineStore((state) => state.setPretendOffline);
  const [store, setStore] = useState(previewStore.state);

  const usesPreviewStore = purchases.kind === 'preview';

  const refreshStore = async () => {
    setStore(previewStore.state());
    applyEntitlement(await purchases.entitlement());
    client.invalidateQueries({ queryKey: membershipKeys.products });
    client.removeQueries({ queryKey: ['membership', 'eligibility'] });
  };

  const moveDate = (days: number) => {
    setDevDayOffset(days);
    setOffset(days);
    client.invalidateQueries({ queryKey: planKeys.current });
    // A trial runs out as the days pass.
    refreshStore();
  };

  const next = plan?.sessions
    .filter(isOpen)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0];

  const nextOutcome =
    PREVIEW_OUTCOMES[(PREVIEW_OUTCOMES.indexOf(store.outcome) + 1) % PREVIEW_OUTCOMES.length];

  return (
    <>
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
          label={t.you.devOffline}
          value={pretendOffline ? t.you.on : t.you.off}
          onPress={() => setPretendOffline(!pretendOffline)}
          testID="dev-offline"
        />
        <ListRow
          label={t.you.gallery}
          onPress={() => router.push('/dev/gallery')}
          testID="you-gallery"
        />
        <ListRow
          label={t.you.restartOnboarding}
          onPress={() => {
            reset();
            useReminderStore.getState().reset();
            clearLocalPlan();
            setDevDayOffset(0);
            client.clear();
            router.dismissTo('/welcome');
          }}
          testID="you-restart"
          divider={false}
        />
      </View>

      {usesPreviewStore ? (
        <View style={styles.section}>
          <Text variant="caption" color="textSecondary" weight="600">
            {t.you.devStore}
          </Text>
          {PREVIEW_MEMBERSHIPS.map((kind) => (
            <ListRow
              key={kind}
              label={t.you.devMembership[kind]}
              onPress={() => {
                previewStore.setMembership(kind);
                refreshStore();
              }}
              testID={`dev-membership-${kind}`}
            />
          ))}
          <ListRow
            label={t.you.devEligible}
            value={store.eligible ? t.you.on : t.you.off}
            onPress={() => {
              previewStore.setEligible(!store.eligible);
              refreshStore();
            }}
            testID="dev-eligible"
          />
          <ListRow
            label={t.you.devOutcome}
            value={t.you.devOutcomes[store.outcome]}
            onPress={() => {
              previewStore.setOutcome(nextOutcome);
              refreshStore();
            }}
            testID="dev-outcome"
            divider={false}
          />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
});
