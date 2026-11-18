import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { create } from 'zustand';

/**
 * Whether the phone has a connection. Screens use it to say so plainly
 * ("You're offline") instead of showing a spinner that never ends, and
 * TanStack Query uses it to hold requests until the connection is back.
 */
type OnlineState = {
  online: boolean;
  /** Development only: pretend there is no connection. */
  pretendOffline: boolean;
  setOnline: (online: boolean) => void;
  setPretendOffline: (value: boolean) => void;
};

export const useOnlineStore = create<OnlineState>((set) => ({
  online: true,
  pretendOffline: false,
  setOnline: (online) => set({ online }),
  setPretendOffline: (value) => set({ pretendOffline: __DEV__ && value }),
}));

/** `false` only when we know there is no connection. Unknown counts as online. */
export function useOnline(): boolean {
  return useOnlineStore((state) => state.online && !state.pretendOffline);
}

let watching = false;

/** Start following the connection. Called once at launch. */
export function watchConnection(): void {
  if (watching || Platform.OS === 'web') return;
  watching = true;

  const apply = (state: Network.NetworkState) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    useOnlineStore.getState().setOnline(online);
    onlineManager.setOnline(online);
  };

  Network.getNetworkStateAsync()
    .then(apply)
    .catch(() => {});
  Network.addNetworkStateListener(apply);
}
