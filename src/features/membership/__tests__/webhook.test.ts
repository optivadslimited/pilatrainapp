import {
  hasAccess,
  isOurUserId,
  isStale,
  subscriptionChange,
  type RevenueCatEvent,
} from '@shared/billing/subscription';

const USER = '0b0e7a52-4c0b-4d55-9a6e-2f6f0d1c9a11';
const T0 = Date.UTC(2026, 11, 1, 10);
const DAY = 24 * 60 * 60 * 1000;

const event = (overrides: Partial<RevenueCatEvent>): RevenueCatEvent => ({
  id: 'evt_1',
  type: 'INITIAL_PURCHASE',
  app_user_id: USER,
  product_id: 'pilatrain_quarterly',
  period_type: 'TRIAL',
  event_timestamp_ms: T0,
  expiration_at_ms: T0 + 7 * DAY,
  environment: 'PRODUCTION',
  ...overrides,
});

describe('RevenueCat events', () => {
  it('starts a trial', () => {
    const { row, analytics } = subscriptionChange(event({}), null);
    expect(row).toEqual({
      user_id: USER,
      product_id: 'pilatrain_quarterly',
      status: 'trial',
      period_end: new Date(T0 + 7 * DAY).toISOString(),
      will_renew: true,
      last_event_at: new Date(T0).toISOString(),
      environment: 'production',
    });
    // The app itself reports trial_started; the server does not report it twice.
    expect(analytics).toBeNull();
  });

  it('starts a paid subscription when there is no trial', () => {
    const { row } = subscriptionChange(event({ period_type: 'NORMAL' }), null);
    expect(row?.status).toBe('active');
  });

  it('records a renewal, which is also how a trial becomes paid', () => {
    const { row, analytics } = subscriptionChange(
      event({
        type: 'RENEWAL',
        period_type: 'NORMAL',
        is_trial_conversion: true,
        event_timestamp_ms: T0 + 7 * DAY,
        expiration_at_ms: T0 + 97 * DAY,
      }),
      { product_id: 'pilatrain_quarterly', status: 'trial', period_end: null, will_renew: true },
    );
    expect(row?.status).toBe('active');
    expect(row?.period_end).toBe(new Date(T0 + 97 * DAY).toISOString());
    expect(analytics).toBe('subscription_renewed');
  });

  it('keeps access until the period ends when she cancels', () => {
    const { row, analytics } = subscriptionChange(
      event({ type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' }),
      { product_id: 'pilatrain_quarterly', status: 'trial', period_end: null, will_renew: true },
    );
    expect(row?.status).toBe('trial');
    expect(row?.will_renew).toBe(false);
    expect(analytics).toBe('subscription_cancelled');
    expect(hasAccess(row, new Date(T0 + DAY))).toBe(true);
  });

  it('ends access at once on a refund', () => {
    const { row, analytics } = subscriptionChange(
      event({ type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT', period_type: 'NORMAL' }),
      { product_id: 'pilatrain_quarterly', status: 'active', period_end: null, will_renew: true },
    );
    expect(row?.status).toBe('expired');
    expect(analytics).toBe('subscription_refunded');
    expect(hasAccess(row, new Date(T0))).toBe(false);
  });

  it('turns renewal back on when she changes her mind', () => {
    const { row } = subscriptionChange(
      event({ type: 'UNCANCELLATION', period_type: 'NORMAL' }),
      null,
    );
    expect(row).toMatchObject({ status: 'active', will_renew: true });
  });

  it('keeps access through the billing grace period', () => {
    const { row, analytics } = subscriptionChange(
      event({
        type: 'BILLING_ISSUE',
        period_type: 'NORMAL',
        product_id: undefined,
        expiration_at_ms: T0,
        grace_period_expiration_at_ms: T0 + 16 * DAY,
      }),
      { product_id: 'pilatrain_annual', status: 'active', period_end: null, will_renew: true },
    );
    expect(row).toMatchObject({
      product_id: 'pilatrain_annual',
      status: 'grace',
      period_end: new Date(T0 + 16 * DAY).toISOString(),
    });
    expect(analytics).toBeNull();
    expect(hasAccess(row, new Date(T0 + 10 * DAY))).toBe(true);
    expect(hasAccess(row, new Date(T0 + 17 * DAY))).toBe(false);
  });

  it('ends the membership when it expires', () => {
    const { row, analytics } = subscriptionChange(
      event({ type: 'EXPIRATION', period_type: 'NORMAL', expiration_reason: 'BILLING_ERROR' }),
      null,
    );
    expect(row).toMatchObject({ status: 'expired', will_renew: false });
    expect(analytics).toBe('subscription_expired');
  });

  it('follows her to a new plan', () => {
    const { row } = subscriptionChange(
      event({ type: 'PRODUCT_CHANGE', period_type: 'NORMAL', new_product_id: 'pilatrain_annual' }),
      null,
    );
    expect(row?.product_id).toBe('pilatrain_annual');
  });

  it('marks sandbox purchases as sandbox', () => {
    expect(subscriptionChange(event({ environment: 'SANDBOX' }), null).row?.environment).toBe(
      'sandbox',
    );
  });

  it('writes nothing for a test event, an unknown event, or a user that is not ours', () => {
    expect(subscriptionChange(event({ type: 'TEST' }), null)).toEqual({
      row: null,
      analytics: null,
    });
    expect(subscriptionChange(event({ type: 'SOMETHING_NEW' }), null).row).toBeNull();
    expect(subscriptionChange(event({ app_user_id: '$RCAnonymousID:abc' }), null).row).toBeNull();
    expect(
      subscriptionChange(event({ type: 'BILLING_ISSUE', product_id: undefined }), null).row,
    ).toBeNull();
  });

  it('only ever reports the four events the spec names', () => {
    const types = [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'CANCELLATION',
      'UNCANCELLATION',
      'BILLING_ISSUE',
      'EXPIRATION',
      'PRODUCT_CHANGE',
      'TEST',
    ];
    const reported = new Set(
      types.flatMap((type) => [
        subscriptionChange(event({ type }), null).analytics,
        subscriptionChange(event({ type, cancel_reason: 'CUSTOMER_SUPPORT' }), null).analytics,
      ]),
    );
    reported.delete(null);
    expect([...reported].sort()).toEqual([
      'subscription_cancelled',
      'subscription_expired',
      'subscription_refunded',
      'subscription_renewed',
    ]);
  });
});

describe('late and duplicate events', () => {
  it('drops an event older than the row', () => {
    expect(isStale(event({ event_timestamp_ms: T0 }), new Date(T0 + 1).toISOString())).toBe(true);
    expect(isStale(event({ event_timestamp_ms: T0 }), new Date(T0).toISOString())).toBe(false);
    expect(isStale(event({}), null)).toBe(false);
  });
});

describe('access from a stored row', () => {
  const now = new Date(T0);
  it('follows the status and the period end', () => {
    expect(hasAccess(null, now)).toBe(false);
    expect(hasAccess({ status: 'active', period_end: new Date(T0 + DAY).toISOString() }, now)).toBe(
      true,
    );
    expect(hasAccess({ status: 'trial', period_end: null }, now)).toBe(true);
    expect(
      hasAccess({ status: 'expired', period_end: new Date(T0 + DAY).toISOString() }, now),
    ).toBe(false);
    // An hour's tolerance for a renewal that is still on its way, and no more.
    expect(
      hasAccess({ status: 'active', period_end: new Date(T0 - 30 * 60 * 1000).toISOString() }, now),
    ).toBe(true);
    expect(
      hasAccess(
        { status: 'active', period_end: new Date(T0 - 2 * 60 * 60 * 1000).toISOString() },
        now,
      ),
    ).toBe(false);
  });

  it('recognises our user IDs', () => {
    expect(isOurUserId(USER)).toBe(true);
    expect(isOurUserId('$RCAnonymousID:abc')).toBe(false);
    expect(isOurUserId(undefined)).toBe(false);
  });
});
