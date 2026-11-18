import { create } from 'zustand';

/**
 * Feature flags. PostHog owns the values (src/lib/posthog.ts fills this in
 * when they load); screens read them from here, so a screen never waits on
 * the network and works the same with analytics switched off.
 */
export type Flags = {
  /** Which plan is pre-selected on the paywall: 'quarterly' (default) or 'annual'. */
  paywall_variant: string | boolean | undefined;
};

type FlagState = {
  flags: Flags;
  setFlags: (flags: Partial<Flags>) => void;
};

export const useFlagStore = create<FlagState>((set) => ({
  flags: { paywall_variant: undefined },
  setFlags: (flags) => set((state) => ({ flags: { ...state.flags, ...flags } })),
}));

export const useFlag = <K extends keyof Flags>(key: K): Flags[K] =>
  useFlagStore((state) => state.flags[key]);
