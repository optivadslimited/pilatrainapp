import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components';
import { space } from '@/theme';

export type QuestionFrameProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Fixed to the bottom: the Continue button, on questions that need one. */
  footer?: ReactNode;
  testID?: string;
};

/**
 * The layout every quiz screen shares: a serif question, one quiet line under
 * it, then the answers. One idea per screen.
 */
export function QuestionFrame({ title, subtitle, children, footer, testID }: QuestionFrameProps) {
  return (
    // The quiz layout already pads the top for the status bar and its header.
    <Screen scroll edges={['bottom']} footer={footer} testID={testID}>
      <View style={styles.heading}>
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
});
