/**
 * The player's rules, as plain code with no video in it, so they can be
 * tested: what counts as watched, when to save, where to resume, which
 * chapter she is in, and when closing needs a second thought.
 */

/** A class counts as completed at 90% watched. */
export const COMPLETE_AT_PERCENT = 90;
/** Her place is saved every 5 seconds. */
export const SAVE_EVERY_MS = 5000;
/** Closing after more than 30 seconds of a class asks for confirmation. */
export const CONFIRM_CLOSE_AFTER_SEC = 30;
/** Controls fade after 3 seconds without a touch. */
export const CONTROLS_IDLE_MS = 3000;
/** The points at which class_progress_25, _50 and _75 are sent. */
export const MILESTONES = [25, 50, 75] as const;
export type Milestone = (typeof MILESTONES)[number];

export type Chapter = { title: string; startSec: number };

export type SavedProgress = { positionSec: number; percent: number };

/** How far through the video `positionSec` is, from 0 to 100. */
export function percentAt(positionSec: number, durationSec: number): number {
  if (!(durationSec > 0) || !(positionSec > 0)) return 0;
  return Math.min(100, (positionSec / durationSec) * 100);
}

/** The chapter playing at `positionSec`: the last one that has started. */
export function chapterIndexAt(chapters: readonly Chapter[], positionSec: number): number {
  let index = 0;
  chapters.forEach((chapter, i) => {
    if (positionSec >= chapter.startSec) index = i;
  });
  return index;
}

/**
 * A class's chapter times are written for its own video. While every class
 * plays the one sample video, which is a different length, the times are
 * scaled to fit so the chapter marks and the easier options still line up.
 */
export function fitChapters(
  chapters: readonly Chapter[],
  classSeconds: number,
  videoSeconds: number,
): Chapter[] {
  if (!(videoSeconds > 0) || !(classSeconds > 0) || Math.abs(videoSeconds - classSeconds) < 1) {
    return chapters.map((chapter) => ({ ...chapter }));
  }
  const scale = videoSeconds / classSeconds;
  return chapters.map((chapter) => ({
    ...chapter,
    startSec: Math.round(chapter.startSec * scale),
  }));
}

/**
 * Where to start when she opens a class: where she left off, unless she had
 * barely begun or had already finished, in which case from the top.
 */
export function resumeFrom(saved: SavedProgress | null | undefined): number {
  if (!saved) return 0;
  if (saved.percent >= COMPLETE_AT_PERCENT || saved.positionSec < 5) return 0;
  return saved.positionSec;
}

/** Closing asks "are you sure?" only mid-class: not at the very start, and not once it counts as done. */
export function needsCloseConfirmation(watchedSec: number, completed: boolean): boolean {
  return !completed && watchedSec > CONFIRM_CLOSE_AFTER_SEC;
}

export type ProgressUpdate = {
  /** The furthest she has reached, 0 to 100. */
  percent: number;
  /** Milestones crossed by this update, each reported once per class. */
  milestones: Milestone[];
  /** True on the update that first takes her to 90%. */
  completed: boolean;
  /** True when 5 seconds have passed since her place was last saved. */
  save: boolean;
};

/**
 * Follows one class as it plays. Feed it the playback position a few times a
 * second; it says what has just happened. It never reports the same
 * milestone, or completion, twice.
 */
export class ProgressTracker {
  private furthest: number;
  private completed: boolean;
  private lastSavedAt: number | null = null;
  private lastPosition: number | null = null;
  private watched = 0;

  /** @param alreadyWatchedPercent Her saved progress, so milestones she passed before are not sent again. */
  constructor(alreadyWatchedPercent = 0) {
    this.furthest = Math.min(100, Math.max(0, alreadyWatchedPercent));
    this.completed = this.furthest >= COMPLETE_AT_PERCENT;
  }

  /** Seconds actually played in this sitting. Seeking does not count. */
  get watchedSec(): number {
    return this.watched;
  }

  get isCompleted(): boolean {
    return this.completed;
  }

  get percent(): number {
    return this.furthest;
  }

  update(positionSec: number, durationSec: number, nowMs: number): ProgressUpdate {
    // Time played: small forward steps only. A jump is a seek, not watching.
    if (this.lastPosition !== null) {
      const step = positionSec - this.lastPosition;
      if (step > 0 && step <= 2) this.watched += step;
    }
    this.lastPosition = positionSec;

    const before = this.furthest;
    this.furthest = Math.max(before, percentAt(positionSec, durationSec));

    const milestones = MILESTONES.filter((mark) => before < mark && this.furthest >= mark);
    const completed = !this.completed && this.furthest >= COMPLETE_AT_PERCENT;
    if (completed) this.completed = true;

    if (this.lastSavedAt === null) this.lastSavedAt = nowMs;
    const save = nowMs - this.lastSavedAt >= SAVE_EVERY_MS;
    if (save) this.lastSavedAt = nowMs;

    return { percent: this.furthest, milestones, completed, save };
  }
}
