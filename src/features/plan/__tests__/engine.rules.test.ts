import {
  addDays,
  buildPlan,
  diffDays,
  eligibleClasses,
  GOALS,
  isoWeekday,
  MINUTES,
  NoEligibleClassesError,
  PlanInputError,
  START_HERE_SLUG,
  themeOf,
  weekCap,
  WEEKS,
  type BuiltPlan,
  type ClassInfo,
  type Level,
  type Weekday,
} from '@engine';

import {
  cls,
  focusCounts,
  lengths,
  lookup,
  MONDAY,
  profile,
  richCatalogue,
  TUESDAY,
  timesUsed,
} from './fixtures';

const rich = richCatalogue();
const find = lookup(rich);

const DAY_SETS: Weekday[][] = [
  [1, 4],
  [1, 3, 5],
  [1, 2, 4, 6],
  [1, 2, 3, 5, 6],
];

/** Every class of every session, with the session it belongs to. */
const classesOf = (plan: BuiltPlan, get = find) =>
  plan.sessions.flatMap((session) => session.classIds.map((id) => ({ session, class: get(id) })));

describe('rule 1: only classes that suit her', () => {
  // These sort first by slug, so a broken filter would pick them straight away.
  const tempting = (overrides: Partial<ClassInfo>) =>
    cls({ slug: `aaa-${JSON.stringify(overrides)}`, focus: 'core', lengthMin: 20, ...overrides });

  it('keeps only classes at or below her level', () => {
    const plan = buildPlan({ profile: profile({ level: 1 }), catalogue: rich, from: MONDAY });
    for (const item of classesOf(plan)) expect(item.class.level).toBe(1);
  });

  it('gives an improver classes from both levels', () => {
    const plan = buildPlan({ profile: profile({ level: 2 }), catalogue: rich, from: MONDAY });
    const levels = new Set(classesOf(plan).map((item) => item.class.level));
    expect(levels.has(2)).toBe(true);
  });

  it('keeps only classes that need equipment she has', () => {
    const catalogue = [
      ...rich,
      tempting({ equipment: ['mat', 'band'] }),
      tempting({ equipment: ['mat', 'weights'] }),
    ];
    const get = lookup(catalogue);

    const matOnly = buildPlan({
      profile: profile({ equipment: ['mat'] }),
      catalogue,
      from: MONDAY,
    });
    for (const item of classesOf(matOnly, get)) expect(item.class.equipment).toEqual(['mat']);

    const withBand = buildPlan({
      profile: profile({ equipment: ['band'] }),
      catalogue,
      from: MONDAY,
    });
    const used = classesOf(withBand, get).flatMap((item) => item.class.equipment);
    expect(used).toContain('band');
    expect(used).not.toContain('weights');
  });

  it('assumes the mat whatever she ticked', () => {
    const plan = buildPlan({
      profile: profile({ equipment: ['band'] }),
      catalogue: rich,
      from: MONDAY,
    });
    expect(plan.sessions).toHaveLength(12);
  });

  it('leaves out classes that conflict with what she wants to work around', () => {
    const catalogue = [
      ...rich,
      tempting({ unsuitableFor: ['wrists'] }),
      tempting({ unsuitableFor: ['knees', 'lower_back'] }),
    ];
    const get = lookup(catalogue);
    const plan = buildPlan({
      profile: profile({ workAround: ['wrists', 'lower_back'] }),
      catalogue,
      from: MONDAY,
    });
    for (const item of classesOf(plan, get)) {
      expect(item.class.unsuitableFor).not.toContain('wrists');
      expect(item.class.unsuitableFor).not.toContain('lower_back');
    }
  });

  it('never uses an unpublished class', () => {
    const catalogue = [...rich, tempting({ published: false })];
    const plan = buildPlan({ profile: profile(), catalogue, from: MONDAY });
    for (const item of classesOf(plan, lookup(catalogue))) expect(item.class.published).toBe(true);
  });

  it('caps intensity at 2 on the gentle track, even for an improver whose feedback raised it', () => {
    const plan = buildPlan({
      profile: profile({
        level: 2,
        gentle: true,
        intensityShift: 2,
        workAround: ['pregnant_postpartum'],
      }),
      catalogue: rich,
      from: MONDAY,
    });
    for (const item of classesOf(plan)) expect(item.class.intensity).toBeLessThanOrEqual(2);
    for (const week of WEEKS) expect(weekCap(plan.profile, week)).toBeLessThanOrEqual(2);
  });

  it('prefers mobility and foundations on the gentle track', () => {
    const share = (gentle: boolean) => {
      const counts = focusCounts(
        buildPlan({ profile: profile({ goal: 'tone', gentle }), catalogue: rich, from: MONDAY }),
      );
      return (counts.mobility + counts.foundations) / 12;
    };
    expect(share(true)).toBeGreaterThanOrEqual(0.5);
    expect(share(true)).toBeGreaterThan(share(false));
  });

  it('says so plainly when nothing in the catalogue suits her', () => {
    const catalogue = [cls({ slug: 'only-class', level: 2 })];
    expect(() => buildPlan({ profile: profile({ level: 1 }), catalogue, from: MONDAY })).toThrow(
      NoEligibleClassesError,
    );
  });
});

