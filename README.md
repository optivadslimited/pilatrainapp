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

| Milestone | Due        | Delivers                                                                            | Status   |
| --------- | ---------- | ----------------------------------------------------------------------------------- | -------- |
| 1         | Sun 29 Nov | App shell, design system as tokens and components, onboarding quiz with safety gate | **Done** |
| 2         | Sun 6 Dec  | Plan engine with tests, plan preview, Today screen                                  | **Done** |
| 3         | Sun 13 Dec | Player, after-class feedback, Plan and Progress tabs                                | Next     |
| 4         | Sun 20 Dec | Paywall and subscriptions, You tab, analytics, attribution, full test pass          |          |
| 5         | Mon 21 Dec | TestFlight build to 30 to 50 testers                                                |          |
| 6         | Wed 30 Dec | Submitted to App Review                                                             |          |

### What works

**Onboarding (milestone 1)**

- **Launch.** Paper screen, the wordmark fades in over 400 ms, then routes on
  what is saved on the phone: Welcome, the holding screen, or Today.
- **Welcome.** Photo block across the top 60%, headline, line, "Build my plan".
- **The quiz.** All nine questions, one per screen, with the thin progress bar,
  back arrow and auto-advance 250 ms after a single choice.
- **Safety gate.** "Pregnant or postpartum" or "Recent injury or surgery" opens
  the full-screen message. "I've been cleared to exercise" continues on the
  gentle track; "I'll check first" saves her answers and shows a holding
  screen, which the app reopens on until she is cleared.
- **Health disclaimer.** Ticked by every user before the plan is built.
- **Design system.** Every token and all the listed components, viewable in the
  in-app gallery (You → Component gallery, development builds only).

**The plan (milestone 2)**

- **Plan engine.** All ten rules, as plain deterministic TypeScript with a test
  for each. A test holds plan generation inside the 300 ms limit.
- **Building your plan** makes the real plan call and stays for at least 2.4
  seconds, with a retry state if the call fails.
- **Plan preview.** Headline with her name, three summary chips, week 1 in full,
  weeks 2 to 4 as softened rows, and the two actions.
- **Today.** The day and week, a headline that changes with her day, the large
  class card, the seven-day strip, the weekly ring, one quiet line drawn from
  her own numbers, and "Coming up" with Move. Pull to refresh, a skeleton while
  loading, an error state with retry.
- **Missed days.** A session not done by the end of its day moves to the next
  free day of its week, or is dropped if there is none. Today then says
  "Welcome back. Your plan has moved." Nothing anywhere says a day was missed.
- **Move.** A sheet of the days a session can go to, by the engine's own rules.
- **The next block** is built automatically when the 28 days end.
- **Database.** The nine tables with row-level security, and the seed of
  sixteen placeholder classes.
- **Local mode.** With no backend keys the whole plan runs on the phone, using
  the same code the server will run.

### What is stubbed

| Stub                                                                                                                                              | Replaced in          |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Start** shows a short message. There is no player yet.                                                                                          | Milestone 3          |
| "Try the first class free" goes to Today with the same message.                                                                                   | Milestone 3          |
| "Start my free week" goes straight to Today. There is no paywall yet.                                                                             | Milestone 4          |
| Rule 8 (her feedback changes the plan) is built and tested in the engine but nothing calls it, because the after-class screen does not exist yet. | Milestone 3          |
| "Adjust my plan", the Plan tab and the Progress tab.                                                                                              | Milestone 3          |
| The Supabase path is written but has never been run (see below). The app runs in local mode.                                                      | When keys arrive     |
| The sixteen classes, their tags, chapter times and easier options are placeholders. There is no video, no captions and no thumbnails.             | When content arrives |
| "I already have an account" shows a short message instead of sign-in.                                                                             | Milestone 4          |
| Analytics events are typed and fired, but only printed to the console.                                                                            | Milestone 4          |
| EAS Update is not configured (it needs the Expo project ID).                                                                                      | Milestone 5          |

### How it has been verified, and how it has not

`npm run check` passes: TypeScript (strict, with typed routes), ESLint,
**288 Jest tests**, and **26 database checks**. A production iOS JavaScript
bundle builds with `npm run bundle:ios` (5.2 MB).

