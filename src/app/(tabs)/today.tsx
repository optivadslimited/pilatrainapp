import { EmptyState, Screen, Text } from '@/components';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * Today: the home dashboard and the screen she sees most.
 *
 * TODO(milestone 2): the real screen. The dated line, the headline that
 * changes with her day, the large class card, the week strip, the weekly ring,
 * "Coming up" with Move, and one quiet line of encouragement.
 */
export default function Today() {
  return (
    <Screen edges={['top']} testID="today">
      <Text variant="display" style={{ paddingTop: space.md }}>
        {t.tabs.today}
      </Text>
      <EmptyState icon="today" title={t.today.emptyTitle} body={t.today.emptyBody} />
    </Screen>
  );
}
