import { moveTargets } from '@engine';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, OptionCard, Sheet, Text, toast } from '@/components';
import { indexCatalogue, scheduled, sessionCard } from '@/features/plan/cards';
import { useCatalogue, useCurrentPlan, useMoveSession } from '@/features/plan/queries';
import { track } from '@/lib/analytics';
import { formatDay, weekdayName } from '@/lib/format';
import { useGoBack } from '@/lib/useGoBack';
import { useToday } from '@/lib/useToday';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * Move a session. A sheet listing the days it can go to: the free days left
 * in its week, as the plan engine's own rules allow (rule 9, and never two
 * hard sessions on consecutive days). Choosing a day moves it and closes the
 * sheet.
 */
export default function MoveSession() {
  const goBack = useGoBack('/today');
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const date = useToday();
  const plan = useCurrentPlan().data;
  const classes = useCatalogue().data;
  const move = useMoveSession();

  const catalogue = classes ? indexCatalogue(classes) : null;
  const session = plan?.sessions.find((item) => item.id === sessionId);
  const card = session && catalogue ? sessionCard(session, catalogue) : null;
  const targets =
    plan && catalogue && session
      ? moveTargets(scheduled(plan.sessions, catalogue), plan.startDate, session.id, date)
      : [];

  const choose = (to: string) => {
    if (!session || move.isPending) return;
    move.mutate(
      { sessionId: session.id, to },
      {
        onSuccess: () => {
          track('session_moved');
          toast.show(t.move.moved(weekdayName(to)));
          goBack();
        },
        onError: () => toast.show(t.move.failed),
      },
    );
  };

  return (
    <Sheet title={t.move.title} onClose={goBack} testID="move-sheet">
      {card && targets.length > 0 ? (
        <>
          <Text variant="body" color="textSecondary">
            {t.move.body(card.title)}
          </Text>
          <View accessibilityRole="radiogroup" style={{ gap: space.xs }}>
            {targets.map((target) => (
              <OptionCard
                key={target}
                label={formatDay(target)}
                description={target === date ? t.move.today : undefined}
                selected={move.isPending && move.variables?.to === target}
                disabled={move.isPending}
                onPress={() => choose(target)}
                testID={`move-to-${target}`}
              />
            ))}
          </View>
        </>
      ) : (
        <EmptyState title={t.move.noneTitle} body={t.move.noneBody} />
      )}
    </Sheet>
  );
}
