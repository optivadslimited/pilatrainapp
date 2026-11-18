import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

/**
 * Whether she wants a reminder on her Pilates days. Off until she says yes
 * on the reminder screen; she can change her mind on the You tab.
 */
type ReminderState = {
  /** She said yes, and the system has allowed it. */
  enabled: boolean;
  /** She has seen our reminder screen, so it is not shown again. */
  asked: boolean;
  setEnabled: (enabled: boolean) => void;
  markAsked: () => void;
  reset: () => void;
};

export const useReminderStore = create<ReminderState>()(
  persist(
    (set) => ({
      enabled: false,
      asked: false,
      setEnabled: (enabled) => set({ enabled, asked: true }),
      markAsked: () => set({ asked: true }),
      reset: () => set({ enabled: false, asked: false }),
    }),
    { name: 'reminders', storage: createJSONStorage(() => zustandStorage) },
  ),
);
