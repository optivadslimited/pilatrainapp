import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  PlanCard,
  Screen,
  Skeleton,
  Text,
  toast,
} from '@/components';
import { brand } from '@/config/brand';
import {
  applyEntitlement,
  useMembership,
  useMembershipStore,
} from '@/features/membership/membership';
import {
  paywallOffer,
  paywallPlans,
  paywallPoints,
  preselected,
  toVariant,
} from '@/features/membership/pricing';
import { PLAN_KEYS, type PlanKey } from '@/features/membership/products';
import { purchases } from '@/features/membership/purchases';
import { useProducts, useTrialEligibility } from '@/features/membership/queries';
import { useContinue } from '@/features/onboarding/useContinue';
import { track } from '@/lib/analytics';
import { useFlag } from '@/lib/flags';
import { openLink } from '@/lib/links';
import { useGoBack } from '@/lib/useGoBack';
import { t } from '@/strings';
import { size, space, useTheme } from '@/theme';

/**
 * The paywall. It is honest by construction:
 *
 *  - the close button is there from the first frame, never delayed or faded in;
 *  - each card's full price and period is its largest text, exactly as the
 *    store wrote it, and the per-month figure is smaller;
 *  - the exact terms she is agreeing to sit directly under the button;
 *  - if she cannot have the free trial, the button says "Subscribe" and the
 *    word "free" appears nowhere.
 *
 * What it says is worked out in features/membership/pricing.ts, where it is
 * tested. Prices come from the store and are never typed in.
 *
 * `placement` says where it was opened from: plan_preview, after_free_class,
 * locked_class, today or you_tab. With `then=continue` (the end of the free
 * class) closing it moves her on instead of back.
 */
