import type { ClassInfo } from '@engine';

export type { StoredPlan, StoredSession } from '@shared/plan-service';

/** A class as the screens need it: what the engine knows, plus what she sees. */
export type ClassDetails = ClassInfo & {
  title: string;
  instructorId: string;
  /** 4:5. `null` until the photography exists; a labelled Sand block is shown instead. */
  thumbnailUrl: string | null;
  muxPlaybackId: string | null;
  captionsUrl: string | null;
  chapters: { title: string; startSec: number }[];
  easierOptions: { chapter: string; text: string }[];
  /** The one class anyone can take without a membership. */
  isFree: boolean;
};
