import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  body: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  testID?: string;
};

/**
 * What a screen shows when it has nothing to show yet, or cannot show it:
 * nothing planned, offline, a class that did not load. One calm idea, and at
 * most one thing to do about it.
 */
export function EmptyState({ title, body, icon, action, testID }: EmptyStateProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      {icon ? <Icon name={icon} size={32} color="textSecondary" /> : null}
      <Text variant="heading" center>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" center>
        {body}
      </Text>
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.xxl,
  },
  action: { marginTop: space.sm, alignSelf: 'stretch' },
});