export default function Paywall() {
  const { colors } = useTheme();
  const goBack = useGoBack('/today');
  const next = useContinue();
  const { placement = 'unknown', then } = useLocalSearchParams<{
    placement?: string;
    then?: string;
  }>();

  const { isMember } = useMembership();
  const setAgreed = useMembershipStore((state) => state.setAgreed);
  const variant = toVariant(useFlag('paywall_variant'));

  const products = useProducts();
  const plans = products.data ? paywallPlans(products.data) : null;
  const ids = plans?.map((plan) => plan.product.productId) ?? [];
  const eligibility = useTrialEligibility(ids);

  const [chosen, setChosen] = useState<PlanKey | null>(null);
  const [busy, setBusy] = useState<'buying' | 'restoring' | null>(null);
  const wasMember = useRef(isMember);

  const selectedKey = chosen ?? (plans ? preselected(plans, variant) : null);
  const selected = plans?.find((plan) => plan.product.plan === selectedKey) ?? null;
  // Until the store has answered, assume no trial: nothing is promised that may not be true.
  const eligible = selected ? (eligibility.data?.[selected.product.productId] ?? false) : false;
  const ready = Boolean(selected) && !eligibility.isLoading;
  const offer = selected && ready ? paywallOffer(selected, eligible) : null;

  useEffect(() => {
    track('paywall_viewed', { placement, variant });
  }, [placement, variant]);

  const close = () => (then === 'continue' ? next.afterPaywall() : goBack());

  // Already a member (a restored purchase, or a link that led here): nothing to sell.
  useEffect(() => {
    if (wasMember.current) {
      toast.show(t.paywall.alreadyMember);
      goBack();
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (key: PlanKey) => {
    if (key === selectedKey) return;
    setChosen(key);
    const product = plans?.find((plan) => plan.product.plan === key)?.product;
    if (product) track('plan_selected', { product: product.productId });
  };

  const buy = async () => {
    if (!selected || !offer || busy) return;
    setBusy('buying');
    const { productId } = selected.product;
    const outcome = await purchases.purchase(productId);
    setBusy(null);

    switch (outcome.status) {
      case 'purchased':
        // The price she has just agreed to, kept so it can be quoted back to her.
        setAgreed({ productId, price: selected.price });
        applyEntitlement(outcome.entitlement);
        track(offer.trial ? 'trial_started' : 'subscription_started', { product: productId });
        toast.showAtTop(t.paywall.welcome);
        next.afterPaywall();
        return;
      case 'cancelled':
        track('purchase_cancelled');
        toast.show(t.paywall.cancelled);
        return;
      case 'pending':
        toast.show(t.paywall.pending);
        return;
      case 'failed':
        track('purchase_failed', { reason: outcome.reason });
        toast.show(
          outcome.reason === 'offline'
            ? t.paywall.failedOffline
            : outcome.reason === 'not_allowed'
              ? t.paywall.notAllowed
              : t.paywall.failed,
        );
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy('restoring');
    const outcome = await purchases.restore();
    setBusy(null);

    if (outcome.status === 'restored') {
      applyEntitlement(outcome.entitlement);
      toast.showAtTop(t.paywall.restored);
      next.afterPaywall();
    } else {
      toast.show(
        outcome.status === 'nothing' ? t.paywall.nothingToRestore : t.paywall.restoreFailed,
      );
    }
  };

  const header = (
    <View style={styles.header}>
      <IconButton
        icon="close"
        accessibilityLabel={t.common.close}
        onPress={close}
        testID="paywall-close"
      />
    </View>
  );

  if (products.isError || (plans && plans.length === 0)) {
    return (
      <Screen testID="paywall">
        {header}
        <EmptyState
          icon={products.isError ? 'offline' : 'info'}
          title={products.isError ? t.paywall.loadErrorTitle : t.paywall.unavailableTitle}
          body={products.isError ? t.paywall.loadErrorBody : t.paywall.unavailableBody}
          action={
            products.isError
              ? { label: t.common.retry, onPress: () => products.refetch() }
              : { label: t.common.close, onPress: close }
          }
          testID="paywall-error"
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      testID="paywall"
      footer={
        <>
          <Button
            label={offer?.cta ?? t.common.loading}
            onPress={buy}
            disabled={!offer || busy === 'restoring'}
            loading={busy === 'buying'}
            testID="paywall-cta"
          />
          {/* The exact terms, directly under the button. */}
          {offer ? (
            <Text variant="caption" color="textSecondary" center testID="paywall-terms">
              {offer.terms}
            </Text>
          ) : (
            <Skeleton height={32} />
          )}
          <View style={styles.links}>
            <Link
              label={t.paywall.termsLink}
              onPress={() => openLink(brand.urls.terms)}
              testID="paywall-terms-link"
            />
            <Link
              label={t.paywall.privacyLink}
              onPress={() => openLink(brand.urls.privacy)}
              testID="paywall-privacy-link"
            />
            <Link label={t.paywall.restore} onPress={restore} testID="paywall-restore" />
          </View>
        </>
      }>
      {header}

      <Text variant="display" testID="paywall-headline">
        {offer?.headline ?? t.paywall.headlineNoTrial}
      </Text>

      <View style={styles.points}>
        {paywallPoints().map((point) => (
          <View key={point} style={styles.point}>
            <Icon name="check" size={18} color="primary" style={styles.tick} />
            <Text variant="body" style={styles.fill}>
              {point}
            </Text>
          </View>
        ))}
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t.paywall.choose}
        style={styles.plans}>
        {plans
          ? plans.map((plan) => (
              <PlanCard
                key={plan.product.productId}
                name={plan.name}
                price={plan.price}
                period={plan.period}
                perMonth={plan.perMonth}
                badge={plan.badge ?? undefined}
                selected={plan.product.plan === selectedKey}
                onPress={() => select(plan.product.plan)}
                testID={`paywall-plan-${plan.product.plan}`}
              />
            ))
          : PLAN_KEYS.map((key) => (
              <PlanCard
                key={key}
                name={t.paywall.planName[key]}
                price={null}
                period=""
                selected={false}
                onPress={() => {}}
                testID={`paywall-plan-${key}-loading`}
              />
            ))}
      </View>

      {offer?.timeline ? (
        <View
          accessible
          accessibilityLabel={offer.timeline
            .map((point) => `${point.when}: ${point.what}`)
            .join('. ')}
          style={styles.timeline}
          testID="paywall-timeline">
          {offer.timeline.map((point, index) => (
            <View key={point.when} style={styles.timelinePoint}>
              <View style={styles.timelineTrack}>
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: index === 0 ? 'transparent' : colors.hairline },
                  ]}
                />
                <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                <View
                  style={[
                    styles.timelineLine,
                    {
                      backgroundColor:
                        index === (offer.timeline?.length ?? 0) - 1
                          ? 'transparent'
                          : colors.hairline,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" weight="600" center>
                {point.when}
              </Text>
              <Text variant="caption" color="textSecondary" center>
                {point.what}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function Link({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return (
    <Text
      variant="caption"
      color="textSecondary"
      weight="600"
      onPress={onPress}
      accessibilityRole="link"
      suppressHighlighting
      style={styles.link}
      testID={testID}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The close button: top left, in place from the first frame.
  header: {
    height: size.touchTarget,
    marginLeft: -space.xs,
    marginBottom: space.xs,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  points: { gap: space.xs, paddingTop: space.md },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  // Sits on the first line of its text.
  tick: { marginTop: 3 },
  plans: { gap: space.xs, paddingTop: space.lg },
  timeline: {
    flexDirection: 'row',
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  timelinePoint: { flex: 1, gap: 2 },
  timelineTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: space.xxs,
  },
  timelineLine: { flex: 1, height: 2 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: space.md,
  },
  // Each link is a full 44-point target.
  link: {
    minHeight: size.touchTarget,
    paddingHorizontal: space.xs,
    textAlignVertical: 'center',
    lineHeight: size.touchTarget,
  },
});
