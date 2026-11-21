import { setDevDayOffset } from '@/lib/clock';
import { storage } from '@/lib/storage';

import { isTrialEnding, membershipStatus } from '../entitlement';
import { previewProvider, previewStore } from '../purchases/preview';

/**
 * The preview store stands in for StoreKit in development. These tests pin
 * the behaviour the paywall relies on, so what is seen in the preview is what
 * the real store will be asked to do.
 */
beforeEach(() => {
  storage.clearAll();
});

describe('the preview store', () => {
  it('sells the three products, priced from the StoreKit configuration', async () => {
    const products = await previewProvider.products();
    expect(products.map((item) => item.plan)).toEqual(['annual', 'quarterly', 'monthly']);
    for (const product of products) {
      expect(product.priceString).toContain(String(product.price));
      expect(product.pricePerMonthString).toMatch(/\d/);
      expect(product.trialDays).toBe(7);
    }
  });

  it('starts a free trial, once', async () => {
    expect(await previewProvider.trialEligibility(['pilatrain_quarterly'])).toEqual({
      pilatrain_quarterly: true,
    });

    const outcome = await previewProvider.purchase('pilatrain_quarterly');
    expect(outcome.status).toBe('purchased');
    const entitlement = await previewProvider.entitlement();
    expect(membershipStatus(entitlement)).toBe('trial');
    expect(entitlement.willRenew).toBe(true);

    // The trial is used up, as it would be with Apple.
    expect(await previewProvider.trialEligibility(['pilatrain_quarterly'])).toEqual({
      pilatrain_quarterly: false,
    });
  });

  it('subscribes straight away when there is no trial to have', async () => {
    previewStore.setEligible(false);
    await previewProvider.purchase('pilatrain_monthly');
    expect(membershipStatus(await previewProvider.entitlement())).toBe('active');
  });

  it('can be told how the next purchase ends', async () => {
    previewStore.setOutcome('cancelled');
    expect(await previewProvider.purchase('pilatrain_quarterly')).toEqual({ status: 'cancelled' });
    previewStore.setOutcome('pending');
    expect(await previewProvider.purchase('pilatrain_quarterly')).toEqual({ status: 'pending' });
    previewStore.setOutcome('failed');
    expect(await previewProvider.purchase('pilatrain_quarterly')).toEqual({
      status: 'failed',
      reason: 'store_problem',
    });
    // None of those made her a member.
    expect(membershipStatus(await previewProvider.entitlement())).toBe('none');
    expect(await previewProvider.purchase('not_a_product')).toEqual({
      status: 'failed',
      reason: 'unavailable',
    });
  });

  it('tells its listeners when the membership changes', async () => {
    const seen: string[] = [];
    const stop = previewProvider.subscribe((entitlement) =>
      seen.push(membershipStatus(entitlement)),
    );
    await previewProvider.purchase('pilatrain_quarterly');
    previewStore.setMembership('lapsed');
    stop();
    previewStore.setMembership('active');
    expect(seen).toEqual(['trial', 'lapsed']);
  });

  it('restores a membership, or says there is none', async () => {
    expect(await previewProvider.restore()).toEqual({ status: 'nothing' });
    previewStore.setMembership('active');
    expect((await previewProvider.restore()).status).toBe('restored');
  });

  it('runs the trial out as the days pass: it becomes paid, or ends if she cancelled', async () => {
    await previewProvider.purchase('pilatrain_quarterly');
    setDevDayOffset(6);
    const nearEnd = await previewProvider.entitlement();
    expect(membershipStatus(nearEnd)).toBe('trial');
    expect(isTrialEnding(nearEnd, new Date(Date.now() + 6 * 24 * 60 * 60 * 1000))).toBe(true);

    setDevDayOffset(8);
    expect(membershipStatus(await previewProvider.entitlement())).toBe('active');

    // The same again, but she cancels during the trial.
    setDevDayOffset(0);
    previewStore.reset();
    await previewProvider.purchase('pilatrain_quarterly');
    await previewProvider.manage();
    expect((await previewProvider.entitlement()).willRenew).toBe(false);
    setDevDayOffset(8);
    expect(membershipStatus(await previewProvider.entitlement())).toBe('lapsed');
    setDevDayOffset(0);
  });

  it('can be put straight into each membership state', async () => {
    const expected = {
      none: 'none',
      trial: 'trial',
      trial_ending: 'trial',
      active: 'active',
      grace: 'grace',
      lapsed: 'lapsed',
    } as const;
    for (const [kind, status] of Object.entries(expected)) {
      previewStore.setMembership(kind as keyof typeof expected);
      expect(membershipStatus(await previewProvider.entitlement())).toBe(status);
    }
    previewStore.setMembership('trial_ending');
    expect(isTrialEnding(await previewProvider.entitlement(), new Date())).toBe(true);
  });
});
