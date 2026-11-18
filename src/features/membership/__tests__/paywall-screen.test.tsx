import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Paywall from '@/app/paywall';
import { toast } from '@/components';
import { useAccountStore } from '@/features/account/account';
import { useReminderStore } from '@/features/reminders/store';
import { addAnalyticsSink } from '@/lib/analytics';
import { useFlagStore } from '@/lib/flags';
import { storage } from '@/lib/storage';

import { NO_ENTITLEMENT } from '../entitlement';
import { useMembershipStore } from '../membership';
import { previewStore } from '../purchases/preview';

/**
 * The paywall, rendered against the preview store. What it says about money
 * is tested in pricing.test.ts; this checks that the screen shows it, and
 * that each way a purchase can end is handled.
 */
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockParams: Record<string, string> = { placement: 'plan_preview' };

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
    Redirect: () => null,
  };
});

const events: [string, unknown][] = [];
let removeSink: () => void;

let client: QueryClient;
let view: Awaited<ReturnType<typeof render>> | undefined;

const open = async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  view = await render(
    <QueryClientProvider client={client}>
      <Paywall />
    </QueryClientProvider>,
  );
  // The store has answered: the terms are on screen.
  await waitFor(() => expect(screen.getByTestId('paywall-terms')).toBeTruthy());
};

beforeEach(() => {
  jest.clearAllMocks();
  storage.clearAll();
  previewStore.reset();
  mockParams = { placement: 'plan_preview' };
  events.length = 0;
  removeSink = addAnalyticsSink((name, properties) => events.push([name, properties]));
  useMembershipStore.setState({ entitlement: NO_ENTITLEMENT, agreed: null });
  useAccountStore.setState({ account: null });
  useReminderStore.setState({ enabled: false, asked: false });
  useFlagStore.setState({ flags: { paywall_variant: undefined } });
});

afterEach(async () => {
  removeSink();
  // Unmount, then drop the cached queries and the toast, so no timer outlives the test.
  await view?.unmount();
  view = undefined;
  client?.clear();
  toast.hide();
});

describe('the paywall', () => {
  it('shows the close button, the plans, the button and the exact terms', async () => {
    await open();

    expect(screen.getByTestId('paywall-close')).toBeTruthy();
    expect(screen.getByText('Your plan is ready. Start your free week.')).toBeTruthy();
    expect(screen.getByText('Start 7-day free trial')).toBeTruthy();
    expect(screen.getByTestId('paywall-terms').props.children).toBe(
      '7 days free, then $44.99 every 3 months. Cancel any time in Settings at least 24 hours before renewal.',
    );
    expect(screen.getByTestId('paywall-timeline').props.accessibilityLabel).toBe(
      'Today: full access. Day 5: we remind you. Day 7: trial ends',
    );
    expect(screen.getByText('Terms')).toBeTruthy();
    expect(screen.getByText('Privacy')).toBeTruthy();
    expect(screen.getByText('Restore purchases')).toBeTruthy();
  });

  it('pre-selects quarterly, and reports the placement and variant', async () => {
    await open();
    expect(screen.getByTestId('paywall-plan-quarterly')).toBeChecked();
    expect(screen.getByTestId('paywall-plan-annual')).not.toBeChecked();
    expect(events).toContainEqual([
      'paywall_viewed',
      { placement: 'plan_preview', variant: 'quarterly' },
    ]);
  });

  it('pre-selects yearly when the flag says so', async () => {
    useFlagStore.setState({ flags: { paywall_variant: 'annual' } });
    await open();
    expect(screen.getByTestId('paywall-plan-annual')).toBeChecked();
    expect(screen.getByTestId('paywall-terms').props.children).toContain('then $89.99 a year.');
    expect(events).toContainEqual([
      'paywall_viewed',
      { placement: 'plan_preview', variant: 'annual' },
    ]);
  });

  it('changes the terms with the plan she picks', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('paywall-plan-monthly'));
    expect(screen.getByTestId('paywall-terms').props.children).toContain('then $17.99 a month.');
    expect(events).toContainEqual(['plan_selected', { product: 'pilatrain_monthly' }]);
  });

  it('says Subscribe, and nothing about free, when she cannot have the trial', async () => {
    previewStore.setEligible(false);
    await open();

    expect(screen.getByText('Subscribe')).toBeTruthy();
    expect(screen.getByText('Your plan is ready.')).toBeTruthy();
    expect(screen.queryByTestId('paywall-timeline')).toBeNull();
    expect(screen.queryByText(/free/i)).toBeNull();
    expect(screen.queryByText(/trial/i)).toBeNull();
  });

  it('starts the trial and moves on to the account screen', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('paywall-cta'));

    await waitFor(() => expect(useMembershipStore.getState().entitlement.active).toBe(true));
    expect(events).toContainEqual(['trial_started', { product: 'pilatrain_quarterly' }]);
    // The price she agreed to is kept, as the store wrote it.
    expect(useMembershipStore.getState().agreed).toEqual({
      productId: 'pilatrain_quarterly',
      price: '$44.99',
    });
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/create-account',
      params: { then: 'continue' },
    });
  });

  it('reports a purchase with no trial as a subscription, not a trial', async () => {
    previewStore.setEligible(false);
    await open();
    await fireEvent.press(screen.getByTestId('paywall-cta'));
    await waitFor(() => expect(useMembershipStore.getState().entitlement.active).toBe(true));
    expect(events).toContainEqual(['subscription_started', { product: 'pilatrain_quarterly' }]);
    expect(events.map(([name]) => name)).not.toContain('trial_started');
  });

  it.each([
    ['cancelled', 'purchase_cancelled', undefined],
    ['failed', 'purchase_failed', { reason: 'store_problem' }],
  ] as const)('stays put when the purchase is %s', async (outcome, event, properties) => {
    previewStore.setOutcome(outcome);
    await open();
    await fireEvent.press(screen.getByTestId('paywall-cta'));

    await waitFor(() => expect(events).toContainEqual([event, properties]));
    expect(useMembershipStore.getState().entitlement.active).toBe(false);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('waits, without unlocking anything, when the purchase needs approval', async () => {
    previewStore.setOutcome('pending');
    await open();
    await fireEvent.press(screen.getByTestId('paywall-cta'));
    await waitFor(() => expect(screen.getByTestId('paywall-cta')).toBeEnabled());
    expect(useMembershipStore.getState().entitlement.active).toBe(false);
    expect(events.map(([name]) => name)).not.toContain('trial_started');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('closes back to where she was', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('paywall-close'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('after the free class, closing moves her on instead', async () => {
    mockParams = { placement: 'after_free_class', then: 'continue' };
    await open();
    await fireEvent.press(screen.getByTestId('paywall-close'));
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/create-account',
      params: { then: 'continue' },
    });
  });

  it('restores a membership she already has', async () => {
    await open();
    previewStore.setMembership('active');
    useMembershipStore.setState({ entitlement: NO_ENTITLEMENT });
    await fireEvent.press(screen.getByTestId('paywall-restore'));
    await waitFor(() => expect(useMembershipStore.getState().entitlement.active).toBe(true));
  });
});
