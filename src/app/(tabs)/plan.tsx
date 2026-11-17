import { EmptyState, Screen, Text } from '@/components';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * Plan: four weeks down the screen, each with its theme, and the class library.
 *
 * TODO(milestone 3): the real screen. Foundations, Build, Strengthen, Flow;
 * session states; Move session; Adjust my plan; Browse all classes.
 */
export default function Plan() {
  return (
    <Screen edges={['top']} testID="plan">
      <Text variant="display" style={{ paddingTop: space.md }}>
        {t.plan.title}
      </Text>
      <EmptyState icon="plan" title={t.plan.emptyTitle} body={t.plan.emptyBody} />
    </Screen>
  );
}
