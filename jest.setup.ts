/* eslint-env jest */
// Runs before every test file. Native modules are replaced with stand-ins;
// everything else (stores, flow, formatting, screens) runs for real.

// Haptics are a native call; tests only care that the right one was asked for.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

// MMKV is native. Tests use the in-memory stand-in that the library ships.
jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = jest.requireActual('react-native-mmkv/lib/createMMKV/createMockMMKV');
  return { createMMKV: () => createMockMMKV() };
});

// Gesture Handler wires itself to the UI thread on import, and there is no UI
// thread in Jest. Only the pieces the app uses are stood in for.
jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: { children: unknown }) => children,
    usePanGesture: () => ({}),
  };
});

// SF Symbols are drawn natively; a plain element is enough for tests.
jest.mock('expo-symbols', () => ({ SymbolView: 'SymbolView' }));

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// Reanimated runs in its JavaScript mode under Jest (see `resolver` in package.json).
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('react-native-reanimated').setUpTests();
