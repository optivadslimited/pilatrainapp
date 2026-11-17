import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * On-device storage (MMKV). Synchronous, so persisted state is available on
 * the first frame and the launch screen can route without waiting.
 *
 * Health answers from the quiz are held here until they are sent to our own
 * database. They are never passed to analytics or any third party.
 */
export const storage = createMMKV({ id: 'pilatrain' });

/** Adapter so Zustand's `persist` middleware can write to MMKV. */
export const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};
