import { Platform } from 'react-native';

import { env } from '@/config/env';

/** Where a class's video comes from. */
export type VideoSourceInfo = {
  uri: string;
  /** True while the class has no video of its own and the one sample plays instead. */
  isSample: boolean;
};

/**
 * The video for a class. A class with a Mux playback ID plays its own
 * adaptive stream. Until the real classes exist, every class plays the one
 * sample video.
 *
 * TODO(milestone 4): member classes are served with signed Mux tokens, checked
 * on the server. Until then playback IDs are assumed to be public.
 */
export function videoSourceFor(cls: { muxPlaybackId: string | null }): VideoSourceInfo {
  if (cls.muxPlaybackId) {
    return { uri: `https://stream.mux.com/${cls.muxPlaybackId}.m3u8`, isSample: false };
  }
  // The web preview cannot play HLS, so it gets a short MP4.
  return {
    uri: Platform.OS === 'web' ? env.sampleVideoWebUrl : env.sampleVideoUrl,
    isSample: true,
  };
}
