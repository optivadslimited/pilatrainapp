/**
 * The Adjust wiring, run against a stand-in for the SDK. This checks what the
 * app asks Adjust to do. It does not check Adjust itself: that needs a device.
 */
type Listener = (value: number) => void;

const mockAdjust = {
  initSdk: jest.fn(),
  trackEvent: jest.fn(),
  getAdid: jest.fn((callback: (adid: string | null) => void) => callback('ADID')),
  addGlobalCallbackParameter: jest.fn(),
  removeGlobalCallbackParameter: jest.fn(),
  getAppTrackingAuthorizationStatus: jest.fn((callback: Listener) => callback(0)),
  requestAppTrackingAuthorization: jest.fn((handler: Listener) => handler(3)),
};

class MockAdjustConfig {
  static EnvironmentSandbox = 'sandbox';
  static EnvironmentProduction = 'production';
  static LogLevelInfo = 'INFO';
  static LogLevelSuppress = 'SUPPRESS';
  constructor(
    public appToken: string,
    public environment: string,
  ) {}
  setLogLevel() {}
}

class MockAdjustEvent {
  callbackParameters: Record<string, string> = {};
  partnerParameters: Record<string, string> = {};
  constructor(public eventToken: string) {}
  addCallbackParameter(key: string, value: string) {
    this.callbackParameters[key] = value;
  }
  addPartnerParameter(key: string, value: string) {
    this.partnerParameters[key] = value;
  }
}

jest.mock('react-native-adjust', () => ({
  Adjust: mockAdjust,
  AdjustConfig: MockAdjustConfig,
  AdjustEvent: MockAdjustEvent,
}));

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

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV };
});

afterAll(() => {
  process.env = ENV;
});

describe('with no Adjust app token', () => {
  it('starts nothing, sends nothing and never asks to track', async () => {
    const { attribution, analytics } = load();
    const onId = jest.fn();

    expect(attribution.attributionConfigured).toBe(false);
    attribution.startAttribution(onId);
    analytics.track('trial_started', { product: 'pilatrain_quarterly' });
    await attribution.askToTrack();

    expect(mockAdjust.initSdk).not.toHaveBeenCalled();
    expect(mockAdjust.trackEvent).not.toHaveBeenCalled();
    expect(mockAdjust.requestAppTrackingAuthorization).not.toHaveBeenCalled();
    expect(onId).not.toHaveBeenCalled();
  });
});

describe('with Adjust switched on', () => {
  const start = (extra: Record<string, string> = {}) => {
    Object.assign(process.env, {
      EXPO_PUBLIC_ADJUST_APP_TOKEN: 'APPTOKEN',
      EXPO_PUBLIC_ADJUST_TRIAL_EVENT_TOKEN: 'TRIAL1',
      EXPO_PUBLIC_ADJUST_PURCHASE_EVENT_TOKEN: 'PURCH1',
      ...extra,
    });
    const loaded = load();
    const onId = jest.fn();
    loaded.attribution.startAttribution(onId);
    return { ...loaded, onId };
  };

  it('starts the SDK in the sandbox outside production, and once only', () => {
    const { attribution, onId } = start();
    expect(mockAdjust.initSdk).toHaveBeenCalledTimes(1);
    expect(mockAdjust.initSdk.mock.calls[0][0]).toMatchObject({
      appToken: 'APPTOKEN',
      environment: 'sandbox',
    });
    // Adjust's ID is handed on, for RevenueCat.
    expect(onId).toHaveBeenCalledWith('ADID');

    attribution.startAttribution(onId);
    expect(mockAdjust.initSdk).toHaveBeenCalledTimes(1);
  });

  it('reports to production in a production build', () => {
    start({ EXPO_PUBLIC_APP_ENV: 'production' });
    expect(mockAdjust.initSdk.mock.calls[0][0]).toMatchObject({ environment: 'production' });
  });

  it('sends a trial start and a purchase, each with its own token and the product', () => {
    const { analytics } = start();
    analytics.track('trial_started', { product: 'pilatrain_quarterly' });
    analytics.track('subscription_started', { product: 'pilatrain_monthly' });

    expect(mockAdjust.trackEvent.mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({
        eventToken: 'TRIAL1',
        callbackParameters: { product: 'pilatrain_quarterly' },
      }),
      expect.objectContaining({
        eventToken: 'PURCH1',
        callbackParameters: { product: 'pilatrain_monthly' },
      }),
    ]);
  });

  it('passes nothing on to ad networks beyond the event itself', () => {
    const { analytics } = start();
    analytics.track('trial_started', { product: 'pilatrain_quarterly' });
    expect(mockAdjust.trackEvent.mock.calls[0][0].partnerParameters).toEqual({});
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
    expect(mockAdjust.trackEvent).not.toHaveBeenCalled();
  });

  it('leaves out an event whose token has not been set', () => {
    const { analytics } = start({ EXPO_PUBLIC_ADJUST_PURCHASE_EVENT_TOKEN: '' });
    analytics.track('subscription_started', { product: 'pilatrain_monthly' });
    expect(mockAdjust.trackEvent).not.toHaveBeenCalled();
    analytics.track('trial_started', { product: 'pilatrain_quarterly' });
    expect(mockAdjust.trackEvent).toHaveBeenCalledTimes(1);
  });

  it('attaches her user ID, and replaces it when she changes', () => {
    const { attribution } = start();
    attribution.identifyForAttribution('user-1');
    expect(mockAdjust.addGlobalCallbackParameter).toHaveBeenCalledWith('user_id', 'user-1');

    attribution.identifyForAttribution(null);
    expect(mockAdjust.removeGlobalCallbackParameter).toHaveBeenCalledTimes(2);
    expect(mockAdjust.addGlobalCallbackParameter).toHaveBeenCalledTimes(1);
  });

  it('asks to track only if she has never been asked', async () => {
    const { attribution } = start();
    await attribution.askToTrack();
    expect(mockAdjust.requestAppTrackingAuthorization).toHaveBeenCalledTimes(1);

    // Already answered (3 is "authorised", 2 is "denied"): no second prompt.
    for (const status of [1, 2, 3]) {
      mockAdjust.requestAppTrackingAuthorization.mockClear();
      mockAdjust.getAppTrackingAuthorizationStatus.mockImplementationOnce((callback: Listener) =>
        callback(status),
      );
      await attribution.askToTrack();
      expect(mockAdjust.requestAppTrackingAuthorization).not.toHaveBeenCalled();
    }
  });

  it('never leaves the screen waiting if the status does not come back', async () => {
    jest.useFakeTimers();
    const { attribution } = start();
    mockAdjust.getAppTrackingAuthorizationStatus.mockImplementationOnce(() => {});
    let settled = false;
    const asked = attribution.askToTrack().then(() => {
      settled = true;
    });
    jest.advanceTimersByTime(1500);
    await asked;
    expect(settled).toBe(true);
    expect(mockAdjust.requestAppTrackingAuthorization).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
