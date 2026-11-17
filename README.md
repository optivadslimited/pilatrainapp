# Pilatrain: iOS app

A personal 28-day Pilates plan and one clear session to do today. She answers a
90-second quiz, gets a plan built from instructor-led classes, and opens the
app each training day to one session. The promise: she never has to decide
what to do next.

The marketing site is a separate repository (`optivadslimited/pilatrain`,
[pilatrain.com](https://pilatrain.com)).

- **Platform:** iPhone only, iOS 17 and later, portrait. English, light appearance.
- **Stack:** Expo SDK 58 (new architecture), React Native 0.88, TypeScript strict, Expo Router.
- **Dates:** TestFlight Mon 21 Dec 2026 · App Review Wed 30 Dec · launch Fri 15 Jan 2027.

## Where the build stands

| Milestone | Due | Delivers | Status |
| --- | --- | --- | --- |
| 1 | Sun 29 Nov | App shell, design system as tokens and components, onboarding quiz with safety gate | **Done** |
| 2 | Sun 6 Dec | Plan engine with tests, plan preview, Today screen | Next |
| 3 | Sun 13 Dec | Player, after-class feedback, Plan and Progress tabs | |
| 4 | Sun 20 Dec | Paywall and subscriptions, You tab, analytics, attribution, full test pass | |
| 5 | Mon 21 Dec | TestFlight build to 30 to 50 testers | |
| 6 | Wed 30 Dec | Submitted to App Review | |

### What works after milestone 1

- **Launch.** Paper screen, the wordmark fades in over 400 ms, then routes on
  what is saved on the phone: Welcome, the holding screen, or Today.
- **Welcome.** Photo block across the top 60%, headline, line, "Build my plan".
- **The quiz.** All nine questions, one per screen, with the thin progress bar,
  back arrow and auto-advance 250 ms after a single choice. Multi-select
  questions honour their exclusive answer ("Just a mat", "None"). The day picker
  pre-selects a spread and insists the number of days matches.
- **Safety gate.** "Pregnant or postpartum" or "Recent injury or surgery" opens
  the full-screen message. "I've been cleared to exercise" continues on the
  gentle track; "I'll check first" saves her answers and shows a holding
  screen, which the app reopens on until she is cleared. She can ask for one
  reminder in a week.
- **Health disclaimer.** Ticked by every user before the plan is built; the
  time is stored.
- **Building your plan.** The breathing ring and the three lines.
- **Four tabs** with honest empty states, and a You tab with the legal links
  and version.
- **Design system.** Every token and all the listed components, viewable in the
  in-app gallery (You → Component gallery, development builds only).

### What is stubbed

| Stub | Replaced in |
| --- | --- |
| "Building your plan" waits 3 seconds, then opens the tabs. There is no plan call yet. | Milestone 2 |
| Quiz answers are saved on the phone only. There is no Supabase session yet. | Milestone 2 |
| Today, Plan and Progress are empty states. | Milestones 2 and 3 |
| "I already have an account" shows a short message instead of sign-in. | Milestone 4 |
| Analytics events are typed and fired, but only printed to the console. PostHog is not connected. | Milestone 4 |
| PlanCard and PlayerControls exist as components but are not wired to StoreKit or video. | Milestones 3 and 4 |
| EAS Update is not configured (it needs the Expo project ID). | Milestone 5 |

### How it has been verified, and how it has not

Verified by `npm run check`: TypeScript (strict, with typed routes), ESLint,
and 122 Jest tests, all passing. A production iOS JavaScript bundle builds
with `npm run bundle:ios` (4.5 MB). The whole onboarding flow, both safety-gate
paths included, has been walked through in the web preview at 375 × 667
(iPhone SE) and 375 × 812.

**Not yet run on an iPhone or the iOS Simulator.** The machine this was built
on has no Xcode. Until it is, treat these as untested on a device: haptics,
the native push transitions, SF Symbols, the notification permission prompt
and the scheduled reminder, Dynamic Type at the largest size, VoiceOver, and
frame rate. See "What the owner needs to supply" below.

## Setup

Requirements: Node 22, npm, and for running on a simulator, a current Xcode.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Leave the values in `.env.local` empty until the keys exist. Every service
falls back to its local or stubbed mode when its key is missing. `.env.local`
is git-ignored; no key is ever committed.

### Run it

The app uses native modules (MMKV, Reanimated worklets), so it does **not**
run in Expo Go. Use a development build.

On the iOS Simulator (needs Xcode):

```bash
npx expo run:ios
```

After the first build, start the bundler alone:

```bash
npm start
```

A phone-sized preview in a browser, useful for reviewing layout and copy
without Xcode. It is a preview only; the product is iPhone only:

```bash
npm run web
```

### Checks

```bash
npm run check
```

That runs the three below in turn.

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint (Expo config) |
| `npm test` | Jest unit and screen tests |
| `npm run bundle:ios` | Builds the production iOS bundle into `dist/` |
| `npm run format` | Prettier |

## Environments

Three environments. `APP_ENV` chooses one at build time; each gets its own
bundle ID so all three can be installed side by side.

| Environment | `APP_ENV` | Name on the phone | Bundle ID | EAS profile |
| --- | --- | --- | --- | --- |
| Development | `development` | Pilatrain Dev | `com.pilatrain.app.dev` | `development` (simulator), `development-device` |
| Staging | `staging` | Pilatrain Staging | `com.pilatrain.app.staging` | `staging` |
| Production | `production` | Pilatrain | `com.pilatrain.app` | `production` |

Locally, `APP_ENV` is unset and the app is a development build. With EAS, the
profile sets it:

```bash
eas build --profile development --platform ios
```

```bash
eas build --profile staging --platform ios
```

```bash
eas build --profile production --platform ios
```

Secrets live in EAS environment variables, one set per
environment, using the names in `.env.example`. Only `EXPO_PUBLIC_*` values
reach the app, and all of them are publishable keys. The Supabase service-role
key, the Mux signing key and the RevenueCat webhook secret belong to the Edge
Functions and never appear in this app.

## Renaming the product

The name still needs a trademark check, so it lives in one file:
[src/config/brand.ts](src/config/brand.ts). Change `name`, `displayName`,
`wordmark`, `scheme`, `slug` and `bundleId` there and the app, the name under
the icon, the wordmark and every sentence that mentions the product follow.
A test (`src/strings/__tests__/copy.test.ts`) fails if the name is typed
anywhere else.

## The design system

Built before any screen, and the only place styling decisions are made.

- **Tokens** in [src/theme](src/theme): colour, type, layout and motion,
  exactly as specified. Components read semantic colours through `useTheme()`,
  so the dark appearance is a second colour map that is already written and
  switched off.
- **Components** in [src/components](src/components): Button, Chip, OptionCard,
  QuizProgressBar, Ring, ClassCard, DayPill, StatTile, Sheet, Toast, PlanCard,
  PlayerControls, EmptyState, Skeleton, plus the base pieces they share (Text,
  Icon, Screen, TextField, Checkbox, ListRow, PhotoPlaceholder, Wordmark).
- **Gallery** at `/dev/gallery`: every component on one screen for design
  review. Development builds only.
- **Strings** in [src/strings/en.ts](src/strings/en.ts): every word the user
  reads. Nothing is typed into a screen.

The rules that are easy to break by accident are held by tests:

| Rule | Test |
| --- | --- |
| Body text holds at least 4.5:1 contrast; no pure white or black | `src/theme/__tests__/colors.test.ts` |
| No weight-loss or medical claims, no guilt or streak pressure, no invented social proof, no typed prices, no emoji | `src/strings/__tests__/copy.test.ts` |
| Health answers never reach analytics, only a yes-or-no flag | `src/lib/__tests__/analytics.test.ts` |
| The safety gate appears for the two gated answers, and only those | `src/features/onboarding/__tests__/flow.test.ts` |

## Project layout

```
app.config.ts            Expo config. Reads src/config/brand.ts and APP_ENV.
eas.json                 Build profiles: development, staging, production.
.env.example             Every key the app reads, with none filled in.
src/
  app/                   Screens. The file tree is the route tree (Expo Router).
    index.tsx            Launch
    welcome.tsx
    quiz/                The quiz: [step], safety, disclaimer
    holding.tsx          After "I'll check first"
    building.tsx         Building your plan
    (tabs)/              Today · Plan · Progress · You
    dev/gallery.tsx      Component gallery (development only)
  components/            The design system
  config/                brand.ts (the rename file), env.ts
  features/onboarding/   Quiz definition, day spread, safety gate, flow, store
  lib/                   storage, haptics, analytics, reminders, formatting
  strings/               en.ts
  theme/                 Tokens
docs/architecture.md     A short walkthrough of how it fits together
```

## What the owner needs to supply

Every one of these is marked `TODO(owner)` in the code.

**To run and ship**

- [ ] **Xcode on the development Mac**, or an Expo account for EAS cloud builds. Nothing has been run on iOS yet.
- [ ] Apple Developer account and App Store Connect access.
- [ ] Expo account, then `eas init` to create the project ID (`app.config.ts`).
- [ ] Bundle ID confirmed. Assumed `com.pilatrain.app` (`src/config/brand.ts`). It cannot change after the first upload.

**Keys** (`.env.example`, `src/config/env.ts`)

- [ ] Supabase URL and anon key, one project per environment.
- [ ] RevenueCat public iOS SDK key.
- [ ] PostHog project key and host.
- [ ] Sentry DSN.
- [ ] Attribution tool chosen (AppsFlyer or Adjust), with its key and the App Store app ID.
- [ ] Mux keys (server side, for the Edge Functions; milestone 3).

**Content** (`src/config/brand.ts` and elsewhere)

- [ ] Instructor's name and credential. Shown as `[NAME]`, `[CREDENTIAL]` until supplied.
- [ ] Company legal name. Shown as `[COMPANY]`.
- [ ] Support email confirmed. Assumed `hello@pilatrain.com`.
- [ ] Trademark check on the name.
- [ ] Instructor photography. Each `PhotoPlaceholder` in the code is one photo; the Welcome hero is the first.
- [ ] App icon artwork, 1024 × 1024. The current icon is a generated placeholder (`assets/images/icon.png`).
- [ ] The sixteen classes with video, captions, thumbnails and the tag sheet (milestone 2 seeds placeholders).
- [ ] Sign-off on the dark colour map before it is ever switched on (`src/theme/colors.ts`).

## Assumptions made

Where the brief left a detail open, the calmer, simpler option was chosen.

- **Reanimated 4, not 3.** The brief names Reanimated 3; the latest stable Expo
  SDK ships Reanimated 4, which is the supported version on the new
  architecture. The API used (shared values, the standard spring, worklets) is
  the same.
- **JavaScript tab bar**, styled from the tokens (Paper, a hairline, Moss for
  the selected tab), rather than the system tab bar, so it matches the design
  and stays portable.
- **Fonts load at launch** behind the Paper splash rather than being embedded
  at build time. Two files, 73 KB each.
- **Suggested days:** 2 → Mon, Thu. 3 → Mon, Wed, Fri. 4 → Mon, Tue, Thu, Sat.
  5 → Mon, Tue, Wed, Fri, Sat. (`src/features/onboarding/weekdays.ts`)
- **Default reminder times:** morning 07:30, lunchtime 12:30, evening 18:30,
  "it varies" 09:00. (`src/features/onboarding/questions.ts`)
- **"Just a mat" is pre-selected** on the equipment question, since everyone
  has a mat, and it clears when she adds other equipment. Nothing is
  pre-selected on "Anything to work around".
- **Progress bar counts ten steps:** the nine questions and the disclaimer.
- **The safety gate sits directly after "Anything to work around"**, before the
  name question, and is not shown again once she has said she is cleared.
- **Holding-screen reminder** is one local notification, seven days later, with
  no sound. Our own screen explains it before the system prompt appears.
- **Dynamic Type** is supported up to the largest standard size (xxxLarge) and
  capped there, as the brief specifies.
- **The first name is optional** and an empty field shows "Skip".
- **Question subtitles** (one quiet line under each question) were written for
  this build; the question titles and answers are the brief's own.
- **Web preview** is kept as a development convenience only.
