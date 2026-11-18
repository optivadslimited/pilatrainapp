import type { SubtitleTrack, VideoPlayer } from 'expo-video';

/**
 * The video player is a native object, driven by setting its properties. It
 * is not React state, so these small functions are where that happens: the
 * player screen calls them from event handlers and effects.
 */

/** Jump to a position, in seconds. */
export function seekTo(player: VideoPlayer, seconds: number): void {
  player.currentTime = Math.max(0, seconds);
}

/** Show a caption track, or none. */
export function setCaptions(player: VideoPlayer, track: SubtitleTrack | null): void {
  player.subtitleTrack = track;
}

/** The caption track to show by default: English if the video has it, otherwise its first. */
export function defaultCaptionTrack(tracks: readonly SubtitleTrack[]): SubtitleTrack | null {
  return (
    tracks.find((track) => track.language?.toLowerCase().startsWith('en')) ?? tracks[0] ?? null
  );
}
