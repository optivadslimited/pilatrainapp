import { StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BannerProps = {
  title: string;
  body?: string;
  icon?: IconName;
  /** `alert` is for something she needs to act on: a payment that did not go through. */
  tone?: 'neutral' | 'alert';
  action?: { label: string; onPress: () => void };
  testID?: string;
};

/**
 * A notice at the top of a screen: the trial is ending, a payment needs
 * attention, there is no connection. It states a fact and, at most, offers
 * one thing to do. It is read out when it appears.
 */
export function Banner({ title, body, icon, tone = 'neutral', action, testID }: BannerProps) {
  const { colors } = useTheme();
  const alert = tone === 'alert';

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[
        styles.banner,
        { backgroundColor: colors.surface, borderColor: alert ? colors.error : colors.surface },
      ]}>
      <View style={styles.row}>
        {icon ? (
          <Icon name={icon} size={20} color={alert ? 'error' : 'primary'} style={styles.icon} />
        ) : null}
        <View style={styles.text}>
          <Text variant="body" weight="600">
            {title}
          </Text>
          {body ? (
            <Text variant="callout" color="textSecondary">
              {body}
            </Text>
          ) : null}
        </View>
      </View>
      {action ? (
        <Button
          label={action.label}
          variant="text"
          onPress={action.onPress}
          style={styles.action}
          testID={testID ? `${testID}-action` : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingBottom: space.xs,
  },
  // Sits on the first line of the title.
  icon: { marginTop: 2 },
  text: { flex: 1, gap: space.xxs },
  // Lines its label up with the text above it, past the icon.
  action: { alignSelf: 'flex-start', marginLeft: space.md },
});
