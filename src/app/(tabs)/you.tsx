import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { ListRow, Screen, Text, toast } from '@/components';
import { brand } from '@/config/brand';
import { accountsAvailable, signOut, useAccountStore } from '@/features/account/account';
import { applyEntitlement, useMembership } from '@/features/membership/membership';
import { planOf } from '@/features/membership/products';
import { purchases } from '@/features/membership/purchases';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useCurrentPlan } from '@/features/plan/queries';
import { useReminderStore } from '@/features/reminders/store';
import { formatMoment, weekdayList } from '@/lib/format';
import { openLink } from '@/lib/links';
import { analyticsEnabled, setAnalyticsEnabled } from '@/lib/posthog';
import { notificationPermission } from '@/lib/reminders';
import { t } from '@/strings';
import { space } from '@/theme';

// Development builds only. Loaded on demand so it never ships in a release.
const DeveloperTools: ComponentType | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('@/features/dev/DeveloperTools') as typeof import('@/features/dev/DeveloperTools'))
      .DeveloperTools
  : null;

/**
 * You: her name, and everything she can change or leave.
 *
 *   Your plan     days and time, reminders
 *   Membership    her plan and its renewal date, manage, restore, redeem
 *   Account       create one or sign out, and delete it, in the app
 *   Help          an email to us
 *   Legal         Terms, Privacy, Health disclaimer
 */