describe('rule 2: match her session length', () => {
  it.each(MINUTES)('gives a %i-minute user sessions of exactly that length', (minutes) => {
    const plan = buildPlan({ profile: profile({ minutes }), catalogue: rich, from: MONDAY });
    // The opening session is "Start here", which is ten minutes by design.
    for (const session of plan.sessions.slice(1)) expect(session.minutes).toBe(minutes);
    expect(plan.relaxed).toEqual([]);
  });

  it('uses a shorter class when none of her length fits', () => {
    const plan = buildPlan({
      profile: profile({ minutes: 20 }),
      catalogue: lengths(rich, [10]),
      from: MONDAY,
    });
    for (const session of plan.sessions) expect(session.minutes).toBe(10);
    expect(plan.relaxed.every((note) => note.rules.includes('shorter'))).toBe(true);
    expect(plan.relaxed.length).toBeGreaterThan(0);
  });

  it('never gives her a longer class while a shorter one is available', () => {
    const plan = buildPlan({
      profile: profile({ minutes: 20 }),
      catalogue: lengths(rich, [10, 30]),
      from: MONDAY,
    });
    for (const session of plan.sessions) expect(session.minutes).toBe(10);
  });

  it('pairs a 20 and a 10 for a 30-minute session when there is no 30', () => {
    const plan = buildPlan({
      profile: profile({ minutes: 30 }),
      catalogue: lengths(rich, [10, 20]),
      from: MONDAY,
    });
    for (const session of plan.sessions.slice(1)) {
      expect(session.classIds).toHaveLength(2);
      expect(session.classIds.map((id) => find(id).lengthMin)).toEqual([20, 10]);
      expect(session.minutes).toBe(30);
    }
    expect(plan.relaxed).toEqual([]);
  });

  it('never pairs classes for a 10 or 20-minute session', () => {
    for (const minutes of [10, 20] as const) {
      const plan = buildPlan({ profile: profile({ minutes }), catalogue: rich, from: MONDAY });
      for (const session of plan.sessions) expect(session.classIds).toHaveLength(1);
    }
  });

  it('only goes longer when nothing at or under her length exists at all', () => {
    const plan = buildPlan({
      profile: profile({ minutes: 10 }),
      catalogue: lengths(rich, [20]),
      from: MONDAY,
    });
    for (const session of plan.sessions) expect(session.minutes).toBe(20);
    expect(plan.relaxed.every((note) => note.rules.includes('longer'))).toBe(true);
  });
});

