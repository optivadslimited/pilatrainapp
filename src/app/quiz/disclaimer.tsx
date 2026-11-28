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
 * The last step before her plan is built. Every user ticks two boxes: the
 * health disclaimer, and that she is 18 or over. If she told us about
 * anything to work around (pregnancy, injury, pain), a third box asks her
 * explicit consent to keeping it, which UK and EU law require for health
 * data. Nothing starts ticked, and the plan cannot be built until each box
 * shown is ticked.
 *
 * Her answers stay on the phone until this point. The time she ticks the
 * boxes is stored with them (`disclaimer_accepted_at`); with health answers,
 * that is also the time of her consent.
 */
export default function Disclaimer() {
  const { go } = useQuizNavigation();
  const acceptDisclaimer = useOnboardingStore((state) => state.acceptDisclaimer);
  const workAround = useOnboardingStore((state) => state.answers.workAround);
  const askHealthConsent = (workAround ?? []).some((value) => value !== 'none');

  const [understood, setUnderstood] = useState(false);
  const [adult, setAdult] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const ready = understood && adult && (!askHealthConsent || healthConsent);

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
          disabled={!ready}
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
        checked={understood}
        onChange={setUnderstood}
        testID="disclaimer-checkbox"
      />
      <Button
        label={t.disclaimer.link}
        variant="text"
        onPress={() => openLink(brand.urls.healthDisclaimer)}
        style={styles.link}
        testID="disclaimer-link"
      />
      <View style={styles.more}>
        <Checkbox
          label={t.disclaimer.age}
          checked={adult}
          onChange={setAdult}
          testID="disclaimer-age"
        />
        {askHealthConsent ? (
          <Checkbox
            label={t.disclaimer.healthConsent}
            checked={healthConsent}
            onChange={setHealthConsent}
            testID="disclaimer-health-consent"
          />
        ) : null}
      </View>
      <Button
        label={t.disclaimer.privacyLink}
        variant="text"
        onPress={() => openLink(brand.urls.privacy)}
        style={styles.link}
        testID="disclaimer-privacy-link"
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
  more: {
    gap: space.md,
    marginTop: space.md,
  },
  link: {
    alignSelf: 'flex-start',
    marginTop: space.xs,
    // Lines the label up with the checkbox's sentence rather than its box.
    paddingHorizontal: 0,
    marginLeft: 24 + space.sm,
  },
});
