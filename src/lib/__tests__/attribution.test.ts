/**
 * The AppsFlyer wiring, run against stand-ins for the SDK and for Apple's
 * tracking prompt. This checks what the app asks AppsFlyer to do. It does not
 * check AppsFlyer itself: that needs a device and an AppsFlyer app.
 */
const mockAppsFlyer = {
  init: jest.fn(() => Promise.resolve()),
  enableDebug: jest.fn(() => Promise.resolve()),
  registerSessionReadyListener: jest.fn((onReady: () => void) => {
    onReady();
    return Promise.resolve();
  }),
  start: jest.fn(() => Promise.resolve()),
  getAppsFlyerUID: jest.fn(() => Promise.resolve('AFUID')),
  logEvent: jest.fn((_params: { eventName: string; eventValues?: Record<string, unknown> }) =>
    Promise.resolve(),
  ),
  setCustomerUserId: jest.fn((_params: { customerId: string }) => Promise.resolve()),
};

jest.mock('react-native-appsflyer', () => ({ __esModule: true, default: mockAppsFlyer }));

type Status = 'granted' | 'denied' | 'undetermined';

const mockTracking = {
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getTrackingPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' as Status })),
  requestTrackingPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' as Status })),
};

jest.mock('expo-tracking-transparency', () => mockTracking);

const ENV = { ...process.env };

