import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Button, ClassCard, EmptyState, Screen, Skeleton, Text } from '@/components';
import { indexCatalogue } from '@/features/plan/cards';
import { planTabView } from '@/features/plan/planTab';
import { useCatalogue, useCurrentPlan } from '@/features/plan/queries';
import { useToday } from '@/lib/useToday';
import { t } from '@/strings';
import { radius, space, useTheme } from '@/theme';

/**
 * Plan: her four weeks down the screen, each with its theme. Every session
 * shows its state, opens its class, and can be moved while it is still to do.
 * Below them: "Adjust my plan" and the class library.
 */
export default function Plan() {
  const router = useRouter();
  const { colors } = useTheme();
  const date = useToday();
  const plan = useCurrentPlan();
  const classes = useCatalogue();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([plan.refetch(), classes.refetch()]);
    setRefreshing(false);
  };

  if (plan.isSuccess && plan.data === null) return <Redirect href="/building" />;

  const view =
    plan.data && classes.data ? planTabView(plan.data, indexCatalogue(classes.data), date) : null;

  if (!view && (plan.isError || classes.isError)) {
    return (
      <Screen edges={['top']} testID="plan-error">
        <EmptyState
          icon="offline"
          title={t.plan.errorTitle}
          body={t.plan.errorBody}
          action={{ label: t.common.retry, onPress: refresh }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      edges={['top']}
      testID="plan"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }>
      <Text variant="display" style={styles.title}>
        {t.plan.title}
      </Text>

      {view ? (
        <>
          {view.weeks.map((week) => (
            <View key={week.week} style={styles.week} testID={`plan-week-${week.week}`}>
              <View style={styles.weekHeading}>
                <Text variant="heading" color={week.isCurrent ? 'primary' : 'text'}>
                  {week.title}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {week.range}
                </Text>
              </View>

              {week.sessions.map(({ card, eyebrow, canMove }) => (
                <ClassCard
                  key={card.session.id}
                  variant="compact"
                  eyebrow={eyebrow}
                  title={card.title}
                  meta={card.meta}
                  note={card.note}
                  imageUrl={card.imageUrl}
                  photoLabel={card.photoLabel}
                  done={card.isDone}
                  onPress={() =>
                    router.push({
                      pathname: '/class/[id]',
                      params: {
                        id: card.classes[0].id,
                        sessionId: card.session.id,
                        source: 'plan',
                      },
                    })
                  }
                  action={
                    canMove
                      ? {
                          label: t.classMeta.move,
                          accessibilityLabel: t.today.moveHint,
                          onPress: () =>
                            router.push({
                              pathname: '/move/[sessionId]',
                              params: { sessionId: card.session.id },
                            }),
                        }
                      : undefined
                  }
                  testID={`plan-session-${card.session.id}`}
                />
              ))}

              {week.note ? (
                <Text variant="callout" color="textSecondary">
                  {week.note}
                </Text>
              ) : null}
            </View>
          ))}

          <View style={styles.actions}>
            <Button
              label={t.plan.adjust}
              variant="secondary"
              onPress={() => router.push('/adjust')}
              testID="plan-adjust"
            />
            <Button
              label={t.plan.browse}
              variant="text"
              onPress={() => router.push('/library')}
              testID="plan-browse"
            />
          </View>
        </>
      ) : (
        <View style={styles.loading} accessible accessibilityLabel={t.common.loading}>
          <Skeleton width="55%" height={26} />
          <Skeleton height={86} borderRadius={radius.card} />
          <Skeleton height={86} borderRadius={radius.card} />
          <Skeleton height={86} borderRadius={radius.card} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space.md },
  week: { gap: space.xs, paddingTop: space.xl },
  weekHeading: { gap: 2, paddingBottom: space.xxs },
  actions: { gap: space.xxs, paddingTop: space.xl },
  loading: { gap: space.sm, paddingTop: space.xl },
});
