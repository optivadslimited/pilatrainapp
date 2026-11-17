import { StyleSheet, View } from 'react-native';

import { selectionTap } from '@/lib/haptics';
import { t } from '@/strings';
import { radius, space, useTheme } from '@/theme';

import { PressableScale } from './PressableScale';
import { SelectionMark } from './SelectionMark';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

export type PlanCardProps = {
  /** The plan's name, e.g. "Quarterly". */
  name: string;
  /**
   * The full price, localised by StoreKit, e.g. the store's own "$44.99".
   * Never a string typed into the app. `null` while prices load.
   */
  price: string | null;
  /** How often it is charged, e.g. "every 3 months". */
  period: string;
  /** The smaller per-month figure, built from the StoreKit price. Optional. */
  perMonth?: string | null;
  /** "Most popular" is a quiet Mist tag. A saving is the one place Clay is used. */
  badge?: { label: string; tone: 'neutral' | 'saving' };
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * One subscription on the paywall. The honest-paywall rule is built into the
 * layout: the full price and its period are the largest text on the card, and
 * the per-month figure is smaller.
 */
export function PlanCard({
  name,
  price,
  period,
  perMonth,
  badge,
  selected,
  onPress,
  testID,
}: PlanCardProps) {
  const { colors } = useTheme();
  const loading = price === null;

  const label = loading
    ? `${name}. ${t.planCard.loadingPrice}`
    : [name, `${price} ${period}`, perMonth, badge?.label].filter(Boolean).join('. ');

  return (
    <PressableScale
      onPress={() => {
        if (!selected) selectionTap();
        onPress();
      }}
      disabled={loading}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: loading }}
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.selectedTint : colors.surface,
          borderColor: selected ? colors.primary : colors.surface,
        },
      ]}>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text variant="callout" weight="600" color="textSecondary">
            {name}
          </Text>
          {badge ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    badge.tone === 'saving'
                      ? colors.accent
                      : selected
                        ? colors.background
                        : colors.selectedTint,
                },
              ]}>
              <Text
                variant="caption"
                weight="600"
                color={badge.tone === 'saving' ? 'onAccent' : 'primary'}>
                {badge.label}
              </Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <Skeleton width={160} height={26} />
        ) : (
          <Text tabular weight="600" style={styles.price}>
            {price} <Text style={styles.period}>{period}</Text>
          </Text>
        )}

        {loading ? (
          <Skeleton width={120} height={16} />
        ) : perMonth ? (
          <Text variant="caption" color="textSecondary" tabular>
            {perMonth}
          </Text>
        ) : null}
      </View>
      <SelectionMark selected={selected} shape="round" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  body: { flex: 1, gap: space.xxs },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  badge: {
    borderRadius: radius.chip,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  // The largest text on the card, by rule.
  price: { fontSize: 22, lineHeight: 28 },
  period: { fontSize: 17, lineHeight: 28, fontWeight: '500' },
});
