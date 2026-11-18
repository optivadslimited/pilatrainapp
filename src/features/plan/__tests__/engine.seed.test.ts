import { execFileSync } from 'child_process';
import path from 'path';

import {
  buildPlan,
  diffDays,
  eligibleClasses,
  FOCUSES,
  GOALS,
  intensityCeiling,
  MINUTES,
  START_HERE_SLUG,
  WORK_AROUNDS,
  type Equipment,
  type Level,
  type RelaxedRule,
  type Weekday,
  type WorkAround,
} from '@engine';

import { lookup, profile, seedCatalogue, TUESDAY } from './fixtures';

/**
 * The sixteen placeholder classes. These tests are about the catalogue as
 * much as the engine: they say what a real tag sheet has to provide for the
 * plan rules to hold. See "What the class sheet must cover" in the README.
 */
const find = lookup(seedCatalogue);
const root = path.join(__dirname, '..', '..', '..', '..');

const DAY_SETS: Weekday[][] = [
  [1, 4],
  [1, 3, 5],
  [1, 2, 4, 6],
  [1, 2, 3, 5, 6],
];
const EQUIPMENT_SETS: Equipment[][] = [
  ['mat'],
  ['band'],
  ['ball', 'weights'],
  ['band', 'ball', 'weights'],
];
const CONDITIONS = WORK_AROUNDS.filter((item) => item !== 'none');
const WORK_AROUND_SETS: WorkAround[][] = [
  ['none'],
  ...CONDITIONS.map((item) => [item]),
  [...CONDITIONS],
];
const GATED: WorkAround[] = ['pregnant_postpartum', 'recent_injury_surgery'];

