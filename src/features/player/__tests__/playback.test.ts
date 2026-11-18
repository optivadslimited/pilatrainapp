import {
  chapterIndexAt,
  fitChapters,
  needsCloseConfirmation,
  percentAt,
  ProgressTracker,
  resumeFrom,
} from '../playback';

const TEN_MINUTES = 600;

/** Play from `from` to `to` seconds, ticking twice a second, and collect what the tracker reports. */
function play(
  tracker: ProgressTracker,
  from: number,
  to: number,
  duration = TEN_MINUTES,
  startMs = 0,
) {
  const milestones: number[] = [];
  let completions = 0;
  let saves = 0;
  for (let position = from, tick = 0; position <= to; position += 0.5, tick++) {
    const update = tracker.update(position, duration, startMs + tick * 500);
    milestones.push(...update.milestones);
    if (update.completed) completions++;
    if (update.save) saves++;
  }
  return { milestones, completions, saves };
}

describe('how far through', () => {
  it('is a percentage of the video', () => {
    expect(percentAt(0, 600)).toBe(0);
    expect(percentAt(150, 600)).toBe(25);
    expect(percentAt(600, 600)).toBe(100);
    expect(percentAt(700, 600)).toBe(100);
  });

  it('is zero until the video has a length', () => {
    expect(percentAt(30, 0)).toBe(0);
    expect(percentAt(30, NaN)).toBe(0);
  });
});

describe('a class counts as completed at 90% watched', () => {
  it('completes at 90%, not before', () => {
    const tracker = new ProgressTracker();
    expect(play(tracker, 0, 539).completions).toBe(0);
    expect(tracker.isCompleted).toBe(false);
    expect(tracker.update(540, TEN_MINUTES, 999_999).completed).toBe(true);
    expect(tracker.isCompleted).toBe(true);
  });

  it('reports completion once, however long she keeps watching', () => {
    const tracker = new ProgressTracker();
    expect(play(tracker, 0, 600).completions).toBe(1);
  });

  it('does not un-complete if she scrubs back', () => {
    const tracker = new ProgressTracker();
    play(tracker, 0, 560);
    expect(tracker.update(30, TEN_MINUTES, 999_999).completed).toBe(false);
    expect(tracker.isCompleted).toBe(true);
    expect(tracker.percent).toBeGreaterThanOrEqual(90);
  });

  it('is already complete if she finished it in an earlier sitting', () => {
    const tracker = new ProgressTracker(95);
    expect(tracker.isCompleted).toBe(true);
    expect(play(tracker, 0, 600).completions).toBe(0);
  });
});

describe('progress milestones', () => {
  it('reports 25, 50 and 75 once each, in order', () => {
    const tracker = new ProgressTracker();
    expect(play(tracker, 0, 600).milestones).toEqual([25, 50, 75]);
  });

  it('reports every milestone a seek jumps over', () => {
    const tracker = new ProgressTracker();
    tracker.update(0, TEN_MINUTES, 0);
    expect(tracker.update(480, TEN_MINUTES, 500).milestones).toEqual([25, 50, 75]);
  });

  it('does not repeat milestones she passed in an earlier sitting', () => {
    const tracker = new ProgressTracker(60);
    expect(play(tracker, 0, 600).milestones).toEqual([75]);
  });

  it('does not repeat them when she rewinds and watches again', () => {
    const tracker = new ProgressTracker();
    play(tracker, 0, 320);
    expect(play(tracker, 100, 320).milestones).toEqual([]);
  });
});

describe('her place is saved every 5 seconds', () => {
  it('asks for a save every five seconds of clock time', () => {
    const tracker = new ProgressTracker();
    // 30 seconds of playback at two ticks a second.
    expect(play(tracker, 0, 30).saves).toBe(6);
  });

  it('does not ask on the first tick, or more often than that', () => {
    const tracker = new ProgressTracker();
    expect(tracker.update(0, TEN_MINUTES, 0).save).toBe(false);
    expect(tracker.update(1, TEN_MINUTES, 4_999).save).toBe(false);
    expect(tracker.update(2, TEN_MINUTES, 5_000).save).toBe(true);
    expect(tracker.update(3, TEN_MINUTES, 5_400).save).toBe(false);
    expect(tracker.update(4, TEN_MINUTES, 10_000).save).toBe(true);
  });
});

describe('resuming', () => {
  it('starts where she left off', () => {
    expect(resumeFrom({ positionSec: 245, percent: 41 })).toBe(245);
  });

  it('starts from the top if she had barely begun', () => {
    expect(resumeFrom({ positionSec: 3, percent: 1 })).toBe(0);
    expect(resumeFrom(null)).toBe(0);
    expect(resumeFrom(undefined)).toBe(0);
  });

  it('starts from the top if she had already finished it', () => {
    expect(resumeFrom({ positionSec: 570, percent: 95 })).toBe(0);
    expect(resumeFrom({ positionSec: 540, percent: 90 })).toBe(0);
  });
});

describe('closing', () => {
  it('counts time actually played, not time skipped', () => {
    const tracker = new ProgressTracker();
    play(tracker, 0, 20);
    expect(tracker.watchedSec).toBeCloseTo(20, 5);
    // A jump forward five minutes adds nothing.
    tracker.update(320, TEN_MINUTES, 50_000);
    expect(tracker.watchedSec).toBeCloseTo(20, 5);
    // Nor does scrubbing back.
    tracker.update(100, TEN_MINUTES, 51_000);
    expect(tracker.watchedSec).toBeCloseTo(20, 5);
  });

  it('asks for confirmation after more than 30 seconds of a class', () => {
    expect(needsCloseConfirmation(0, false)).toBe(false);
    expect(needsCloseConfirmation(30, false)).toBe(false);
    expect(needsCloseConfirmation(31, false)).toBe(true);
  });

  it('never asks once the class counts as done', () => {
    expect(needsCloseConfirmation(500, true)).toBe(false);
  });
});

describe('chapters', () => {
  const chapters = [
    { title: 'Warm-up', startSec: 0 },
    { title: 'Main', startSec: 120 },
    { title: 'Cool-down', startSec: 510 },
  ];

  it('finds the chapter that is playing', () => {
    expect(chapterIndexAt(chapters, 0)).toBe(0);
    expect(chapterIndexAt(chapters, 119)).toBe(0);
    expect(chapterIndexAt(chapters, 120)).toBe(1);
    expect(chapterIndexAt(chapters, 509.9)).toBe(1);
    expect(chapterIndexAt(chapters, 599)).toBe(2);
    expect(chapterIndexAt([], 50)).toBe(0);
  });

  it('keeps a class’s own chapter times when the video is the class’s own', () => {
    expect(fitChapters(chapters, 600, 600)).toEqual(chapters);
    expect(fitChapters(chapters, 600, 600.4)).toEqual(chapters);
  });

  it('scales them to a sample video of a different length', () => {
    // A 20-minute class's times on a 5-minute sample.
    const twenty = [
      { title: 'Warm-up', startSec: 0 },
      { title: 'Main', startSec: 180 },
      { title: 'Cool-down', startSec: 1050 },
    ];
    expect(fitChapters(twenty, 1200, 300).map((chapter) => chapter.startSec)).toEqual([0, 45, 263]);
  });

  it('leaves them alone until the video’s length is known', () => {
    expect(fitChapters(chapters, 600, 0)).toEqual(chapters);
    expect(fitChapters(chapters, 600, NaN)).toEqual(chapters);
  });
});
