import { create } from 'zustand';

/**
 * Whether she is a member.
 *
 * TODO(milestone 4): this becomes RevenueCat's `member` entitlement. Until the
 * paywall exists everyone is treated as a member, so the plan can be used end
 * to end. The locked states are already built: in a development build,
 * You → Developer → "Preview as a non-member" shows them.
 */
type MembershipState = {
  previewNonMember: boolean;
  setPreviewNonMember: (value: boolean) => void;
};

export const useMembershipStore = create<MembershipState>((set) => ({
  previewNonMember: false,
  setPreviewNonMember: (value) => set({ previewNonMember: __DEV__ && value }),
}));

export function useMembership(): { isMember: boolean } {
  const previewNonMember = useMembershipStore((state) => state.previewNonMember);
  return { isMember: !previewNonMember };
}

/** A class can be played by a member, or by anyone if it is the free class. */
export const canPlay = (cls: { isFree: boolean }, isMember: boolean) => isMember || cls.isFree;
