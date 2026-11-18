import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import {
  BarChart,
  EmptyState,
  MonthGrid,
  Ring,
  Screen,
  Skeleton,
  StatTile,
  Text,
} from '@/components';
import { indexCatalogue } from '@/features/plan/cards';
import { progressView } from '@/features/plan/progress';
import { useCatalogue, useHistory } from '@/features/plan/queries';
import { useToday } from '@/lib/useToday';
import { t } from '@/strings';
import { radius, space, useTheme } from '@/theme';

/**
 * Progress: her dashboard. Sessions, minutes and weeks; how consistent the
 * last four weeks have been; this plan week by week; this month day by day;
 * and one line on how the classes have felt.
 *
 * Never weight, never measurements, never before-and-after photos.
 */
export default function Progress() {
  const { colors } = useTheme();
  const date = useToday();
  const history = useHistory();
  const classes = useCatalogue();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([history.refetch(), classes.refetch()]);
    setRefreshing(false);
  };

  const view =
    history.data && classes.data
      ? progressView(history.data, indexCatalogue(classes.data), date)
      : null;

  if (!view && (history.isError || classes.isError)) {
    return (
      <Screen edges={['top']} testID="progress-error">
        <EmptyState
          icon="offline"
          title={t.progress.errorTitle}
          body={t.progress.errorBody}
          action={{ label: t.common.retry, onPress: refresh }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll={!view?.isEmpty}
      edges={['top']}
      testID="progress"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }>
      <Text variant="display" style={styles.title}>
        {t.progress.title}
      </Text>

      {!view ? (
        <View style={styles.loading} accessible accessibilityLabel={t.common.loading}>
          <Skeleton height={96} borderRadius={radius.card} />
          <Skeleton height={120} borderRadius={radius.card} />
          <Skeleton height={180} borderRadius={radius.card} />
        </View>
      ) : view.isEmpty ? (
        <EmptyState
          icon="progress"
          title={t.progress.emptyTitle}
          body={t.progress.emptyBody}
          testID="progress-empty"
        />
      ) : (
        <>
          <View style={styles.tiles}>
            <StatTile
              value={String(view.totals.sessions)}
              label={t.progress.sessions}
              testID="progress-sessions"
            />
            <StatTile
              value={String(view.totals.minutes)}
              label={t.progress.minutes}
              testID="progress-minutes"
            />
            <StatTile
              value={String(view.totals.weeksActive)}
              label={t.progress.weeks}
              testID="progress-weeks"
            />
          </View>

          <View
            style={[styles.card, styles.row, { backgroundColor: colors.surface }]}
            testID="progress-consistency">
            <Ring
              progress={view.consistency?.ratio ?? 0}
              size={88}
              strokeWidth={8}
              accessibilityLabel={
                view.consistency
                  ? `${t.progress.consistency}. ${view.consistency.body}`
                  : t.progress.consistency
              }>
              {view.consistency ? (
                <Text tabular weight="600" style={styles.percent}>
                  {Math.round(view.consistency.ratio * 100)}%
                </Text>
              ) : null}
            </Ring>
            <View style={styles.fill}>
              <Text variant="heading">{t.progress.consistency}</Text>
              <Text variant="callout" color="textSecondary">
                {view.consistency?.body ?? t.progress.consistencyEmpty}
              </Text>
            </View>
          </View>

          {view.chart ? (
            <View
              style={[styles.card, { backgroundColor: colors.surface }]}
              testID="progress-chart">
              <Text variant="heading">{t.progress.chartTitle}</Text>
              <BarChart
                bars={view.chart.bars}
                target={view.chart.target}
                targetLabel={view.chart.targetLabel}
              />
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: colors.surface }]} testID="progress-month">
            <Text variant="heading">{view.month.title}</Text>
            <MonthGrid
              days={view.month.days}
              accessibilityLabel={`${view.month.title}. ${view.month.summary}`}
            />
            <Text variant="callout" color="textSecondary">
              {view.month.summary}
            </Text>
          </View>

          {view.feel ? (
            <Text variant="body" color="textSecondary" style={styles.feel} testID="progress-feel">
              {view.feel}
            </Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, gap: space.xxs },
  title: { paddingTop: space.md },
  tiles: {
    flexDirection: 'row',
    gap: space.xs,
    paddingTop: space.lg,
  },
  card: {
    marginTop: space.md,
    borderRadius: radius.card,
    padding: space.md,
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  // In the system font so the numerals are tabular.
  percent: { fontSize: 20, lineHeight: 24 },
  feel: { paddingTop: space.lg },
  loading: { gap: space.md, paddingTop: space.lg },
});
