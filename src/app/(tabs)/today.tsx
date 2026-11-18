import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Banner, ClassCard, DayPill, EmptyState, Ring, Screen, Skeleton, Text } from '@/components';
import { useMembership } from '@/features/membership/membership';
import { purchases } from '@/features/membership/purchases';
import { useMembershipNotice } from '@/features/membership/useMembershipNotice';
import { indexCatalogue, type SessionCard } from '@/features/plan/cards';
import { useCatalogue, useCurrentPlan } from '@/features/plan/queries';
import { todayView, type TodayView } from '@/features/plan/today';
import { useOnline } from '@/lib/useOnline';
import { useToday } from '@/lib/useToday';
import { t } from '@/strings';
import { aspect, enterStaggered, radius, space, useReduceMotion, useTheme } from '@/theme';

/**
 * Today: the home dashboard, and the screen she sees most.
 *
 * What it shows is decided in features/plan/today.ts. This file lays it out:
 * the day and week, a headline that changes with her day, the one session,
 * the week at a glance, and what is coming up.
 *
 * Above all that, at most one notice: no connection, a payment that needs
 * attention, or a free week about to end. Without a membership the session
 * card is still there, with one button: "Continue your plan".
 */
export default function Today() {
  const { colors } = useTheme();
  const date = useToday();
  const plan = useCurrentPlan();
  const classes = useCatalogue();
  const { isMember } = useMembership();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([plan.refetch(), classes.refetch()]);
    setRefreshing(false);
  };

  // The quiz is done but there is no plan (the app was closed while it was building).
  if (plan.isSuccess && plan.data === null) return <Redirect href="/building" />;

  const view =
    plan.data && classes.data
      ? todayView(plan.data, indexCatalogue(classes.data), date, { isMember })
      : null;

  // Nothing cached and nothing loaded: say so, plainly, with a way to try again.
  if (!view && (plan.isError || classes.isError)) {
    return (
      <Screen edges={['top']} testID="today-error">
        <EmptyState
          icon="offline"
          title={t.today.errorTitle}
          body={t.today.errorBody}
          action={{ label: t.common.retry, onPress: refresh }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      edges={['top']}
      testID="today"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }>
      {view ? <TodayContent view={view} /> : <TodaySkeleton />}
    </Screen>
  );
}