- **The plan engine** has a test for every rule, run against a large
  catalogue where every rule can hold at once, and against the sixteen seed
  classes for every combination of answers (1,920 plans).
- **The database** migration and seed are run in a real Postgres (PGlite, in
  process, no Docker). The checks include that no other user can read her
  health answers or her plan, and that they fail when security is switched off.
- **The screens** have been walked through in the web preview at 375 × 667:
  quiz, plan build, preview, Today, moving a session, and each Today state
  (session due, done, rest day, plan moved) using the developer tools.

**Not yet run on an iPhone or the iOS Simulator.** The machine this was built
on has no Xcode. Treat as untested on a device: haptics, native transitions
and sheets, SF Symbols, the notification prompt and reminder, pull to refresh,
Dynamic Type at the largest size, VoiceOver, and frame rate.

**Not yet run against Supabase.** There is no project yet. Three files have
only been type-checked or read, never executed:
`supabase/functions/plan/index.ts` (the function's entry point),
`supabase/functions/_shared/supabase-store.ts` (rows to plans and back), and
the remote half of `src/features/plan/repository.ts`. Everything they call is
tested.

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

That runs the first four below in turn.

| Command              | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `npm run typecheck`  | TypeScript, strict                                                     |
| `npm run lint`       | ESLint (Expo config)                                                   |
| `npm test`           | Jest: engine, plan service, screens, copy rules                        |
| `npm run db:check`   | Runs the migration and seed in Postgres and checks row-level security  |
| `npm run seed:build` | Rebuilds `seed.sql` and the app's local catalogue from the class sheet |
| `npm run seed:check` | Fails if the class sheet and the generated files have drifted          |
| `npm run bundle:ios` | Builds the production iOS bundle into `dist/`                          |
| `npm run format`     | Prettier                                                               |

## Environments

Three environments. `APP_ENV` chooses one at build time; each gets its own
bundle ID so all three can be installed side by side.

| Environment | `APP_ENV`     | Name on the phone | Bundle ID                   | EAS profile                                     |
| ----------- | ------------- | ----------------- | --------------------------- | ----------------------------------------------- |
| Development | `development` | Pilatrain Dev     | `com.pilatrain.app.dev`     | `development` (simulator), `development-device` |
| Staging     | `staging`     | Pilatrain Staging | `com.pilatrain.app.staging` | `staging`                                       |
| Production  | `production`  | Pilatrain         | `com.pilatrain.app`         | `production`                                    |

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

| Rule                                                                                                               | Test                                             |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Body text holds at least 4.5:1 contrast; no pure white or black                                                    | `src/theme/__tests__/colors.test.ts`             |
| No weight-loss or medical claims, no guilt or streak pressure, no invented social proof, no typed prices, no emoji | `src/strings/__tests__/copy.test.ts`             |
| Health answers never reach analytics, only a yes-or-no flag                                                        | `src/lib/__tests__/analytics.test.ts`            |
| The safety gate appears for the two gated answers, and only those                                                  | `src/features/onboarding/__tests__/flow.test.ts` |

## The plan engine

Fixed rules, no machine learning. The engine is plain TypeScript with no I/O,
in [supabase/functions/_shared/engine](supabase/functions/_shared/engine), so
the same files run in the Supabase function, in the app's local mode and in
Jest. The same answers and catalogue always give the same plan.

| Rule                                                                          | Where                                |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| 1. Level, equipment, work-arounds, the gentle cap                             | `eligibility.ts`                     |
| 2. Her session length; shorter if none fits; a 20 and a 10 for a 30           | `fill.ts`                            |
| 3. Four themed weeks, opening with "Start here"                               | `eligibility.ts`, `build.ts`         |
| 4. The mix by goal                                                            | `mix.ts`                             |
| 5. No two intensity-3 sessions on consecutive days; weeks close with mobility | `fill.ts`, `build.ts`                |
| 6. No class more than twice, never twice in a row                             | `fill.ts`                            |
| 7. Her chosen weekdays, from the next one                                     | `build.ts`                           |
| 8. Her feedback raises or lowers the plan                                     | `feedback.ts`, `build.ts` (`replan`) |
| 9. Missed sessions move or are dropped; her own moves                         | `reschedule.ts`                      |
| 10. The next block, one step harder                                           | `feedback.ts`                        |

### When the rules cannot all hold

With enough classes every rule holds at once; a test builds plans from a large
catalogue for every kind of answer and expects no compromise at all. A small
catalogue cannot always manage it, so the engine gives rules up in a fixed
order, gentlest first, and records each one on the plan:

1. the goal's mix (a different focus than the mix asked for)
2. her session length (a shorter class)
3. the week's intensity cap (never above her own ceiling)
4. no class more than twice
5. a longer class than she asked for
6. the same class twice running (only if one class is all there is)

Two things are never given up: rule 1, and "never two intensity-3 sessions on
consecutive days".

### What the class sheet must cover

This matters for the real sixteen classes. Edit
[supabase/seed/classes.csv](supabase/seed/classes.csv), then run
`npm run seed:build`. Every value is checked against the engine's vocabulary.
[classes.template.csv](supabase/seed/classes.template.csv) is the empty form.

- **A "Start here" class**, slug `start-here`: ten minutes, level 1,
  intensity 1, mat only, unsuitable for nobody, and the one free class.
- **Classes that suit everyone.** Someone who ticks every "work around" answer
  still needs a plan. The seed has at least two such classes at each length.
- **Two short mobility classes that suit everyone**, so the weekly mobility
  close does not have to repeat one.
- **Enough classes at each length.** A block has (days a week × 4) sessions and
  a class may be used twice, so a plan needs (days a week × 2) suitable
  classes at or under her session length. A ten-minute plan can only draw on
  ten-minute classes. The seed has five of those for a beginner, which covers
  two days a week and no more.

**With the sixteen placeholder classes**, for someone with nothing to work
around, "no class more than twice" holds for any two-day plan, for 20-minute
plans up to four days a week, and for 30-minute plans up to three. Beyond
that the engine uses a class a third time, never twice in a row, and never
leaves a day empty. A test pins exactly which plans are affected, so adding
classes will show up as that test changing.

**The placeholder tags are not instruction.** Which classes are unsuitable for
which conditions, the chapter times and the easier options were written to
exercise the engine. The instructor must supply the real ones.

## The backend

Supabase: Postgres with row-level security, anonymous sign-in from first
launch, and one Edge Function, `plan`.

- [supabase/migrations](supabase/migrations): the nine tables. Each user reads
  and writes only her own rows; class details are readable by everyone;
  membership is read-only to its owner and written by the service role.
- [supabase/seed.sql](supabase/seed.sql): generated from the class sheet.
- [supabase/functions/plan](supabase/functions/plan): build, current, move and
  complete. It runs as the caller, never with the service role, and works out
  "today" from the timezone on her users row.

Health answers live in `quiz_answers.work_around` and in the copy inside
`plans.profile`. Both are readable only by their owner.

**Until the keys exist the app runs in local mode**: the same plan service
runs on the phone against the bundled placeholder classes and nothing leaves
the device. You → Developer shows which mode a build is in.

When the projects exist (one each for development, staging and production):

1. Turn on anonymous sign-ins in the project's Auth settings.
2. Apply the migration and deploy the function with the Supabase CLI:
   `supabase link`, `supabase db push`, `supabase functions deploy plan`.
3. Run `supabase/seed.sql` in the SQL editor.
4. Put the project URL and publishable key in the environment
   (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

These steps have not been run. Expect the first run to turn up small things
in the three unexecuted files listed above.

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
    building.tsx         Building your plan (the real plan call)
    plan-preview.tsx     Her 28 days at a glance
    (tabs)/              Today · Plan · Progress · You
    move/[sessionId].tsx The sheet for moving a session
    dev/gallery.tsx      Component gallery (development only)
  components/            The design system
  config/                brand.ts (the rename file), env.ts
  features/
    onboarding/          Quiz definition, day spread, safety gate, flow, store
    plan/                Repository (local or remote), queries, and what
                         Today and the preview show (today.ts, preview.ts)
  lib/                   storage, supabase, clock, haptics, analytics, formatting
  strings/               en.ts
  theme/                 Tokens
supabase/
  migrations/            The schema and row-level security
  seed/classes.csv       The class sheet (source of truth for class tags)
  seed.sql               Generated from the sheet
  functions/
    _shared/engine/      The plan engine: the ten rules
    _shared/             plan-service.ts, supabase-store.ts
    plan/                The Edge Function
scripts/
  build-seed.ts          Class sheet → seed.sql and the app's local catalogue
  check-db.ts            Migration, seed and row-level security checks
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
- [ ] Mux keys (server side, for the Edge Functions; milestone 3), and one sample video to stand in for all sixteen classes.
- [ ] Anonymous sign-ins switched on in each Supabase project.

**Content** (`src/config/brand.ts` and elsewhere)

- [ ] Instructor's name and credential. Shown as `[NAME]`, `[CREDENTIAL]` until supplied.
- [ ] Company legal name. Shown as `[COMPANY]`.
- [ ] Support email confirmed. Assumed `hello@pilatrain.com`.
- [ ] Trademark check on the name.
- [ ] Instructor photography. Each `PhotoPlaceholder` in the code is one photo; the Welcome hero is the first.
- [ ] App icon artwork, 1024 × 1024. The current icon is a generated placeholder (`assets/images/icon.png`).
- [ ] The sixteen classes with video, captions and thumbnails, and the instructor's tag sheet filled into `supabase/seed/classes.csv`: level, length, focus, intensity, equipment, what each class is unsuitable for, chapter times and an easier option per chapter. See "What the class sheet must cover". The current sheet is placeholder content.
- [ ] A decision on catalogue size. Sixteen classes cannot give every plan "no class more than twice" (ten-minute plans three or more days a week are the clearest case). More short classes fix it; otherwise the engine repeats a class a third time.
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

**Milestone 2: the plan**

- **A plan starts the day it is built** and its weeks are seven-day windows
  from that day, not calendar weeks. Her first session is on her next chosen
  day, which is today if today is one of them. The week strip starts on the
  plan's own first day.
- **What the themes do.** The brief names the four themes but not their
  effect. Each sets how intense its week may be: a beginner's weeks are capped
  at 1, 2, 2, 2 and an improver's at 2, 2, 3, 3.
- **The mix.** The brief gives each goal's headline share ("half core"). The
  rest of each mix is our choice (`mix.ts`). The headline share is exact
  whenever the catalogue allows.
- **Gentle track.** Half of her mix goes to mobility and foundations, and
  intensity never passes 2, whatever her feedback.
- **The order rules are given up in** when a small catalogue cannot satisfy
  them all, listed above. The weekly mobility close is held even if that means
  repeating a mobility class.
- **A 30-minute first session** is "Start here" followed by a 20.
- **Feedback** (rule 8) moves intensity from the next week onward, not for one
  week only, and "adds a foundations class" turns one of next week's sessions
  into foundations: her days are fixed, so there is no extra day to add one to.
- **"At the top"** means raising intensity would change nothing she can be
  given, at which point sessions get longer instead.
- **The next block** does not send her back to "Start here"; starts today,
  not in the past, if she has been away; and only steps up if she did at least
  half of the last block.
- **Moves stay inside the session's own week**, for missed sessions and for
  her own. A session done early is recorded on the day she did it.
- **Before her first session, on a day that is not one of hers**, Today says
  "Your plan starts on Wednesday." and lets her start now. The brief's four
  headlines did not cover that day.
- **The weekly ring counts sessions still in her plan.** A dropped session is
  not counted against her.
- **Data model additions:** `plans.block`, `plans.profile` and
  `plans.moved_notice_date`; `plan_sessions.paired_class_id` and
  `original_date`; `instructors.slug`. A unique index holds "never two
  sessions on one day", and `save_plan` stores a plan all or nothing.
- **The class sheet uses plain columns** (pipe-separated lists, two chapter
  times, three easier-option cells) and a script turns it into SQL, so it can
  be filled in a spreadsheet.
