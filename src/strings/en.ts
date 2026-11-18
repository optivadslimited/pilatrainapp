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

  focus: {
    foundations: 'Foundations',
    core: 'Core',
    full_body: 'Full body',
    mobility: 'Mobility',
    express: 'Express',
  } as Record<string, string>,

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
    // If she has had the trial before, nothing here promises a free week.
    primaryNoTrial: 'See membership plans',
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
    // Shown on the session card when it needs a membership to play.
    locked: 'Continue your plan',
    lockedLine: 'Your plan is saved and waiting for you.',
    banner: {
      // Two days before the free week ends. Honest about the date and the price.
      trialTitle: (date: string) => `Your free week ends on ${date}.`,
      trialBody: (price: string, period: string) =>
        `Then ${price} ${period}. Cancel any time in Settings.`,
      trialBodyNoPrice: 'Your membership then starts. Cancel any time in Settings.',
      trialAction: 'Manage',
      // Apple could not take payment and is retrying. She keeps access meanwhile.
      billingTitle: 'There’s a problem with your payment.',
      billingBody:
        'Your plan stays open while Apple tries again. Updating your payment details keeps it that way.',
      billingAction: 'Update payment',
    },
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
    weekRange: (from: string, to: string) => `${from} to ${to}`,
    today: 'Today',
    adjust: 'Adjust my plan',
    browse: 'Browse all classes',
    weekDone: 'All done this week.',
    weekEmpty: 'Nothing planned this week.',
    errorTitle: 'Your plan didn’t load.',
    errorBody: 'Check your connection and try again.',
  },

  library: {
    title: 'All classes',
    length: 'Length',
    focus: 'Focus',
    lengthChip: (minutes: number) => `${minutes} min`,
    count: (count: number) => (count === 1 ? '1 class' : `${count} classes`),
    free: 'Free class',
    emptyTitle: 'Nothing matches those filters.',
    emptyBody: 'Try a different length or focus.',
    clear: 'Clear filters',
  },

  adjust: {
    title: 'Adjust my plan',
    body: 'Change your days or your session length. What you’ve done stays as it is, and the rest of your plan is laid out again.',
    daysPerWeek: 'Days per week',
    daysChip: (days: number) => `${days} days`,
    whichDays: 'Which days',
    status: (chosen: number, count: number) => `${chosen} of ${count} chosen`,
    time: 'Best time of day',
    length: 'Time per session',
    save: 'Update my plan',
    saved: 'Your plan is updated.',
    failed: 'That didn’t save. Try again.',
  },

  classDetail: {
    heroLabel: (title: string) => `Class photo, hero, 3:4. ${title}.`,
    instructor: (name: string, credential: string) => `With ${name}, ${credential}`,
    whatYouWillDo: 'What you’ll do',
    easierNote: 'An easier option is there for every part of the class.',
    start: 'Start',
    resume: 'Pick up where you left off',
  },

  afterClass: {
    headline: 'Nicely done.',
    minutes: 'Minutes moved',
    sessions: 'Sessions completed',
    question: 'How did that feel?',
    ratings: {
      easy: 'Too easy',
      right: 'Just right',
      hard: 'Too hard',
    },
    next: (weekday: string, title: string) => `Next: ${weekday} · ${title}`,
    done: 'Done',
    // Shown once, on Today, when her feedback has changed the weeks ahead.
    effect: {
      eased: 'Noted. Next week eases off a little.',
      stepped_up: 'Noted. Next week steps up a little.',
      longer: 'Noted. Your sessions get a little longer from next week.',
    },
  },

  progress: {
    title: 'Progress',
    sessions: 'Sessions completed',
    minutes: 'Minutes moved',
    weeks: 'Weeks active',
    consistency: 'Consistency',
    consistencyBody: (done: number, planned: number) =>
      `${done} of ${planned} planned sessions in the last four weeks.`,
    consistencyEmpty: 'Your first sessions will fill this in.',
    chartTitle: 'Sessions each week',
    chartTarget: (target: number) => `Your plan: ${target} a week`,
    chartWeek: (week: number) => `W${week}`,
    chartSpoken: (week: number, done: number, target: number) =>
      `Week ${week}: ${done} of ${target}`,
    monthTitle: (month: string, year: number) => `${month} ${year}`,
    daysTrained: (count: number) =>
      count === 1 ? '1 day with a session this month.' : `${count} days with a session this month.`,
    trained: 'session done',
    feel: {
      easy: 'Classes have mostly felt on the easy side.',
      right: 'Classes have mostly felt just right.',
      hard: 'Classes have mostly felt on the hard side.',
      mixed: 'Classes have felt like a mix so far.',
    },
    emptyTitle: 'Nothing to count yet.',
    emptyBody: 'Sessions, minutes and weeks will appear here after your first class.',
    errorTitle: 'Your progress didn’t load.',
    errorBody: 'Check your connection and try again.',
  },

  you: {
    title: 'You',
    greeting: (name: string) => `Hello, ${name}`,
    greetingNoName: 'Hello',
    plan: 'Your plan',
    daysAndTime: 'Days and time',
    reminders: 'Reminders',
    on: 'On',
    off: 'Off',
    remindersOff: 'Reminders are off.',
    membership: 'Membership',
    memberPlan: 'Plan',
    notMember: 'Not a member',
    status: {
      trial: 'Free week',
      grace: 'Payment problem',
      lapsed: 'Ended',
    },
    renews: 'Renews',
    ends: 'Ends',
    ended: 'Ended',
    trialEnds: 'Free week ends',
    seePlans: 'See membership plans',
    manage: 'Manage subscription',
    restore: 'Restore purchases',
    redeem: 'Redeem a code',
    account: 'Account',
    signedInApple: 'Signed in with Apple',
    createAccount: 'Create an account',
    signOut: 'Sign out',
    signedOut: 'You’re signed out.',
    deleteAccount: 'Delete account and data',
    help: 'Help',
    contact: 'Email us',
    supportSubject: (version: string) => `${brand.name} help, version ${version}`,
    noMailApp: (email: string) => `Write to us at ${email}.`,
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
    devStore: 'Preview store (no real purchases)',
    devMembership: {
      none: 'Set: not a member',
      trial: 'Set: free week, day 1',
      trial_ending: 'Set: free week ends in 2 days',
      active: 'Set: paid member',
      grace: 'Set: payment problem',
      lapsed: 'Set: membership ended',
    },
    devEligible: 'Free trial available',
    devOutcome: 'Next purchase',
    devOutcomes: {
      success: 'Succeeds',
      cancelled: 'Cancelled',
      pending: 'Waits for approval',
      failed: 'Fails',
    },
    devOffline: 'Pretend to be offline',
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
    easierTitle: (chapter: string) => `Easier option · ${chapter}`,
    gotIt: 'Got it',
    chapters: 'In this class',
    chapterSpoken: (title: string, time: string) => `${title}, starts at ${time}`,
    playingNow: 'Playing now',
    upNext: (title: string) => `Then ${title}`,
    loading: 'Loading your class',
    showControls: 'Show the controls',
    hideControls: 'Hide the controls',
    leaveTitle: 'Leave this class?',
    leaveBody: 'Your place is saved. Pick it up again whenever you like.',
    keepGoing: 'Keep going',
    leave: 'Leave',
    // TODO(owner): remove once the real classes are on Mux.
    sampleNote: 'Sample video. The real class will play here.',
  },

  paywall: {
    // Screen-reader label for the group of plan cards.
    choose: 'Choose a plan',
    headline: 'Your plan is ready. Start your free week.',
    // If she has had the trial before, nothing on the screen says "free".
    headlineNoTrial: 'Your plan is ready.',
    points: {
      adapts: 'A plan that adapts to your week',
      // TODO(owner): confirm the instructor's certification before launch.
      instructor: (name: string) => `Every class led by ${name}, certified`,
      cancel: 'Cancel any time in two taps',
    },
    planName: {
      annual: 'Yearly',
      quarterly: 'Quarterly',
      monthly: 'Monthly',
    },
    // Follows the store's price: "<price> every 3 months".
    period: {
      annual: 'a year',
      quarterly: 'every 3 months',
      monthly: 'a month',
    },
    // The smaller line. The figure is worked out from the store's price.
    perMonth: {
      annual: (each: string) => `${each} a month, billed yearly`,
      quarterly: (each: string) => `${each} a month, billed every 3 months`,
    },
    badge: {
      popular: 'Most popular',
      save: (percent: number) => `Save ${percent}%`,
    },
    timeline: {
      today: 'Today',
      access: 'full access',
      day: (day: number) => `Day ${day}`,
      remind: 'we remind you',
      ends: 'trial ends',
    },
    startTrial: (days: number) => `Start ${days}-day free trial`,
    subscribe: 'Subscribe',
    // The exact terms, directly under the button. Price and period are the store's.
    terms: (days: number, price: string, period: string) =>
      `${days} days free, then ${price} ${period}. Cancel any time in Settings at least 24 hours before renewal.`,
    termsNoTrial: (price: string, period: string) =>
      `${price} ${period}, renewing until you cancel. Cancel any time in Settings at least 24 hours before renewal.`,
    termsLink: 'Terms',
    privacyLink: 'Privacy',
    restore: 'Restore purchases',
    redeem: 'Redeem a code',
    loadErrorTitle: 'The plans didn’t load.',
    loadErrorBody: 'Check your connection and try again.',
    unavailableTitle: 'Membership isn’t available right now.',
    unavailableBody: 'Please try again a little later.',
    cancelled: 'Cancelled. Nothing was charged.',
    pending: 'Your purchase is waiting for approval. Your plan opens as soon as it comes through.',
    failed: 'That didn’t go through. Please try again.',
    failedOffline: 'No connection. Try again when you’re back online.',
    notAllowed: 'Purchases are turned off on this device. You can change that in Screen Time.',
    alreadyMember: 'You’re already a member.',
    restored: 'Welcome back. Your membership is restored.',
    nothingToRestore: 'We couldn’t find a membership for this Apple Account.',
    restoreFailed: 'Restore didn’t finish. Check your connection and try again.',
    welcome: 'You’re in. Your plan is open.',
  },

  account: {
    createTitle: 'Save your plan.',
    createBody: 'An account keeps your plan and your membership with you if you change phones.',
    signInTitle: 'Welcome back.',
    signInBody: 'Sign in to pick up your plan where you left it.',
    apple: 'Continue with Apple',
    email: 'Continue with email',
    emailTitle: 'Your email',
    emailBody: 'We’ll email you a link. No password needed.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    emailInvalid: 'That doesn’t look like an email address.',
    send: 'Email me a link',
    sentTitle: 'Check your email.',
    sentBody: (email: string) => `We’ve sent a link to ${email}. Open it on this phone to finish.`,
    codeLabel: 'Or enter the 6-digit code from the email',
    verify: 'Continue',
    resend: 'Send it again',
    resent: 'Sent again.',
    codeWrong: 'That code didn’t match. Check the email and try again.',
    sendFailed: 'That didn’t send. Check your connection and try again.',
    appleFailed: 'Sign in with Apple didn’t finish. Please try again.',
    noAccount: 'We couldn’t find an account for that. Build a plan to get started.',
    created: 'Your account is saved.',
    signedIn: 'You’re signed in.',
    finishing: 'Finishing sign-in',
    linkFailedTitle: 'That link didn’t work.',
    linkFailedBody: 'It may have expired. Ask for a new one.',
    unavailable: 'Accounts aren’t switched on in this build.',
  },

  reminders: {
    title: 'Want a nudge on your Pilates days?',
    body: 'One notification on each of your days, and nothing else.',
    days: 'Your days',
    time: 'Your time',
    yes: 'Yes, remind me',
    on: 'Reminders are on.',
    // The notification itself. An invitation, never a telling-off.
    sessionTitle: (title: string) => `Today: ${title}`,
    sessionBody: (minutes: number) => `${minutes} minutes, whenever suits you.`,
    // Sent two days before the free week ends.
    trialTitle: (date: string) => `Your free week ends on ${date}`,
    trialBody: (price: string, period: string) =>
      `Your membership then starts at ${price} ${period}. You can cancel any time in Settings.`,
    trialBodyNoPrice: 'Your membership then starts. You can cancel any time in Settings.',
  },

  deleteAccount: {
    title: 'Delete your account?',
    body: 'This removes your account, your answers, your plan and your history from our records. It can’t be undone.',
    subscriptionNote:
      'Deleting your account doesn’t cancel a subscription. Apple bills it, so cancel it first if you have one.',
    manage: 'Manage subscription',
    next: 'Continue',
    keep: 'Keep my account',
    confirmTitle: 'Delete everything now?',
    confirmBody: 'Your account and everything in it will be removed straight away.',
    confirm: 'Delete my account',
    failed: 'That didn’t finish, and nothing was deleted. Check your connection and try again.',
    done: 'Your account has been deleted.',
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