function TodayContent({ view }: { view: TodayView }) {
  const router = useRouter();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const { feature } = view;
  const online = useOnline();
  const notice = useMembershipNotice();

  const openDetail = (card: SessionCard) =>
    router.push({
      pathname: '/class/[id]',
      params: { id: card.classes[0].id, sessionId: card.session.id, source: 'today' },
    });

  return (
    <>
      {!online ? (
        <View style={styles.notice}>
          <Banner
            icon="offline"
            title={t.states.offlineTitle}
            body={t.states.offlineBody}
            testID="today-offline"
          />
        </View>
      ) : notice ? (
        <View style={styles.notice}>
          <Banner
            icon={notice.kind === 'billing_issue' ? 'alert' : 'info'}
            tone={notice.kind === 'billing_issue' ? 'alert' : 'neutral'}
            title={notice.title}
            body={notice.body}
            action={{ label: notice.action, onPress: () => purchases.manage().catch(() => {}) }}
            testID={`today-${notice.kind.replace('_', '-')}`}
          />
        </View>
      ) : null}

      <View style={styles.heading}>
        <Text variant="callout" color="textSecondary" testID="today-date-line">
          {view.dateLine}
        </Text>
        <Text variant="title" testID="today-headline">
          {view.headline}
        </Text>
      </View>

      {feature ? (
        <ClassCard
          variant="large"
          eyebrow={feature.eyebrow ?? undefined}
          title={feature.card.title}
          meta={feature.card.meta}
          note={feature.card.note}
          imageUrl={feature.card.imageUrl}
          photoLabel={feature.card.photoLabel}
          done={feature.kind === 'done'}
          startLabel={feature.startLabel}
          locked={feature.locked}
          onPress={() => openDetail(feature.card)}
          onStart={
            feature.locked
              ? () => router.push({ pathname: '/paywall', params: { placement: 'today' } })
              : feature.canStart
                ? () =>
                    router.push({
                      pathname: '/player',
                      params: { sessionId: feature.card.session.id, source: 'today' },
                    })
                : undefined
          }
          testID="today-session"
        />
      ) : null}

      {view.nextLine ? (
        <Text variant="body" color="textSecondary" style={styles.nextLine} testID="today-next">
          {view.nextLine}
        </Text>
      ) : null}

      <View style={styles.week} testID="today-week">
        {view.weekStrip.map((day) => (
          <DayPill
            key={day.date}
            letter={day.letter}
            accessibilityLabel={day.label}
            state={day.state}
          />
        ))}
      </View>

      <View style={[styles.summary, { backgroundColor: colors.surface }]}>
        <Ring
          progress={view.ring.total > 0 ? view.ring.done / view.ring.total : 0}
          size={88}
          strokeWidth={8}
        />
        <View
          style={styles.summaryText}
          accessible
          accessibilityLabel={`${view.ring.spoken}. ${view.encouragement}`}>
          {/* The figure is in the system font so its numerals are tabular. */}
          <Text variant="callout" color="textSecondary" testID="today-ring">
            <Text tabular weight="600" style={styles.figure}>
              {view.ring.label}
            </Text>{' '}
            {t.today.ringLabel}
          </Text>
          <Text variant="callout" color="textSecondary" testID="today-encouragement">
            {view.encouragement}
          </Text>
        </View>
      </View>

      {view.comingUp.length > 0 ? (
        <View style={styles.comingUp}>
          <Text variant="heading">{t.today.comingUp}</Text>
          {view.comingUp.map((card, index) => (
            <Animated.View key={card.session.id} entering={enterStaggered(index, reduceMotion)}>
              <ClassCard
                variant="compact"
                eyebrow={card.weekday}
                title={card.title}
                meta={card.meta}
                note={card.note}
                imageUrl={card.imageUrl}
                photoLabel={card.photoLabel}
                locked={view.comingUpLocked}
                onPress={() => openDetail(card)}
                action={{
                  label: t.classMeta.move,
                  accessibilityLabel: t.today.moveHint,
                  onPress: () =>
                    router.push({
                      pathname: '/move/[sessionId]',
                      params: { sessionId: card.session.id },
                    }),
                }}
                testID={`today-upcoming-${index + 1}`}
              />
            </Animated.View>
          ))}
        </View>
      ) : null}
    </>
  );
}

/** The shape of the screen while the plan loads, so nothing jumps when it arrives. */
function TodaySkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessible
      accessibilityLabel={t.common.loading}
      testID="today-loading">
      <Skeleton width="45%" height={20} />
      <Skeleton width="85%" height={32} />
      <Skeleton
        aspectRatio={aspect.thumbnail}
        borderRadius={radius.card}
        style={styles.skeletonCard}
      />
      <Skeleton width="60%" height={26} />
      <Skeleton width="40%" height={20} />
      <Skeleton height={56} borderRadius={radius.pill} />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { paddingTop: space.md },
  heading: {
    gap: space.xxs,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  nextLine: { paddingTop: space.md },
  week: {
    flexDirection: 'row',
    gap: space.xxs,
    paddingTop: space.xl,
  },
  summary: {
    marginTop: space.md,
    borderRadius: radius.card,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  summaryText: { flex: 1, gap: space.xxs },
  figure: { fontSize: 22, lineHeight: 28 },
  comingUp: {
    gap: space.xs,
    paddingTop: space.xl,
  },
  skeleton: {
    gap: space.sm,
    paddingTop: space.md,
  },
  skeletonCard: { marginTop: space.sm },
});
