# Architecture walkthrough

A short tour of how the app fits together. It grows with each milestone; this
version covers milestones 1 to 3.

## The shape of it

```
          src/app  (screens; the file tree is the route tree)
              │  reads and calls
   ┌──────────┼───────────────┬──────────────┐
   ▼          ▼               ▼              ▼
components  features/*      strings        lib
(design     (state and      (every word)   (storage, haptics,
 system)     rules for                      analytics, reminders)
   │         one area)
   ▼
 theme  (tokens)          config  (brand.ts, env.ts)
```

Dependencies point downward. A screen may use anything below it. A component
never imports from a feature or a screen. `theme` and `config` import nothing
from the app.

## Screens are thin

A screen lays out components and calls functions. It does not hold rules.

The quiz is the clearest example. `src/app/quiz/[step].tsx` renders whichever
question the route names, and it knows nothing about any particular question.
The questions are data in `features/onboarding/questions.ts`. What comes next
is decided by plain functions in `features/onboarding/flow.ts`, which return a
description of the next screen and contain no navigation. That is why the
order of the quiz, the safety gate and the disclaimer can be unit-tested
without rendering anything.

`useQuizNavigation` is the one place that turns those decisions into router
calls, and the one place that fires `quiz_step_completed`.

## The plan: one set of rules, two places to run them

```
  screens (Today, plan preview, move sheet)
        │  useCurrentPlan(), useBuildPlan(), useMoveSession()
        ▼
  features/plan/queries.ts          TanStack Query, persisted to the phone
        ▼
  features/plan/repository.ts       one interface, two implementations
        │                                   │
   local mode                          remote mode
   (no backend keys)                   (Supabase keys present)
        │                                   │
        ▼                                   ▼
  plan service ── on the phone        plan service ── in the Edge Function
  localStore.ts (MMKV)                supabase-store.ts (Postgres, RLS)
        └──────────────┬────────────────────┘
                       ▼
        supabase/functions/_shared/engine     the ten rules, no I/O
```

The brief asks for the plan engine to run on the server. It does: the `plan`
Edge Function is its home. But the engine and the service above it are plain
TypeScript that reach storage only through one interface (`PlanStore`), so
until the backend keys exist the identical code runs on the phone against
MMKV and the bundled placeholder classes. Nothing about the screens changes
when the keys arrive; `repository.ts` picks the other implementation.

That is also why the shared code lives under `supabase/functions/_shared`:
Supabase bundles a function from that folder, and Deno needs relative imports
to carry the `.ts` extension. The app reaches it through the `@engine` and
`@shared` path aliases.

Three layers, each with one job:

- **engine/** decides. Pure functions: answers and catalogue in, plan out.
  No dates from the clock, no storage, no randomness.
- **plan-service.ts** decides when. Build from her answers; on every open,
  move what is overdue and roll into the next block; move; complete.
- **a store** remembers. Supabase on the server, MMKV on the phone.

"Today" is always passed in as a `YYYY-MM-DD` string in her own timezone,
worked out on the server from her users row and on the phone from the device.
The engine only ever does whole-day arithmetic on those strings, so daylight
saving and timezones cannot shift a session.

### What Today shows

`features/plan/today.ts` is a pure function from (plan, catalogue, today) to
everything on the screen: the state, the headline, the featured card, the
week strip, the ring, what is coming up and the line of encouragement. The
screen lays it out and decides nothing. Every state she can be in is a branch
there and a test in `today.test.ts`. `preview.ts` does the same for the
plan preview.

A dropped session is filtered out at the top of that function, so no later
line can count it, list it or mention it. "Never copy that blames her" is
enforced by there being nothing to say.

### The database

One migration, nine tables, row-level security on every one. `npm run
db:check` runs the migration and seed in a real Postgres (PGlite) and acts as
different users to prove that each can reach only her own rows. Two things
are held by the database itself and not left to code: a unique index means a
plan can never have two sessions on one day, and `save_plan` replaces a plan
and its sessions in one transaction.

## The player

```
  src/app/player.tsx            connects the rules to the video; decides nothing
        │                                   │
        ▼                                   ▼
  features/player/playback.ts        expo-video (native)
  the rules, no video in them        the picture and the sound
```

`playback.ts` holds everything that can be got wrong quietly: a class counts
as completed at 90%; the 25, 50 and 75 milestones are sent once each; her
place is saved every five seconds; a class resumes where she left off unless
she had barely started or already finished; closing asks first after more
than thirty seconds of actual playing. `ProgressTracker` is fed the playback
position a few times a second and reports what has just happened. It has no
video in it, so all of that is tested.

The screen is deliberately thin. It gives each class of a session its own
player, tracker and state (the component is keyed by class), so a session of
two classes is simply two of them in a row. The session is marked done when
its last class reaches 90%.

The video player is a native object driven by setting its properties, which
React's rules for hook values do not allow. `features/player/control.ts` is
the one place that happens.

Which video plays is decided in `features/player/sources.ts`: the class's own
Mux stream if it has one, otherwise the one sample video.

## State

| Kind                         | Tool                              | Where                                            |
| ---------------------------- | --------------------------------- | ------------------------------------------------ |
| Local, kept between launches | Zustand + MMKV                    | `features/onboarding/store.ts`                   |
| Local, for one screen        | `useState`                        | the screen                                       |
| Server data                  | TanStack Query, persisted to MMKV | `features/plan/queries.ts`, `lib/queryClient.ts` |

MMKV is synchronous, so persisted state is already loaded when the first
screen renders. The launch screen reads it and routes without a loading state.

## Navigation

Expo Router, on the native stack, so pushes are the system's own transitions.

```
/                     Launch (routes onward, never stays)
/welcome
/quiz/[step]          goal … first_name   ┐ one nested stack, with the back
/quiz/safety          the safety gate     │ arrow and progress bar fixed
/quiz/disclaimer      the health tick     ┘ above it
/holding              after "I'll check first"
/building             building your plan (the real plan call)
/plan-preview         her 28 days at a glance
/today /plan /progress /you     the four tabs
/class/[id]           a sheet: class detail
/player               the player (the only screen that may turn to landscape)
/after-class          "Nicely done." and "How did that feel?"
/library              all classes, with filters
/adjust               adjust my plan
/move/[sessionId]     a sheet: the days a session can move to
/dev/gallery          development only
```

The quiz header (back arrow and progress bar) lives in the quiz layout, above
the nested stack, so it stays still while questions push in beneath it.

The back arrow uses `router.dismissTo(previous step)`. That pops to the
previous question when it is in the history, and replaces the screen with it
when it is not, which happens after resuming from the holding screen.

Modals are native form sheets with detents. `sheetOptions()` in
`components/Sheet.tsx` is the single preset; `<Sheet>` is the content frame.

## The design system

`theme` holds tokens only. `components` holds everything visual. Two rules
keep it honest:

1. Components take colours from `useTheme()`, never from the palette. Dark is
   a second map of the same tokens.
2. Screens do not restyle. If a component cannot do something, the component
   is extended.

Motion goes through `theme/motion.ts`: one spring, named durations, and
helpers that return a cross-fade instead of movement when Reduce Motion is on.
Everything animated uses Reanimated shared values, so it runs on the UI
thread. Shared values are read and written with `.get()` and `.set()` because
the React Compiler is enabled.

## Privacy by construction

Health answers (`workAround`) exist in exactly two places: the onboarding
store on the phone, and, from milestone 2, our own database.

Analytics cannot receive them by accident. Every quiz answer passes through
`quizAnswerForAnalytics`, which reduces the health question to a single
yes-or-no flag and the name question to "did she give one". `track()` is
typed against the fixed event list, so an event that is not in the spec does
not compile.

Ad platforms are held the same way. `adEventFor` in `src/lib/adEvents.ts`
is the only door to the attribution provider, and it lets two events through:
a trial started and a subscription bought, each carrying the product and
nothing else. A test types every event the app can send against that rule.

Her identity outside our database is one random user ID, shared by Supabase,
RevenueCat, PostHog, Sentry and the attribution provider so that their
records join up. Her name and email stay in our database.

## Membership: one interface, two stores

The paywall never talks to RevenueCat. It talks to `PurchasesProvider`
(`src/features/membership/purchases/types.ts`): products, trial eligibility,
purchase, restore, the entitlement and a way to hear it change.

    paywall, You tab, Today
            │
            ▼
    PurchasesProvider ──► revenuecat.ts   StoreKit, on a phone with a key
                     └──► preview.ts      development only: the web preview,
                                          or a build with no key

Both are loaded on demand, behind `Platform.OS` and `__DEV__`, so the
preview store is not in a release bundle and the native library is never
touched on the web. The same pattern serves accounts (`supabaseAuth.ts` and
`previewAuth.ts`) and the plan (remote and local).

What the paywall **says** is separate from where the products come from.
`pricing.ts` takes whatever products the store returned and produces the
cards, the button, the terms and the timeline. That is where the honest
paywall is enforced, and it is all plain functions.

Her membership is reduced to six fields (`entitlement.ts`) and every state
the app shows follows from them. Nothing else decides whether she is a member.

**Who may watch** is decided by one function, `_shared/billing/access.ts`.
The app calls it to draw a lock. The `playback-token` function calls the
same code before it signs a video address, and that call is the one that
counts: the app cannot play a member class without a token only the server
can make.

## Configuration

`src/config/brand.ts` is the rename file. `app.config.ts` imports it, so the
native app name, scheme and bundle ID come from the same place as the wordmark
and the copy.

`src/config/env.ts` is the only reader of `process.env`. Every key is optional
and empty by default, so the app runs with no keys at all.

## Testing

- **The engine, rule by rule.** Each of the ten rules has its own tests, run
  against a large catalogue where every rule can hold at once. A second suite
  builds a plan from the sixteen seed classes for every combination of answers
  and checks the rules that are never relaxed.
- **The plan service** is tested against the phone's store: building, missed
  days, moving, completing, rolling into the next block.
- **What screens show** is tested as plain functions (`today.ts`,
  `preview.ts`) against real plans built by the real service.
- **Screens as behaviour tests.** `quiz-screen.test.tsx` renders the real quiz
  screen with the real store.
- **The hard rules as tests.** Contrast, banned copy, no typed prices, the
  product name in one file, health answers kept out of analytics.
- **The database** has its own checks (`npm run db:check`), including a
  check that row-level security is on for every table.
- **Native modules are stood in for** in `jest.setup.ts`; everything else runs
  for real.
- **The paywall** is tested twice: its wording as plain functions against the
  brief, and the screen itself, rendered and bought from against the preview
  store.
- **The server's rules** (what a RevenueCat event means, who may watch, the
  Mux token) are plain shared code, tested like the engine.
- **End-to-end (Maestro)** flows are in `.maestro`: first launch through a
  sandbox trial to a completed class, and the six App Store screenshots. They
  are written against the screens' `testID`s and have not been run, because
  this machine has no Simulator.
