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
  },

  today: {
    emptyTitle: 'Your plan starts here.',
    emptyBody: 'Once your plan is built, today’s session will be waiting on this screen.',
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