describe('rule 3: four themed weeks, opening with "Start here"', () => {
  it('names the weeks Foundations, Build, Strengthen, Flow', () => {
    expect(WEEKS.map(themeOf)).toEqual(['foundations', 'build', 'strengthen', 'flow']);
  });

  it.each(MINUTES)('opens a %i-minute plan with "Start here"', (minutes) => {
    const plan = buildPlan({ profile: profile({ minutes }), catalogue: rich, from: MONDAY });
    expect(find(plan.sessions[0].classIds[0]).slug).toBe(START_HERE_SLUG);
  });

  it('follows "Start here" with a 20 to fill a 30-minute first session', () => {
    const plan = buildPlan({ profile: profile({ minutes: 30 }), catalogue: rich, from: MONDAY });
    const [first, second] = plan.sessions[0].classIds.map(find);
    expect(first.slug).toBe(START_HERE_SLUG);
    expect(second.lengthMin).toBe(20);
    expect(plan.sessions[0].minutes).toBe(30);
  });

  it('opens every goal and every level with it', () => {
    for (const goal of GOALS) {
      for (const level of [1, 2] as Level[]) {
        const plan = buildPlan({
          profile: profile({ goal, level }),
          catalogue: rich,
          from: MONDAY,
        });
        expect(find(plan.sessions[0].classIds[0]).slug).toBe(START_HERE_SLUG);
      }
    }
  });

  it.each([
    [1, [1, 2, 2, 2]],
    [2, [2, 2, 3, 3]],
  ] as [Level, number[]][])('caps a level-%i plan week by week at %j', (level, caps) => {
    const plan = buildPlan({ profile: profile({ level }), catalogue: rich, from: MONDAY });
    expect(WEEKS.map((week) => weekCap(plan.profile, week))).toEqual(caps);
    for (const session of plan.sessions) {
      expect(session.intensity).toBeLessThanOrEqual(caps[session.week - 1]);
    }
  });

  it('makes the Strengthen week the hardest of an improver plan', () => {
    const plan = buildPlan({ profile: profile({ level: 2 }), catalogue: rich, from: MONDAY });
    const peak = (week: number) =>
      Math.max(
        ...plan.sessions
          .filter((session) => session.week === week)
          .map((session) => session.intensity),
      );
    expect(peak(3)).toBe(3);
    expect(peak(1)).toBeLessThan(3);
  });
});