describe('the seed catalogue', () => {
  it('is in step with the class sheet', () => {
    // Fails if classes.csv was edited without running `npm run seed:build`.
    expect(() =>
      execFileSync('npx', ['tsx', 'scripts/build-seed.ts', '--check'], {
        cwd: root,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('holds sixteen classes with unique ids and slugs', () => {
    expect(seedCatalogue).toHaveLength(16);
    expect(new Set(seedCatalogue.map((item) => item.id)).size).toBe(16);
    expect(new Set(seedCatalogue.map((item) => item.slug)).size).toBe(16);
  });

  it('covers every level, length, focus and intensity', () => {
    const values = <T>(pick: (item: (typeof seedCatalogue)[number]) => T) =>
      new Set(seedCatalogue.map(pick));
    expect(values((item) => item.level)).toEqual(new Set([1, 2]));
    expect(values((item) => item.lengthMin)).toEqual(new Set(MINUTES));
    expect(values((item) => item.focus)).toEqual(new Set(FOCUSES));
    expect(values((item) => item.intensity)).toEqual(new Set([1, 2, 3]));
    expect(new Set(seedCatalogue.flatMap((item) => item.equipment))).toEqual(
      new Set(['mat', 'band', 'ball', 'weights']),
    );
  });

  it('has a "Start here" that suits everyone and is the free class', () => {
    const start = seedCatalogue.find((item) => item.slug === START_HERE_SLUG) as unknown as Record<
      string,
      unknown
    >;
    expect(start).toMatchObject({
      lengthMin: 10,
      level: 1,
      intensity: 1,
      equipment: ['mat'],
      unsuitableFor: [],
      isFree: true,
      published: true,
    });
    const free = (seedCatalogue as unknown as { isFree: boolean }[]).filter((item) => item.isFree);
    expect(free).toHaveLength(1);
  });

  it('gives the most restricted user something of every length', () => {
    // A beginner with just a mat who ticked everything on "work around".
    const everyone = eligibleClasses(
      seedCatalogue,
      profile({ level: 1, workAround: CONDITIONS, gentle: true }),
    );
    for (const minutes of MINUTES) {
      expect(everyone.filter((item) => item.lengthMin === minutes).length).toBeGreaterThanOrEqual(
        2,
      );
    }
    // And two short mobility classes, so the weekly close does not have to repeat one.
    expect(
      everyone.filter((item) => item.focus === 'mobility' && item.lengthMin === 10).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('chapters every class into warm-up, main and cool-down, each with an easier option', () => {
    for (const item of seedCatalogue as unknown as {
      lengthMin: number;
      chapters: { title: string; startSec: number }[];
      easierOptions: { chapter: string; text: string }[];
    }[]) {
      expect(item.chapters.map((chapter) => chapter.title)).toEqual([
        'Warm-up',
        'Main',
        'Cool-down',
      ]);
      expect(item.chapters[0].startSec).toBe(0);
      expect(item.chapters[2].startSec).toBeLessThan(item.lengthMin * 60);
      expect(item.easierOptions.map((option) => option.chapter)).toEqual([
        'Warm-up',
        'Main',
        'Cool-down',
      ]);
      for (const option of item.easierOptions) expect(option.text.length).toBeGreaterThan(0);
    }
  });
});

describe('plans built from the seed catalogue', () => {
  type Case = {
    relaxed: Set<RelaxedRule>;
    level: Level;
    minutes: number;
    days: number;
    unrestricted: boolean;
  };
  const cases: Case[] = [];

  it('builds a full, safe plan for every combination of answers', () => {
    for (const goal of GOALS) {
      for (const level of [1, 2] as Level[]) {
        for (const minutes of MINUTES) {
          for (const weekdays of DAY_SETS) {
            for (const equipment of EQUIPMENT_SETS) {
              for (const workAround of WORK_AROUND_SETS) {
                const gentle = workAround.some((item) => GATED.includes(item));
                const p = profile({
                  goal,
                  level,
                  minutes,
                  weekdays,
                  equipment,
                  workAround,
                  gentle,
                });
                const plan = buildPlan({ profile: p, catalogue: seedCatalogue, from: TUESDAY });
                const allowed = new Set(eligibleClasses(seedCatalogue, p).map((item) => item.id));

                // A session on every one of her days.
                expect(plan.sessions).toHaveLength(weekdays.length * 4);

                plan.sessions.forEach((session, index) => {
                  // Rule 1 is never relaxed.
                  for (const id of session.classIds) expect(allowed.has(id)).toBe(true);
                  expect(session.intensity).toBeLessThanOrEqual(intensityCeiling(p));

                  if (index === 0) return;
                  const previous = plan.sessions[index - 1];
                  // Rule 5 is never relaxed.
                  if (diffDays(previous.date, session.date) === 1) {
                    expect(previous.intensity === 3 && session.intensity === 3).toBe(false);
                  }
                  // Rule 6: never the same class twice in a row.
                  for (const id of session.classIds) expect(previous.classIds).not.toContain(id);
                });

                // Rule 3: it opens with "Start here".
                expect(find(plan.sessions[0].classIds[0]).slug).toBe(START_HERE_SLUG);

                cases.push({
                  relaxed: new Set(plan.relaxed.flatMap((note) => note.rules)),
                  level,
                  minutes,
                  days: weekdays.length,
                  unrestricted: workAround.includes('none'),
                });
              }
            }
          }
        }
      }
    }
    expect(cases).toHaveLength(5 * 2 * 3 * 4 * 4 * 8);
  });

  it('never needs a longer class than she asked for, or the same class twice running', () => {
    for (const item of cases) {
      expect(item.relaxed.has('longer')).toBe(false);
      expect(item.relaxed.has('back_to_back')).toBe(false);
    }
  });

  it('keeps "no class more than twice" for the plans most people will have', () => {
    // With nothing to work around: any two-day plan, 20 minutes up to four
    // days a week, and 30 minutes up to three.
    const holds = (item: Case) =>
      item.days === 2 ||
      (item.minutes === 20 && item.days <= 4) ||
      (item.minutes === 30 && item.days <= 3);
    for (const item of cases) {
      if (item.unrestricted && holds(item)) expect(item.relaxed.has('repeat')).toBe(false);
    }
  });

  it('KNOWN LIMIT: sixteen classes are too few for some plans to avoid a third use', () => {
    // Recorded so that it is a decision and not a surprise. A ten-minute plan
    // can only draw on ten-minute classes and a beginner has five of them:
    // ten uses, where three days a week needs twelve. More classes fix this;
    // the engine does not need to change. See the README.
    const shapes = new Set(
      cases
        .filter((item) => item.unrestricted && item.relaxed.has('repeat'))
        .map((item) => `level ${item.level}, ${item.minutes} min, ${item.days} days`),
    );
    expect([...shapes].sort()).toEqual([
      'level 1, 10 min, 3 days',
      'level 1, 10 min, 4 days',
      'level 1, 10 min, 5 days',
      'level 1, 20 min, 5 days',
      'level 1, 30 min, 4 days',
      'level 1, 30 min, 5 days',
      'level 2, 10 min, 4 days',
      'level 2, 10 min, 5 days',
      'level 2, 30 min, 5 days',
    ]);
  });
});
