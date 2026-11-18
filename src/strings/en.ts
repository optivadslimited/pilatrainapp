import { brand } from '@/config/brand';

/**
 * Every string in the app, in English. No copy is typed into a screen or a
 * component: add it here and read it through `t` (src/strings/index.ts).
 *
 * House rules for anything written in this file:
 *  - No weight-loss claims, no before/after, no medical claims.
 *  - No guilt and no streak pressure. A missed day is never her fault.
 *  - No invented testimonials, ratings or member counts.
 *  - No prices. Prices come from StoreKit at run time.
 *  - The product name is always `brand.name`, never typed out.
 */
export const en = {
  common: {
    continue: 'Continue',
    skip: 'Skip',
    back: 'Back',
    close: 'Close',
    done: 'Done',
    retry: 'Try again',
    notNow: 'Not now',
    start: 'Start',
    selected: 'Selected',
    loading: 'Loading',
  },

  tabs: {
    today: 'Today',
    plan: 'Plan',
    progress: 'Progress',
    you: 'You',
  },

  weekdays: {
    /** Monday first. Index 0 is Monday. */
    long: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    short: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    letter: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },

  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],

  /** A date written out: "Thursday 19 November". */
  date: (weekday: string, day: number, month: string) => `${weekday} ${day} ${month}`,

  themes: {
    foundations: 'Foundations',
    build: 'Build',
    strengthen: 'Strengthen',
    flow: 'Flow',
  },

  dayPill: {
    done: 'done',
    today: 'today',
    planned: 'session planned',
    rest: 'rest day',
  },

  classMeta: {
    minutes: (minutes: number) => `${minutes} min`,
    level: { 1: 'Beginner', 2: 'Improver' } as Record<number, string>,
    equipment: {
      mat: 'Mat',
      band: 'Resistance band',
      ball: 'Small ball',
      weights: 'Light weights',
    } as Record<string, string>,
    locked: 'Members only',
    move: 'Move',
    done: 'Done',
    /** Shown when a 30-minute session is a 20 followed by a 10. */
    then: (title: string) => `Then ${title}`,
    photoLabel: (title: string) => `Class photo, 4:5. ${title}.`,
  },

  launch: {
    wordmarkLabel: brand.name,
  },

  welcome: {
    headline: 'Pilates that fits your day.',
    line: 'A personal plan in 90 seconds.',
    primary: 'Build my plan',
    signIn: 'I already have an account',
    photoLabel: 'Instructor photo. Hero, 3:4, warm daylight, a real room.',
    // TODO(milestone 4): remove once sign-in exists.
    signInUnavailable: 'Sign-in arrives with accounts in a later build.',
  },

  quiz: {
    progress: (current: number, total: number) => `Step ${current} of ${total}`,
    questions: {
      goal: {
        title: 'Your main goal',
        subtitle: 'Pick the one that matters most right now.',
        options: {
          core_strength: 'Build core strength',
          posture: 'Improve my posture',
          mobility: 'Ease stiffness and move better',
          tone: 'Tone and feel stronger',
          routine: 'Build a steady routine',
        },
      },
      experience: {
        title: 'Your experience',
        subtitle: 'So your first classes meet you where you are.',
        options: {
          new: 'New to Pilates',
          tried: 'Tried it a few times',
          sometimes: 'I practise sometimes',
          regular: 'I practise regularly',
        },
      },
      minutes: {
        title: 'Time per session',
        subtitle: 'Shorter sessions count just as much.',
        options: {
          '10': '10 minutes',
          '20': '20 minutes',
          '30': '30 minutes',
        },
      },
      days_per_week: {
        title: 'Days per week',
        subtitle: 'You can change this whenever life does.',
        options: {
          '2': '2 days',
          '3': '3 days',
          '4': '4 days',
          '5': '5 days',
        },
      },
      weekdays: {
        title: 'Which days',
        subtitle: (count: number) =>
          `Choose ${count} days. We’ve suggested a spread with rest in between.`,
        status: (chosen: number, count: number) => `${chosen} of ${count} chosen`,
      },
      time_of_day: {
        title: 'Best time of day',
        subtitle: 'This sets when a reminder would arrive, if you want one.',
        options: {
          morning: 'Morning',
          lunchtime: 'Lunchtime',
          evening: 'Evening',
          varies: 'It varies',
        },
      },
      equipment: {
        title: 'What you have at home',
        subtitle: 'Choose all that apply. A mat is all you need.',
        options: {
          mat: 'Just a mat',
          band: 'Resistance band',
          ball: 'Small ball',
          weights: 'Light weights',
        },
      },
      work_around: {
        title: 'Anything to work around',
        subtitle: 'Choose all that apply. We’ll leave out classes that don’t suit.',
        options: {
          lower_back: 'Lower back',
          neck_shoulders: 'Neck or shoulders',
          knees: 'Knees',
          wrists: 'Wrists',
          pregnant_postpartum: 'Pregnant or postpartum',
          recent_injury_surgery: 'Recent injury or surgery',
          none: 'None',
        },
      },
      first_name: {
        title: 'Your first name',
        subtitle: 'Optional. It’s only used to greet you.',
        label: 'First name',
        placeholder: 'First name',
      },
    },
  },

  safety: {
    title: 'Please check with your doctor or physiotherapist before starting.',
    body: `${brand.name} offers general movement classes and is not medical advice.`,
    cleared: 'I’ve been cleared to exercise',
    checkFirst: 'I’ll check first',
  },

  holding: {
    title: 'Take your time.',
    body: 'Your answers are saved. When your doctor or physiotherapist says you’re ready, your plan will be here.',
    cleared: 'I’ve been cleared to exercise',
    remind: 'Remind me in a week',
    remindWhy: 'One notification, a week from now. Nothing else.',
    reminderSet: (date: string) => `We’ll remind you on ${date}.`,
    reminderDenied: `Notifications are off for ${brand.name}. You can turn them on in Settings.`,
    reminderUnavailable: 'Reminders aren’t available on this device.',
    notificationTitle: 'Ready when you are',
    notificationBody: `Your answers are saved. Open ${brand.name} once you’ve had the all-clear.`,
  },

  disclaimer: {
    title: 'One last thing.',
    body: 'Move at your own pace, and stop if anything doesn’t feel right.',
    checkbox: `I understand that ${brand.name} offers general movement classes and is not medical advice.`,
    link: 'Read the health disclaimer',
    primary: 'Build my plan',
  },

  building: {
    title: 'Building your plan',
    lines: [
      'Matching classes to your level',
      'Fitting your week',
      'Balancing strength and recovery',
    ],
    errorTitle: 'Your plan didn’t build.',
    errorBody: 'Your answers are saved. Check your connection and try again.',
    noClassesTitle: 'We couldn’t fit a plan to those answers.',
    noClassesBody:
      'Go back and change what you’d like to work around, or get in touch and we’ll help.',
    changeAnswers: 'Change my answers',
  },

  preview: {
    headline: (name: string) => `Your 28-day plan, ${name}`,
    headlineNoName: 'Your 28-day plan',
    daysChip: (days: number) => `${days} days a week`,
    minutesChip: (minutes: number) => `${minutes} min`,
    focusChip: {
      core_strength: 'Core focus',
      posture: 'Posture focus',
      mobility: 'Mobility focus',
      tone: 'Full-body focus',
      routine: 'Balanced mix',
    } as Record<string, string>,
    weekTitle: (week: number, theme: string) => `Week ${week} · ${theme}`,
    sessions: (count: number) => (count === 1 ? '1 session' : `${count} sessions`),
    primary: 'Start my free week',
    secondary: 'Try the first class free',
  },

  today: {
    dateLine: (weekday: string, week: number, weeks: number) =>
      `${weekday} · Week ${week} of ${weeks}`,
    headline: {
      session: (title: string) => `Today: ${title}`,
      rest: 'Rest day. You’ve earned it.',
      done: 'Done for today.',
      moved: 'Welcome back. Your plan has moved.',
      /** Before her very first session, on a day that is not one of her days. */
      beforeFirst: (weekday: string) => `Your plan starts on ${weekday}.`,
      /** The last session of a block is behind her and the next block has not begun. */
      blockDone: 'Four weeks, done.',
    },
    next: (weekday: string) => `Next: ${weekday}`,
    nextLine: (weekday: string, title: string) => `Next: ${weekday} · ${title}`,
    startEarly: 'Start now',
    ring: (done: number, total: number) => `${done} of ${total}`,
    ringLabel: 'sessions this week',
    ringSpoken: (done: number, total: number) => `${done} of ${total} sessions this week`,
    comingUp: 'Coming up',
    moveHint: 'Opens the days this session can move to.',
    // One quiet line, drawn from her own numbers. Never guilt, never streak pressure.
    encouragement: {
      beforeFirst: 'Nothing to prepare. A mat and a little floor is enough.',
      firstSession: (minutes: number) => `${minutes} minutes is all today asks.`,
      firstDone: 'That’s the first one done.',
      doneThisWeek: (done: number, total: number) =>
        done >= total ? `All ${total} done this week.` : `${done} of ${total} done this week.`,
      momentum: (done: number) =>
        done === 1
          ? 'One done this week. Here’s the next.'
          : `${done} done this week. Here’s the next.`,
      weekStart: (week: number) => `Week ${week} starts here.`,
      restAfterWork: (minutes: number) =>
        `${minutes} minutes moved this week. Rest is part of the plan.`,
      rest: 'Rest is part of the plan.',
      moved: 'Plans bend. Yours has made room.',
      blockDone: 'Your next four weeks begin tomorrow.',
    },
    errorTitle: 'Your plan didn’t load.',
    errorBody: 'Check your connection and try again.',
    // TODO(milestone 3): remove once the player exists.
    playerSoon: 'The player arrives in the next build.',
  },

  move: {
    title: 'Move this session',
    body: (title: string) => `${title} can move to any free day this week.`,
    today: 'Today',
    noneTitle: 'No free day left this week.',
    noneBody: 'This session stays where it is.',
    moved: (weekday: string) => `Moved to ${weekday}.`,
    failed: 'That didn’t save. Try again.',
  },

  plan: {
    title: 'Plan',
    emptyTitle: 'Four weeks, one session at a time.',
    emptyBody: 'Your 28-day plan and the class library will appear here.',
  },

  progress: {
    title: 'Progress',
    emptyTitle: 'Nothing to count yet.',
    emptyBody: 'Sessions, minutes and weeks will appear here after your first class.',
  },

  you: {
    title: 'You',
    greeting: (name: string) => `Hello, ${name}`,
    greetingNoName: 'Hello',
    legal: 'Legal',
    terms: 'Terms',
    privacy: 'Privacy',
    healthDisclaimer: 'Health disclaimer',
    version: (version: string) => `Version ${version}`,
    developer: 'Developer',
    gallery: 'Component gallery',
    restartOnboarding: 'Restart onboarding',
    completeToday: 'Complete the next session',
    skipDay: 'Skip to tomorrow',
    resetDate: 'Back to the real date',
    daysAhead: (days: number) => (days === 1 ? '1 day ahead' : `${days} days ahead`),
    localMode: 'Local mode: no backend keys',
    remoteMode: 'Connected to Supabase',
  },

  player: {
    play: 'Play',
    pause: 'Pause',
    back10: 'Back 10 seconds',
    forward10: 'Forward 10 seconds',
    captionsOn: 'Captions on',
    captionsOff: 'Captions off',
    airPlay: 'AirPlay',
    close: 'Close player',
    scrubber: 'Playback position',
    position: (elapsed: string, total: string) => `${elapsed} of ${total}`,
    easierOption: 'Easier option',
  },

  planCard: {
    selected: 'Selected plan',
    loadingPrice: 'Loading price',
  },

  states: {
    offlineTitle: 'You’re offline.',
    offlineBody: 'Your plan is saved on this phone. Classes need a connection to play.',
    videoErrorTitle: 'That class didn’t load.',
    videoErrorBody: 'It’s us, not you. Check your connection and try again.',
  },

  photo: {
    placeholder: (description: string) => `Photo to come: ${description}`,
  },
} as const;

export type Strings = typeof en;
