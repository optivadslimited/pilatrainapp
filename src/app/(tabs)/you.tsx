import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ListRow, Screen, Text } from '@/components';
import { brand } from '@/config/brand';
import { useOnboardingStore } from '@/features/onboarding/store';
import { openLink } from '@/lib/links';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * You: her name, the legal pages and the app version.
 *
 * TODO(milestone 4): plan settings, membership, restore purchases, help,
 * delete account (two steps, in the app) and sign out.
 */
export default function You() {
  const router = useRouter();
  const firstName = useOnboardingStore((state) => state.answers.firstName);
  const reset = useOnboardingStore((state) => state.reset);
  const version = Constants.expoConfig?.version ?? '';

  return (
    <Screen scroll edges={['top']} testID="you">
      <Text variant="display" style={styles.title}>
        {firstName ? t.you.greeting(firstName) : t.you.greetingNoName}
      </Text>

      <View style={styles.section}>
        <Text variant="caption" color="textSecondary" weight="600">
          {t.you.legal}
        </Text>
        <ListRow
          label={t.you.terms}
          onPress={() => openLink(brand.urls.terms)}
          testID="you-terms"
        />
        <ListRow
          label={t.you.privacy}
          onPress={() => openLink(brand.urls.privacy)}
          testID="you-privacy"
        />
        <ListRow
          label={t.you.healthDisclaimer}
          onPress={() => openLink(brand.urls.healthDisclaimer)}
          testID="you-health-disclaimer"
          divider={false}
        />
      </View>

      {__DEV__ ? (
        <View style={styles.section}>
          <Text variant="caption" color="textSecondary" weight="600">
            {t.you.developer}
          </Text>
          <ListRow
            label={t.you.gallery}
            onPress={() => router.push('/dev/gallery')}
            testID="you-gallery"
          />
          <ListRow
            label={t.you.restartOnboarding}
            onPress={() => {
              reset();
              router.dismissTo('/welcome');
            }}
            testID="you-restart"
            divider={false}
          />
        </View>
      ) : null}

      <Text variant="caption" color="textSecondary" center style={styles.version}>
        {brand.name} · {t.you.version(version)}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space.md },
  section: { marginTop: space.xl },
  version: { marginTop: space.xl },
});