describe('rule 4: the mix follows her goal', () => {
  const build = (goal: (typeof GOALS)[number], weekdays: Weekday[] = [1, 3, 5]) =>
    focusCounts(buildPlan({ profile: profile({ goal, weekdays }), catalogue: rich, from: MONDAY }));

  it.each(DAY_SETS)('core strength: half the sessions are core (days %j)', (...weekdays) => {
    const total = weekdays.length * 4;
    expect(build('core_strength', weekdays).core).toBe(total / 2);
  });

  it('posture: core and mobility, in equal measure', () => {
    const counts = build('posture');
    expect(Math.abs(counts.core - counts.mobility)).toBeLessThanOrEqual(1);
    expect(counts.core + counts.mobility).toBeGreaterThanOrEqual(9);
  });

  it.each(DAY_SETS)('stiffness: half the sessions are mobility (days %j)', (...weekdays) => {
    const total = weekdays.length * 4;
    expect(build('mobility', weekdays).mobility).toBe(total / 2);
  });

  it('tone: full body and core, in equal measure', () => {
    const counts = build('tone', [1, 4]);
    expect(counts.full_body).toBe(counts.core);
    expect(counts.full_body + counts.core).toBeGreaterThanOrEqual(6);
  });

  it('routine: an even mix', () => {
    // Two days a week, so rule 5's mobility close does not tilt the count.
    const counts = Object.values(build('routine', [1, 4]));
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('spreads the mix through the plan instead of bunching it', () => {
    const plan = buildPlan({
      profile: profile({ goal: 'core_strength' }),
      catalogue: rich,
      from: MONDAY,
    });
    const focuses = plan.sessions.map((session) => session.focus);
    for (let i = 2; i < focuses.length; i++) {
      expect(focuses[i] === focuses[i - 1] && focuses[i] === focuses[i - 2]).toBe(false);
    }
    for (const week of WEEKS) {
      expect(
        plan.sessions.filter((s) => s.week === week && s.focus === 'core').length,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('gives up the mix before any other rule when the catalogue is thin', () => {
    // Only two core classes at her length: four uses, where the goal asks for six.
    const thin = rich.filter((item) => item.focus !== 'core' || /-l1-i1-[01]$/.test(item.slug));
    const plan = buildPlan({
      profile: profile({ goal: 'core_strength' }),
      catalogue: thin,
      from: MONDAY,
    });
    expect(plan.relaxed.length).toBeGreaterThan(0);
    for (const note of plan.relaxed) expect(note.rules).toEqual(['mix']);
    for (const count of timesUsed(plan).values()) expect(count).toBeLessThanOrEqual(2);
  });
});

describe('rule 5: intensity 3 never on consecutive days, and each week closes with mobility', () => {
  const noBackToBackIntensity = (plan: BuiltPlan) => {
    for (let i = 1; i < plan.sessions.length; i++) {
      const [a, b] = [plan.sessions[i - 1], plan.sessions[i]];
      if (diffDays(a.date, b.date) === 1)
        expect(a.intensity === 3 && b.intensity === 3).toBe(false);
    }
  };

  it('never places two intensity-3 sessions on consecutive days', () => {
    // An improver training five days running, pushed as hard as the engine goes.
    for (const goal of GOALS) {
      for (const minutes of MINUTES) {
        const plan = buildPlan({
          profile: profile({
            goal,
            minutes,
            level: 2,
            weekdays: [1, 2, 3, 4, 5],
            intensityShift: 2,
          }),
          catalogue: rich,
          from: MONDAY,
        });
        expect(plan.sessions.some((session) => session.intensity === 3)).toBe(true);
        noBackToBackIntensity(plan);
      }
    }
  });

  it('holds even when every class she could do is intensity 3 or 1', () => {
    const catalogue = rich.filter((item) => item.intensity !== 2);
    const plan = buildPlan({
      profile: profile({ level: 2, weekdays: [1, 2, 3, 4, 5, 6, 7], intensityShift: 2 }),
      catalogue,
      from: MONDAY,
    });
    noBackToBackIntensity(plan);
  });

  it('does not open a new block with intensity 3 the day after an intensity-3 session', () => {
    const plan = buildPlan({
      profile: profile({ level: 2, weekdays: [1, 2, 3, 4, 5], intensityShift: 2 }),
      catalogue: rich,
      from: MONDAY,
      block: 2,
      before: { date: addDays(MONDAY, -1), intensity: 3, classIds: [] },
    });
    expect(plan.sessions[0].intensity).toBeLessThan(3);
  });

  it.each(DAY_SETS.filter((days) => days.length >= 3))(
    'closes every week with mobility when she trains %j',
    (...weekdays) => {
      for (const goal of GOALS) {
        const plan = buildPlan({
          profile: profile({ goal, weekdays }),
          catalogue: rich,
          from: MONDAY,
        });
        for (const week of WEEKS) {
          const sessions = plan.sessions.filter((session) => session.week === week);
          expect(sessions[sessions.length - 1].focus).toBe('mobility');
        }
      }
    },
  );

  it('does not force a mobility close at two days a week', () => {
    const plan = buildPlan({
      profile: profile({ goal: 'core_strength', weekdays: [1, 4] }),
      catalogue: rich,
      from: MONDAY,
    });
    const closers = WEEKS.map(
      (week) => plan.sessions.filter((session) => session.week === week)[1].focus,
    );
    expect(closers.every((focus) => focus === 'mobility')).toBe(false);
  });

  it('repeats a mobility class before it gives up the mobility close', () => {
    // One mobility class at her length, and four weeks to close.
    const catalogue = rich.filter(
      (item) => item.focus !== 'mobility' || item.slug === 'mobility-20-l1-i1-0',
    );
    const plan = buildPlan({ profile: profile({ goal: 'tone' }), catalogue, from: MONDAY });
    for (const week of WEEKS) {
      const sessions = plan.sessions.filter((session) => session.week === week);
      expect(sessions[sessions.length - 1].focus).toBe('mobility');
    }
    expect(plan.relaxed.some((note) => note.rules.includes('repeat'))).toBe(true);
  });
});

describe('rule 6: no class more than twice, and never twice in a row', () => {
  it('uses no class more than twice in the 28 days', () => {
    for (const goal of GOALS) {
      for (const weekdays of DAY_SETS) {
        for (const minutes of MINUTES) {
          const plan = buildPlan({
            profile: profile({ goal, weekdays, minutes }),
            catalogue: rich,
            from: MONDAY,
          });
          for (const count of timesUsed(plan).values()) expect(count).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  const noRepeatsInARow = (plan: BuiltPlan) => {
    for (let i = 1; i < plan.sessions.length; i++) {
      const previous = new Set(plan.sessions[i - 1].classIds);
      for (const id of plan.sessions[i].classIds) expect(previous.has(id)).toBe(false);
    }
  };

  it('never gives the same class twice in a row', () => {
    for (const goal of GOALS) {
      for (const weekdays of DAY_SETS) {
        noRepeatsInARow(
          buildPlan({ profile: profile({ goal, weekdays }), catalogue: rich, from: MONDAY }),
        );
      }
    }
  });

  it('keeps that up when there are only two classes to choose from', () => {
    const catalogue = [cls({ slug: 'a', focus: 'mobility' }), cls({ slug: 'b', focus: 'core' })];
    // Two days a week, so rule 5's mobility close does not pin any session down.
    const plan = buildPlan({ profile: profile({ weekdays: [1, 4] }), catalogue, from: MONDAY });
    expect(plan.sessions).toHaveLength(8);
    noRepeatsInARow(plan);
    // Eight sessions from two classes cannot respect "no more than twice".
    expect(plan.relaxed.some((note) => note.rules.includes('repeat'))).toBe(true);
    expect(plan.relaxed.some((note) => note.rules.includes('back_to_back'))).toBe(false);
  });

  it('does not open a new block with the class that closed the last one', () => {
    const first = buildPlan({ profile: profile(), catalogue: rich, from: MONDAY, block: 2 });
    const again = buildPlan({
      profile: profile(),
      catalogue: rich,
      from: MONDAY,
      block: 2,
      before: { date: addDays(MONDAY, -2), intensity: 1, classIds: first.sessions[0].classIds },
    });
    expect(again.sessions[0].classIds).not.toEqual(first.sessions[0].classIds);
  });

  it('still returns a plan when one class is all there is', () => {
    const plan = buildPlan({
      profile: profile(),
      catalogue: [cls({ slug: 'only' })],
      from: MONDAY,
    });
    expect(plan.sessions).toHaveLength(12);
    expect(plan.relaxed.some((note) => note.rules.includes('back_to_back'))).toBe(true);
  });
});

describe('rule 7: on her chosen weekdays, starting from the next one', () => {
  it.each(DAY_SETS)('schedules only on the days she chose (%j)', (...weekdays) => {
    const plan = buildPlan({ profile: profile({ weekdays }), catalogue: rich, from: TUESDAY });
    for (const session of plan.sessions) expect(weekdays).toContain(isoWeekday(session.date));
    expect(plan.sessions).toHaveLength(weekdays.length * 4);
  });

  it('starts today when today is one of her days', () => {
    const plan = buildPlan({
      profile: profile({ weekdays: [1, 3, 5] }),
      catalogue: rich,
      from: MONDAY,
    });
    expect(plan.sessions[0].date).toBe(MONDAY);
  });

  it('otherwise starts on her next day', () => {
    const plan = buildPlan({
      profile: profile({ weekdays: [1, 3, 5] }),
      catalogue: rich,
      from: TUESDAY,
    });
    expect(plan.sessions[0].date).toBe('2026-11-04');
    expect(isoWeekday(plan.sessions[0].date)).toBe(3);
  });

  it('runs for 28 days from the day it is built', () => {
    const plan = buildPlan({ profile: profile(), catalogue: rich, from: TUESDAY });
    expect(plan.startDate).toBe(TUESDAY);
    expect(plan.endDate).toBe('2026-11-30');
    expect(diffDays(plan.startDate, plan.endDate)).toBe(27);
    for (const session of plan.sessions) {
      expect(session.date >= plan.startDate && session.date <= plan.endDate).toBe(true);
    }
  });

  it('gives every week the same number of sessions, one a day at most', () => {
    for (const weekdays of DAY_SETS) {
      const plan = buildPlan({ profile: profile({ weekdays }), catalogue: rich, from: TUESDAY });
      for (const week of WEEKS) {
        expect(plan.sessions.filter((session) => session.week === week)).toHaveLength(
          weekdays.length,
        );
      }
      expect(new Set(plan.sessions.map((session) => session.date)).size).toBe(plan.sessions.length);
      // In date order.
      expect(plan.sessions.map((session) => session.date)).toEqual(
        plan.sessions.map((session) => session.date).sort(),
      );
    }
  });

  it('counts weeks in sevens from the start date', () => {
    const plan = buildPlan({ profile: profile(), catalogue: rich, from: TUESDAY });
    for (const session of plan.sessions) {
      expect(session.week).toBe(Math.floor(diffDays(plan.startDate, session.date) / 7) + 1);
    }
  });

  it('rejects answers it cannot plan from', () => {
    const build = (overrides: Parameters<typeof profile>[0], from = MONDAY) =>
      buildPlan({ profile: profile(overrides), catalogue: rich, from });
    expect(() => build({ weekdays: [] })).toThrow(PlanInputError);
    expect(() => build({ weekdays: [1, 1, 3] })).toThrow(PlanInputError);
    expect(() => build({ weekdays: [8 as Weekday] })).toThrow(PlanInputError);
    expect(() => build({ minutes: 15 as 10 })).toThrow(PlanInputError);
    expect(() => build({}, '2026-02-30')).toThrow(PlanInputError);
    expect(() => build({}, 'tomorrow')).toThrow(PlanInputError);
  });
});

describe('the engine as a whole', () => {
  it('with a full catalogue, satisfies every rule at once for every kind of answer', () => {
    for (const goal of GOALS) {
      for (const level of [1, 2] as Level[]) {
        for (const minutes of MINUTES) {
          for (const weekdays of DAY_SETS) {
            for (const gentle of [false, true]) {
              const plan = buildPlan({
                profile: profile({ goal, level, minutes, weekdays, gentle }),
                catalogue: rich,
                from: TUESDAY,
              });
              expect(plan.relaxed).toEqual([]);
            }
          }
        }
      }
    }
  });

  it('gives the same plan for the same answers, every time', () => {
    const args = {
      profile: profile({ goal: 'posture', level: 2, minutes: 30 }),
      catalogue: rich,
      from: TUESDAY,
    };
    expect(buildPlan(args)).toEqual(buildPlan(args));
    // The order the catalogue arrives in makes no difference.
    expect(buildPlan({ ...args, catalogue: [...rich].reverse() })).toEqual(buildPlan(args));
  });

  it('builds a plan in well under 300 ms', () => {
    const args = {
      profile: profile({ minutes: 30, level: 2, weekdays: [1, 2, 3, 5, 6] }),
      catalogue: rich,
      from: TUESDAY,
    };
    buildPlan(args); // warm up
    let slowest = 0;
    for (let i = 0; i < 20; i++) {
      const started = performance.now();
      buildPlan(args);
      slowest = Math.max(slowest, performance.now() - started);
    }
    expect(slowest).toBeLessThan(300);
  });

  it('only ever chooses from the classes that suit her', () => {
    const p = profile({ level: 1, workAround: ['wrists'] });
    const allowed = new Set(eligibleClasses(rich, p).map((item) => item.id));
    const plan = buildPlan({ profile: p, catalogue: rich, from: MONDAY });
    for (const session of plan.sessions)
      for (const id of session.classIds) expect(allowed.has(id)).toBe(true);
  });
});
