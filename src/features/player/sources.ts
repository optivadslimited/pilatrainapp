import { signedStreamUrl } from '@shared/billing/mux';
import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { supabase } from '@/lib/supabase';

/** Where a class's video comes from. */
export type VideoSourceInfo = {
  uri: string;
  /** True while the class has no video of its own and the one sample plays instead. */
  isSample: boolean;
};

/** The server would not hand over the video: she needs a membership for this class. */
export class MembershipRequiredError extends Error {
  constructor() {
    super('membership_required');
    this.name = 'MembershipRequiredError';
  }
}

/** The one sample video that stands in for every class until the real ones exist. */
export function sampleSource(): VideoSourceInfo {
  // The web preview cannot play HLS, so it gets a short MP4.
  return {
    uri: Platform.OS === 'web' ? env.sampleVideoWebUrl : env.sampleVideoUrl,
    isSample: true,
  };
}

/**
 * The video for a class.
 *
 * A class with a Mux playback ID plays its own adaptive stream, and that
 * stream is signed: the address only works with a short-lived token from the
 * `playback-token` function, which checks on the server that she may watch
 * it. What the app shows as locked is a courtesy; that check is the lock.
 *
 * Until the real classes exist, every class plays the one sample video.
 *
 * NOT YET RUN: needs a Supabase project, the deployed function and a class on
 * Mux with a signed playback policy.
 */
export async function playbackSourceFor(cls: {
  id: string;
  muxPlaybackId: string | null;
}): Promise<VideoSourceInfo> {
  if (!cls.muxPlaybackId) return sampleSource();

  // Local mode (development, no backend): the playback ID is assumed public.
  if (!supabase) {
    return { uri: `https://stream.mux.com/${cls.muxPlaybackId}.m3u8`, isSample: false };
  }

  const { data, error } = await supabase.functions.invoke<{
    playbackId: string | null;
    token?: string;
  }>('playback-token', { body: { classId: cls.id } });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 403) throw new MembershipRequiredError();
    throw error;
  }
  if (!data?.playbackId || !data.token) return sampleSource();
  return { uri: signedStreamUrl(data.playbackId, data.token), isSample: false };
}

/** A token lasts six hours; a new one is fetched well before that. */
const FRESH_FOR = 4 * 60 * 60_000;

export function usePlaybackSource(cls: { id: string; muxPlaybackId: string | null }) {
  const needsToken = Boolean(cls.muxPlaybackId);
  const query = useQuery({
    queryKey: ['playback', cls.id, cls.muxPlaybackId],
    queryFn: () => playbackSourceFor(cls),
    enabled: needsToken,
    staleTime: FRESH_FOR,
    gcTime: FRESH_FOR,
    // A refusal is an answer, not a failure: asking again will not change it.
    retry: (count, error) => !(error instanceof MembershipRequiredError) && count < 2,
    // A signed address is never written to the phone.
    meta: { persist: false },
  });

  return {
    media: needsToken ? (query.data ?? null) : sampleSource(),
    refused: query.error instanceof MembershipRequiredError,
    failed: query.isError && !(query.error instanceof MembershipRequiredError),
    retry: () => query.refetch(),
  };
}
