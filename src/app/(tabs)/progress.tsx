import { EmptyState, Screen, Text } from '@/components';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * Progress: her dashboard. Sessions, minutes and weeks; never weight,
 * measurements or before-and-after photos.
 *
 * TODO(milestone 3): the real screen. Three stat tiles, the consistency ring,
 * the four-week bar chart, the month view, and one line on how classes felt.
 */
export default function Progress() {
  return (
    <Screen edges={['top']} testID="progress">
      <Text variant="display" style={{ paddingTop: space.md }}>
        {t.progress.title}
      </Text>
      <EmptyState icon="progress" title={t.progress.emptyTitle} body={t.progress.emptyBody} />
    </Screen>
  );
}
