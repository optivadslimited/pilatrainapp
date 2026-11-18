import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

import {
  isMember,
  membershipStatus,
  NO_ENTITLEMENT,
  type Entitlement,
  type MembershipStatus,
} from './entitlement';
import { purchases } from './purchases';

/**
 * Whether she is a member, and on what terms.
 *
 * The store is the source of truth: RevenueCat's `member` entitlement on a
 * phone, the preview store in development. What it last said is kept here,
 * on the device, so the app opens in the right state with no connection.
 */
type MembershipState = {
  entitlement: Entitlement;
  /**
   * The price shown to her when she subscribed, exactly as the store wrote
   * it. Kept so the trial-ending notice can quote the price back to her
   * without a network request.
   */
  agreed: { productId: string; price: string } | null;
  setEntitlement: (entitlement: Entitlement) => void;
  setAgreed: (agreed: MembershipState['agreed']) => void;
  reset: () => void;
};

export const useMembershipStore = create<MembershipState>()(
  persist(
    (set) => ({
      entitlement: NO_ENTITLEMENT,
      agreed: null,
      setEntitlement: (entitlement) => set({ entitlement }),
      setAgreed: (agreed) => set({ agreed }),
      reset: () => set({ entitlement: NO_ENTITLEMENT, agreed: null }),
    }),
    { name: 'membership', storage: createJSONStorage(() => zustandStorage) },
  ),
);

export function useMembership(): {
  isMember: boolean;
  status: MembershipStatus;
  entitlement: Entitlement;
} {
  const entitlement = useMembershipStore((state) => state.entitlement);
  return { isMember: isMember(entitlement), status: membershipStatus(entitlement), entitlement };
}

const changed = new Set<(entitlement: Entitlement) => void>();

/** Run something whenever her membership changes (the trial reminder uses this). */
export function onMembershipChange(listener: (entitlement: Entitlement) => void): () => void {
  changed.add(listener);
  return () => {
    changed.delete(listener);
  };
}

/** Record what the store says, wherever it came from. */
export function applyEntitlement(entitlement: Entitlement): void {
  useMembershipStore.getState().setEntitlement(entitlement);
  changed.forEach((listener) => listener(entitlement));
}

let started = false;

/**
 * Connect to the store. Called once at launch, after the session exists, so
 * RevenueCat's user ID is her Supabase user ID. Safe to call again.
 */
export async function startMembership(userId: string | null): Promise<void> {
  if (!started) {
    started = true;
    await purchases.start(userId);
    purchases.subscribe(applyEntitlement);
  }
  await refreshMembership();
}

/** Ask the store again. Keeps what we have if it cannot be reached. */
export async function refreshMembership(): Promise<void> {
  try {
    applyEntitlement(await purchases.entitlement());
  } catch {
    // Offline: the last known entitlement stands.
  }
}

/** She signed in to another account, signed out, or deleted her account. */
export async function switchMembershipUser(userId: string | null): Promise<void> {
  useMembershipStore.getState().reset();
  try {
    await purchases.setUser(userId);
  } catch {
    // The next refresh will try again.
  }
  await refreshMembership();
}
