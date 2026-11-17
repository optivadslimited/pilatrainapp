# Architecture walkthrough

A short tour of how the app fits together. It grows with each milestone; this
version covers milestone 1.

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

## State

| Kind | Tool | Where |
| --- | --- | --- |
| Local, kept between launches | Zustand + MMKV | `features/onboarding/store.ts` |
| Local, for one screen | `useState` | the screen |
| Server data | TanStack Query | `lib/queryClient.ts` (used from milestone 2) |

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
/building             building your plan
/today /plan /progress /you     the four tabs
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

## Configuration

`src/config/brand.ts` is the rename file. `app.config.ts` imports it, so the
native app name, scheme and bundle ID come from the same place as the wordmark
and the copy.

`src/config/env.ts` is the only reader of `process.env`. Every key is optional
and empty by default, so the app runs with no keys at all.

## Testing

- **Rules as unit tests.** Flow, day spread, store, formatting, contrast, and
  the copy rules (banned words, no typed prices, no product name outside the
  brand file).
- **Screens as behaviour tests.** `quiz-screen.test.tsx` renders the real quiz
  screen with the real store and checks what she would see and where she
  would be sent.
- **Native modules are stood in for** in `jest.setup.ts`; everything else runs
  for real.
- **End-to-end (Maestro)** arrives with the full test pass in milestone 4.
  Controls already carry `testID`s for it.