export default function You() {
  const router = useRouter();
  const firstName = useOnboardingStore((state) => state.answers.firstName);
  const answers = useOnboardingStore((state) => state.answers);
  const plan = useCurrentPlan().data;
  const account = useAccountStore((state) => state.account);
  const reminders = useReminderStore((state) => state.enabled);
  const setReminders = useReminderStore((state) => state.setEnabled);
  const { isMember, status, entitlement } = useMembership();
  const [busy, setBusy] = useState(false);
  const [usageData, setUsageData] = useState(analyticsEnabled);
  const version = Constants.expoConfig?.version ?? '';

  const weekdays = plan?.profile.weekdays ?? answers.weekdays ?? [];
  const timeOfDay = answers.timeOfDay ?? 'varies';
  const memberPlan = planOf(entitlement.productId);

  const toggleUsageData = () => {
    const next = !usageData;
    setAnalyticsEnabled(next);
    setUsageData(next);
    toast.show(next ? t.you.usageDataOn : t.you.usageDataOff);
  };

  const toggleReminders = async () => {
    if (reminders) {
      setReminders(false);
      toast.show(t.you.remindersOff);
      return;
    }
    const permission = await notificationPermission();
    if (permission === 'granted') {
      setReminders(true);
      toast.show(t.reminders.on);
    } else if (permission === 'undetermined') {
      // Explain first, on our own screen, then ask.
      router.push('/reminders');
    } else {
      toast.show(
        permission === 'denied' ? t.holding.reminderDenied : t.holding.reminderUnavailable,
      );
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    const outcome = await purchases.restore();
    setBusy(false);
    if (outcome.status === 'restored') {
      applyEntitlement(outcome.entitlement);
      toast.show(t.paywall.restored);
    } else {
      toast.show(
        outcome.status === 'nothing' ? t.paywall.nothingToRestore : t.paywall.restoreFailed,
      );
    }
  };

  const contact = async () => {
    const subject = encodeURIComponent(t.you.supportSubject(version));
    try {
      await Linking.openURL(`mailto:${brand.supportEmail}?subject=${subject}`);
    } catch {
      // No mail app set up: show the address so she can use it elsewhere.
      toast.show(t.you.noMailApp(brand.supportEmail));
    }
  };

  const leave = async () => {
    if (busy) return;
    setBusy(true);
    await signOut().catch(() => {});
    setBusy(false);
    toast.show(t.you.signedOut);
    router.dismissTo('/welcome');
  };

  // What the date under her plan means depends on where she stands.
  const dateLabel =
    status === 'lapsed'
      ? t.you.ended
      : status === 'trial' && entitlement.willRenew
        ? t.you.trialEnds
        : entitlement.willRenew
          ? t.you.renews
          : t.you.ends;

  return (
    <Screen scroll edges={['top']} testID="you">
      <Text variant="display" style={styles.title}>
        {firstName ? t.you.greeting(firstName) : t.you.greetingNoName}
      </Text>

      <Section title={t.you.plan}>
        <ListRow
          label={t.you.daysAndTime}
          value={`${weekdayList(weekdays)} · ${t.quiz.questions.time_of_day.options[timeOfDay]}`}
          onPress={() => router.push('/adjust')}
          testID="you-plan-settings"
        />
        <ListRow
          label={t.you.reminders}
          value={reminders ? t.you.on : t.you.off}
          onPress={toggleReminders}
          testID="you-reminders"
          divider={false}
        />
      </Section>

      <Section title={t.you.membership}>
        <ListRow
          label={t.you.memberPlan}
          value={
            memberPlan
              ? [
                  t.paywall.planName[memberPlan],
                  status === 'trial' || status === 'grace' || status === 'lapsed'
                    ? t.you.status[status]
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : t.you.notMember
          }
          testID="you-membership-plan"
        />
        {memberPlan && entitlement.expiresAt ? (
          <ListRow
            label={dateLabel}
            value={formatMoment(entitlement.expiresAt)}
            testID="you-membership-date"
          />
        ) : null}
        {isMember ? (
          <ListRow
            label={t.you.manage}
            onPress={() => purchases.manage().catch(() => {})}
            testID="you-manage"
          />
        ) : (
          <ListRow
            label={t.you.seePlans}
            onPress={() => router.push({ pathname: '/paywall', params: { placement: 'you_tab' } })}
            testID="you-see-plans"
          />
        )}
        <ListRow label={t.you.restore} onPress={restore} testID="you-restore" />
        <ListRow
          label={t.you.redeem}
          onPress={() => purchases.redeemCode().catch(() => {})}
          testID="you-redeem"
          divider={false}
        />
      </Section>

      {accountsAvailable ? (
        <Section title={t.you.account}>
          {account ? (
            <>
              <ListRow
                label={account.method === 'apple' ? t.you.signedInApple : (account.email ?? '')}
                value={account.method === 'apple' ? (account.email ?? undefined) : undefined}
                testID="you-account"
              />
              <ListRow label={t.you.signOut} onPress={leave} testID="you-sign-out" />
            </>
          ) : (
            <ListRow
              label={t.you.createAccount}
              onPress={() => router.push('/create-account')}
              testID="you-create-account"
            />
          )}
          <ListRow
            label={t.you.deleteAccount}
            color="error"
            onPress={() => router.push('/delete-account')}
            testID="you-delete-account"
            divider={false}
          />
        </Section>
      ) : null}

      <Section title={t.you.help}>
        <ListRow
          label={t.you.contact}
          value={brand.supportEmail}
          onPress={contact}
          testID="you-contact"
          divider={false}
        />
      </Section>

      <Section title={t.you.privacySection}>
        <ListRow
          label={t.you.usageData}
          value={usageData ? t.you.on : t.you.off}
          onPress={toggleUsageData}
          testID="you-usage-data"
          divider={false}
        />
        <Text variant="caption" color="textSecondary" style={styles.note}>
          {t.you.usageDataNote}
        </Text>
      </Section>

      <Section title={t.you.legal}>
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
      </Section>

      {DeveloperTools ? <DeveloperTools /> : null}

      <Text
        variant="caption"
        color="textSecondary"
        center
        style={styles.version}
        testID="you-version">
        {brand.name} · {t.you.version(version)}
        {'\n'}
        {t.you.madeBy}
      </Text>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" color="textSecondary" weight="600" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space.md },
  section: { marginTop: space.xl },
  note: { marginTop: space.xxs },
  version: { marginTop: space.xl, marginBottom: space.lg },
});
