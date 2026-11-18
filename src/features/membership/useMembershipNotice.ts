import { useNow } from '@/lib/useToday';
import { formatMoment } from '@/lib/format';
import { t } from '@/strings';

import { membershipNotice } from './entitlement';
import { useMembership, useMembershipStore } from './membership';
import { planOf } from './products';
import { useProducts } from './queries';

export type MembershipNoticeView =
  | { kind: 'billing_issue'; title: string; body: string; action: string }
  | { kind: 'trial_ending'; title: string; body: string; action: string };

/**
 * The one notice Today may show about her membership.
 *
 * The trial notice names the date the free week ends and the price that
 * follows. The price is the one she saw at the paywall; if this phone does
 * not have it (she restored her purchase here), it is asked of the store.
 */
export function useMembershipNotice(): MembershipNoticeView | null {
  const moment = useNow();
  const { entitlement } = useMembership();
  const agreed = useMembershipStore((state) => state.agreed);

  const kind = membershipNotice(entitlement, moment);
  const plan = planOf(entitlement.productId);
  const agreedPrice = agreed && agreed.productId === entitlement.productId ? agreed.price : null;

  const products = useProducts(kind === 'trial_ending' && !agreedPrice);
  const price =
    agreedPrice ??
    products.data?.find((product) => product.productId === entitlement.productId)?.priceString ??
    null;

  if (kind === 'billing_issue') {
    return {
      kind,
      title: t.today.banner.billingTitle,
      body: t.today.banner.billingBody,
      action: t.today.banner.billingAction,
    };
  }

  if (kind === 'trial_ending' && entitlement.expiresAt) {
    return {
      kind,
      title: t.today.banner.trialTitle(formatMoment(entitlement.expiresAt)),
      body:
        price && plan
          ? t.today.banner.trialBody(price, t.paywall.period[plan])
          : t.today.banner.trialBodyNoPrice,
      action: t.today.banner.trialAction,
    };
  }

  return null;
}
