import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Checkbox, Screen, Text } from '@/components';
import { brand } from '@/config/brand';
import { afterDisclaimer } from '@/features/onboarding/flow';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useQuizNavigation } from '@/features/onboarding/useQuizNavigation';
import { openLink } from '@/lib/links';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * The health disclaimer. Every user ticks it before her plan is built; the
 * time she did so is stored with her answers (`disclaimer_accepted_at`).
 */
export default function Disclaimer() {
  const { go } = useQuizNavigation();
  const acceptDisclaimer = useOnboardingStore((state) => state.acceptDisclaimer);
  const [checked, setChecked] = useState(false);

  const onBuild = () => {
    acceptDisclaimer(new Date().toISOString());
    go(afterDisclaimer());
  };

  return (
    <Screen
      edges={['bottom']}
      testID="disclaimer"
      footer={
        <Button
          label={t.disclaimer.primary}
          onPress={onBuild}
          disabled={!checked}
          testID="disclaimer-build-plan"
        />
      }>
      <View style={styles.heading}>
        <Text variant="title">{t.disclaimer.title}</Text>
        <Text variant="body" color="textSecondary">
          {t.disclaimer.body}
        </Text>
      </View>
      <Checkbox
        label={t.disclaimer.checkbox}
        checked={checked}
        onChange={setChecked}
        testID="disclaimer-checkbox"
      />
      <Button
        label={t.disclaimer.link}
        variant="text"
        onPress={() => openLink(brand.urls.healthDisclaimer)}
        style={styles.link}
        testID="disclaimer-link"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  link: {
    alignSelf: 'flex-start',
    marginTop: space.xs,
    // Lines the label up with the checkbox's sentence rather than its box.
    paddingHorizontal: 0,
    marginLeft: 24 + space.sm,
  },
});