/** A fresh copy of the modules, read with the environment as it is now. */
function load() {
  let loaded!: {
    attribution: typeof import('../attribution');
    analytics: typeof import('../analytics');
  };
  jest.isolateModules(() => {
    loaded = {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      attribution: require('../attribution'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      analytics: require('../analytics'),
    };
  });
  return loaded;
}

/** Lets the SDK's promise chain (start, then the ID) run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV };
});

afterAll(() => {
  process.env = ENV;
});

describe('without the AppsFlyer dev key and app ID', () => {
  it.each([
    ['neither', {}],
    ['only the dev key', { EXPO_PUBLIC_APPSFLYER_DEV_KEY: 'DEVKEY' }],
    ['only the app ID', { EXPO_PUBLIC_APPSFLYER_APP_ID: '1234567890' }],
  ])('with %s, starts nothing, sends nothing and never asks to track', async (_, extra) => {
    Object.assign(process.env, extra);
    const { attribution, analytics } = load();
    const onId = jest.fn();

    expect(attribution.attributionConfigured).toBe(false);
    attribution.startAttribution(onId);
    analytics.track('trial_started', { product: 'pilatrain_quarterly' });
    await attribution.askToTrack();
    await settle();

    expect(mockAppsFlyer.init).not.toHaveBeenCalled();
    expect(mockAppsFlyer.logEvent).not.toHaveBeenCalled();
    expect(mockTracking.requestTrackingPermissionsAsync).not.toHaveBeenCalled();
    expect(onId).not.toHaveBeenCalled();
  });
});

describe('with AppsFlyer switched on', () => {
  const start = () => {
    Object.assign(process.env, {
      EXPO_PUBLIC_APPSFLYER_DEV_KEY: 'DEVKEY',
      EXPO_PUBLIC_APPSFLYER_APP_ID: '1234567890',
    });
    const loaded = load();
    const onId = jest.fn();
    loaded.attribution.startAttribution(onId);
    return { ...loaded, onId };
  };

  it('initialises with the dev key and app ID, starts when the session is ready, and once only', async () => {
    const { attribution, onId } = start();
    expect(mockAppsFlyer.init).toHaveBeenCalledTimes(1);
    expect(mockAppsFlyer.init).toHaveBeenCalledWith({ devKey: 'DEVKEY', appId: '1234567890' });
    expect(mockAppsFlyer.registerSessionReadyListener).toHaveBeenCalledTimes(1);
    expect(mockAppsFlyer.start).toHaveBeenCalledTimes(1);

    // AppsFlyer's ID is handed on, for RevenueCat.
    await settle();
    expect(onId).toHaveBeenCalledWith('AFUID');

    attribution.startAttribution(onId);
    expect(mockAppsFlyer.init).toHaveBeenCalledTimes(1);
  });

  it('sends a trial start and a purchase under AppsFlyer’s own names, with the product only', () => {
    const { analytics } = start();
    analytics.track('trial_started', { product: 'pilatrain_quarterly' });
    analytics.track('subscription_started', { product: 'pilatrain_monthly' });

    expect(mockAppsFlyer.logEvent.mock.calls.map(([params]) => params)).toEqual([
      { eventName: 'af_start_trial', eventValues: { af_content_id: 'pilatrain_quarterly' } },
      { eventName: 'af_subscribe', eventValues: { af_content_id: 'pilatrain_monthly' } },
    ]);
  });

  it('sends nothing else, whatever happens in the app', () => {
    const { analytics } = start();
    analytics.track('app_opened');
    analytics.track('quiz_step_completed', { step: 'work_around', answer: true });
    analytics.track('safety_gate_choice', { choice: 'cleared' });
    analytics.track('plan_built', { days: 3, minutes: 20, goal: 'posture' });
    analytics.track('paywall_viewed', { placement: 'plan_preview', variant: 'quarterly' });
    analytics.track('class_completed', { class: 'start-here' });
    analytics.track('account_created', { method: 'apple' });
    expect(mockAppsFlyer.logEvent).not.toHaveBeenCalled();
  });

  it('never passes on more than the product, even if an event carries more', () => {
    const { analytics } = start();
    // The event types forbid this; the rule must hold even if they are got round.
    const extra = { product: 'pilatrain_quarterly', goal: 'posture' } as unknown as {
      product: string;
    };
    analytics.track('trial_started', extra);
    expect(mockAppsFlyer.logEvent.mock.calls[0][0].eventValues).toEqual({
      af_content_id: 'pilatrain_quarterly',
    });
  });

  it('sets her user ID as the customer user ID, and clears it when she has none', () => {
    const { attribution } = start();
    attribution.identifyForAttribution('user-1');
    expect(mockAppsFlyer.setCustomerUserId).toHaveBeenLastCalledWith({ customerId: 'user-1' });

    attribution.identifyForAttribution(null);
    expect(mockAppsFlyer.setCustomerUserId).toHaveBeenLastCalledWith({ customerId: '' });
  });

  it('asks to track only if she has never been asked', async () => {
    const { attribution } = start();
    await attribution.askToTrack();
    expect(mockTracking.requestTrackingPermissionsAsync).toHaveBeenCalledTimes(1);

    for (const status of ['granted', 'denied'] as Status[]) {
      mockTracking.requestTrackingPermissionsAsync.mockClear();
      mockTracking.getTrackingPermissionsAsync.mockImplementationOnce(() =>
        Promise.resolve({ status }),
      );
      await attribution.askToTrack();
      expect(mockTracking.requestTrackingPermissionsAsync).not.toHaveBeenCalled();
    }
  });

  it('never leaves the screen waiting if the status does not come back', async () => {
    jest.useFakeTimers();
    const { attribution } = start();
    mockTracking.getTrackingPermissionsAsync.mockImplementationOnce(
      () => new Promise<{ status: Status }>(() => {}),
    );
    let settled = false;
    const asked = attribution.askToTrack().then(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(1500);
    await asked;
    expect(settled).toBe(true);
    expect(mockTracking.requestTrackingPermissionsAsync).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('carries on if the SDK’s own calls fail', async () => {
    mockAppsFlyer.init.mockImplementationOnce(() => Promise.reject(new Error('no network')));
    mockAppsFlyer.start.mockImplementationOnce(() => Promise.reject(new Error('no network')));
    const { analytics, onId } = start();
    await settle();
    expect(onId).not.toHaveBeenCalled();
    expect(() =>
      analytics.track('trial_started', { product: 'pilatrain_quarterly' }),
    ).not.toThrow();
  });
});
