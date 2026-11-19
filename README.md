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
| 3         | Sun 13 Dec | Player, after-class feedback, Plan and Progress tabs                                | **Done** |
| 4         | Sun 20 Dec | Paywall and subscriptions, You tab, analytics, attribution, full test pass          | **Done** |
| 5         | Mon 21 Dec | TestFlight build to 30 to 50 testers                                                | Next     |
| 6         | Wed 30 Dec | Submitted to App Review                                                             |          |

### What works

**Onboarding (milestone 1)**

- **Launch.** Paper screen, the wordmark fades in over 400 ms, then routes on
  what is saved on the phone: Welcome, the holding screen, or Today.
- **Welcome.** A photo across the top 60% (a stand-in for now, see "What is
  stubbed"), headline, line, "Build my plan".
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
  her own numbers, and "Coming up" with Move.
- **Missed days.** A session not done by the end of its day moves to the next
  free day of its week, or is dropped if there is none. Today then says
  "Welcome back. Your plan has moved." Nothing anywhere says a day was missed.
- **The next block** is built automatically when the 28 days end.
- **Database.** The nine tables with row-level security, and the seed of
  sixteen placeholder classes.
- **Local mode.** With no backend keys the whole plan runs on the phone, using
  the same code the server will run.

**Classes (milestone 3)**

- **Class detail.** A sheet from any class card: the photo, the instructor and
  her credential, length, level, focus, equipment, three "What you'll do"
  lines, the easier-option note, and Start.
- **Player.** Video on top with the chapter list below; full screen in
  landscape. Play and pause, ten seconds back and forward, a scrubber with
  chapter marks, captions (on by default), AirPlay, close. An "Easier option"
  card for the chapter that is playing. Controls fade after three seconds.
  Closing after more than thirty seconds asks first. Her place is saved every
  five seconds and resumed. A class counts as completed at 90%.
- **After class.** "Nicely done.", the weekly ring filling, minutes and
  sessions, "How did that feel?", what is next, and Done, with the one success
  haptic.
- **Feedback changes the plan** (rule 8). Two "too hard" in a row ease next week
  and add a foundations class; two "too easy" step it up, or lengthen sessions
  at the top. She is told once, quietly.
- **Plan tab.** Four weeks with their themes, every session with its state,
  Move on each, "Adjust my plan" and "Browse all classes".
- **Adjust my plan.** The days, time and length questions on one screen; the
  rest of her plan is laid out again and what she has done is kept.
- **Library.** All sixteen classes, filter chips for length and focus, locked
  beyond the free class for a non-member.
- **Progress tab.** Three stat tiles, a consistency ring, a four-week bar
  chart, a month view with a dot on each day she trained, and one line on how
  the classes have felt.

**Membership (milestone 4)**

- **Paywall.** A close button from the first frame; the headline; three ticked
  lines; three plan cards with the store's full price as the largest text and
  the per-month figure smaller; the three-point trial timeline; "Start 7-day
  free trial"; the exact terms directly under it; Terms, Privacy and Restore
  purchases. Quarterly is pre-selected, or Yearly if the `paywall_variant`
  flag says so. It opens after the plan preview, after the free class, from a
  locked class, from Today and from the You tab.
- **No price is typed into the app.** Every figure on the paywall is the
  store's own string, or a sum on the store's number. Someone who cannot have
  the free trial sees "Subscribe" and the word "free" nowhere.
- **Purchases.** Pending, failed and cancelled each say so plainly; restore is
  on the paywall and the You tab; offer codes and "Manage subscription" open
  Apple's own sheets.
- **What is free.** Her first session, until she has finished it, and any
  class marked free. Everything else needs a membership. One rule decides
  this, and the server applies the same rule before it hands out a video.
- **Accounts.** Sign in with Apple first, an emailed link second (with a
  6-digit code for when the link opens elsewhere). Creating an account
  attaches to the anonymous user she already is, so her plan and membership
  carry over untouched. Always optional.
- **Reminders.** "Want a nudge on your Pilates days?" on its own screen,
  showing her days and time. One notification on each day she has a session,
  kept in step with her plan as sessions are done or moved.
- **The trial reminder.** Two days before the free week ends, a notification
  and a banner on Today name the date and the price that follows. Neither is
  shown if she has already cancelled.
- **Today's other states.** Without a membership the session card stays, with
  one button, "Continue your plan". A payment problem shows a banner while
  Apple retries, and she keeps access meanwhile. With no connection it says so.
- **You tab.** Days and time, reminders, her plan and its renewal date, manage
  subscription, restore, redeem a code, account, sign out, help by email, the
  legal pages, the version, and **Delete account and data**, in two steps.
- **Analytics** to PostHog, **crashes** to Sentry, **attribution** to
  Adjust. Each does nothing until its key is supplied. Ad platforms hear a
  trial start and a purchase, and nothing else.
- **The server side.** Three more Edge Functions: the RevenueCat webhook keeps
  each member's row current; `playback-token` checks membership before
  signing a short-lived Mux token; `delete-account` removes her user and
  everything of hers.

### What is stubbed

| Stub                                                                                                                                                                                                                                                                                                                     | Replaced                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Purchases run against a preview store.** With no RevenueCat key, development builds and the web preview use a stand-in that sells the three products from `storekit/Pilatrain.storekit`. Nothing is bought. It is left out of release builds, where a missing key means the paywall says membership is unavailable.    | When the RevenueCat key arrives               |
| **Accounts run against a stand-in** in development when there is no backend: creating one always works and any six digits are accepted as the code. Left out of release builds.                                                                                                                                          | When the Supabase keys arrive                 |
| **Every class plays one sample video.** There are no real classes, captions files or thumbnails yet. Chapter times are scaled to fit the sample.                                                                                                                                                                         | When content arrives                          |
| **Every photo is a generated stand-in.** The Welcome hero and one photo per class are images made with Higgsfield, in `assets/images/stand-ins`, listed in `src/config/photos.ts`. The woman in them is not a real person and is not the instructor. A class shows its own `thumbnail_url` as soon as the sheet has one. | Before release: replace with real photography |
| **The trial reminder is a notification scheduled on the phone**, not one sent from a server. It arrives whether or not the app is open, but only if she has allowed notifications; the banner on Today does not depend on that.                                                                                          | To decide                                     |
| A class taken from the library on its own is not counted in Progress. Only sessions of her plan are.                                                                                                                                                                                                                     | To decide                                     |
| Deleting an account does not erase analytics events already sent to PostHog under her random ID.                                                                                                                                                                                                                         | To decide                                     |
| The Supabase path, the four Edge Functions and every outside service are written but have never been run (see below). The app runs in local mode.                                                                                                                                                                        | When keys arrive                              |
| EAS Update is not configured (it needs the Expo project ID).                                                                                                                                                                                                                                                             | Milestone 5                                   |

### How it has been verified, and how it has not

`npm run check` passes: TypeScript (strict, with typed routes), ESLint,
**484 Jest tests**, and **32 database checks**. A production iOS JavaScript
bundle builds with `npm run bundle:ios` (10 MB), and has been searched: it
contains no preview store, no developer tools and no price.

- **The plan engine** has a test for every rule, run against a large
  catalogue where every rule can hold at once, and against the sixteen seed
  classes for every combination of answers (1,920 plans).
- **The paywall's wording** is tested against the brief, word for word, using
  the products in the StoreKit configuration: the three cards, "Save 58%",
  the per-month lines, the terms under the button, the timeline, and the
  no-trial version. The screen itself is rendered in a test and bought from,
  cancelled, failed and restored.
- **Privacy.** A test types every event the app can send and fails if anything
  but a trial start and a purchase reaches an ad platform, or if a health
  answer reaches analytics as more than yes or no.
- **The server's rules** are plain code with their own tests: what each
  RevenueCat event means, who may watch a class, and the Mux token, whose
  signature is verified against the public key.
- **The player's rules** (completion at 90%, the 25/50/75 milestones, saving
  every five seconds, resuming, the close confirmation, chapters) are plain
  code with their own tests.
- **The database** migrations and seed are run in a real Postgres (PGlite, in
  process, no Docker). The checks include that no other user can read her
  health answers or her plan, that membership is written by the server only,
  and that they fail when security is switched off.
- **The screens** have been walked through in the web preview at 375 × 667,
  against the preview store: a new user from the quiz to the plan preview,
  the paywall opened and closed, the free class played, the paywall that
  follows it, account and reminders declined, and Today with the next session
  locked; a purchase through to an account by email and the reminder screen;
  the no-trial paywall; a failed purchase; the trial-ending, payment-problem
  and offline banners; a lapsed membership; a locked class from the library
  and by direct link; and account deletion.

**Run on the iOS Simulator, not yet on an iPhone.** The app was first built
and run natively on 19 November 2026 (Xcode 27.2, iPhone 17 simulator, iOS
27.2), against the preview store and in local mode. Seen working there:

- launch, the Welcome screen and the whole quiz, with native transitions;
- the plan built on the device, and the plan preview;
- the paywall, a purchase from the preview store, the create-account screen
  with Apple's own "Continue with Apple" button, and the reminder screen
  followed by the real iOS notification prompt;
- Today, the Plan tab, and the class detail sheet with the system's own
  sheet physics;
- the player: adaptive (HLS) playback of the sample stream, captions on by
  default, the controls fading after three seconds, scrubbing, the chapter
  list following the video, and the class completing into the after-class
  screen;
- everything still there after the app and the simulator were restarted.

That first run found three faults, all fixed:

- **The class detail sheet opened blank.** On iOS the native sheet sizes the
  scroll area itself, and the Sheet component's layout fought it. The footer
  is now an opaque bar over the scroll area. See `src/components/Sheet.tsx`.
- **The player's status bar was dark on dark.** On iOS it is set per screen
  in the navigator, not from inside the screen.
- **A video that was still loading looked paused.** The centre button now
  shows a spinner whenever the video is meant to be playing and is not.

Still not seen on a device, and so still untested: a real iPhone at all;
haptics; VoiceOver; Dynamic Type at the largest size; the player in landscape,
AirPlay, the screen staying awake and the "Leave this class?" card; a
notification actually arriving; the Progress and You tabs; Sign in with Apple
itself; frame rate.

Two things from that run to look at again:

- **Seeking near the end of the sample stream.** After scrubbing to 9:43 of
  10:00, the test pattern's own on-screen clock jumped back to zero, though
  the class still completed and the after-class screen opened as it should.
  It may be the sample stream; check it with a real class video.
- **On an iPhone 17 the paywall's three-point timeline sits just below the
  fold.** The close button, the three plans, the button and the terms are all
  on screen at once; the timeline needs a short scroll. Smaller phones will
  scroll more.

**Not yet run against any outside service.** There are no accounts yet, so
none of these has ever been executed. Each is marked `NOT YET RUN` in its
own file. Everything they call is tested; the calls themselves are not.

- **Supabase:** the four function entry points under `supabase/functions`
  (type-checked against a stand-in for the Deno runtime),
  `_shared/supabase-store.ts`, the remote half of
  `src/features/plan/repository.ts`, and `src/features/account/supabaseAuth.ts`.
- **RevenueCat and StoreKit:** `src/features/membership/purchases/revenuecat.ts`,
  the webhook's event shapes, and the REST call in `_shared/billing`.
- **Sign in with Apple, notifications and the tracking prompt:** all native.
- **PostHog, Sentry, Adjust and Mux signed playback.**
- **The Maestro flows** in `.maestro`: written against the app's test IDs,
  never executed, because there is no Simulator here.

These are the libraries newest to this build. Expect the first device build
to turn up small things in each.

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

| Command                  | What it does                                                              |
| ------------------------ | ------------------------------------------------------------------------- |
| `npm run typecheck`      | TypeScript, strict                                                        |
| `npm run lint`           | ESLint (Expo config)                                                      |
| `npm test`               | Jest: engine, plan service, player rules, screens, copy rules             |
| `npm run db:check`       | Runs the migration and seed in Postgres and checks row-level security     |
| `npm run seed:build`     | Rebuilds `seed.sql` and the app's local catalogue from the class sheet    |
| `npm run seed:check`     | Fails if the class sheet and the generated files have drifted             |
| `npm run storekit:build` | Rebuilds the preview store's product list from the StoreKit configuration |
| `npm run storekit:check` | Fails if the two have drifted (also run by the tests)                     |
| `npm run bundle:ios`     | Builds the production iOS bundle into `dist/`                             |
| `npm run format`         | Prettier                                                                  |

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
key, the Mux signing key and the RevenueCat secrets belong to the Edge
Functions and never appear in this app. [docs/services.md](docs/services.md)
lists every key and where it goes.

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
  PlayerControls, EmptyState, Skeleton, BarChart, MonthGrid, Banner, plus the base
  pieces they share (Text, Icon, Screen, TextField, Checkbox, ListRow, Photo,
  PhotoPlaceholder, Wordmark).
- **Gallery** at `/dev/gallery`: every component on one screen for design
  review. Development builds only.
- **Strings** in [src/strings/en.ts](src/strings/en.ts): every word the user
  reads. Nothing is typed into a screen.

The rules that are easy to break by accident are held by tests:

| Rule                                                                                                               | Test                                                |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Body text holds at least 4.5:1 contrast; no pure white or black                                                    | `src/theme/__tests__/colors.test.ts`                |
| No weight-loss or medical claims, no guilt or streak pressure, no invented social proof, no typed prices, no emoji | `src/strings/__tests__/copy.test.ts`                |
| Health answers never reach analytics, only a yes-or-no flag                                                        | `src/lib/__tests__/analytics.test.ts`               |
| The safety gate appears for the two gated answers, and only those                                                  | `src/features/onboarding/__tests__/flow.test.ts`    |
| The paywall says what the brief says; no price is typed; "free" is never promised to someone who cannot have it    | `src/features/membership/__tests__/pricing.test.ts` |
| Ad platforms receive a trial start and a purchase, and nothing else                                                | `src/lib/__tests__/adEvents.test.ts`                |
| Reminders never arrive for a session that is done or gone, and never use pressure                                  | `src/features/reminders/__tests__/schedule.test.ts` |

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
launch, and four Edge Functions.

- [supabase/migrations](supabase/migrations): the tables. Each user reads and
  writes only her own rows; class details are readable by everyone;
  membership is read-only to its owner and written by the service role.
- [supabase/seed.sql](supabase/seed.sql): generated from the class sheet.
- [supabase/functions/plan](supabase/functions/plan): build, current, move,
  complete, rate and adjust. It runs as the caller, never with the service
  role, and works out "today" from the timezone on her users row.
- [supabase/functions/revenuecat-webhook](supabase/functions/revenuecat-webhook):
  keeps one row per member in `subscriptions`. Each event is applied once, a
  late one cannot undo a newer one, and the four subscription events the spec
  names are reported to PostHog from here.
- [supabase/functions/playback-token](supabase/functions/playback-token): the
  lock on the video. See "Video" below.
- [supabase/functions/delete-account](supabase/functions/delete-account):
  removes her auth user and, by foreign key, every row that belongs to her,
  then her customer record at RevenueCat.

The rules those functions run are plain shared code in
[supabase/functions/_shared/billing](supabase/functions/_shared/billing),
tested by Jest like the plan engine.

Health answers live in `quiz_answers.work_around` and in the copy inside
`plans.profile`. Both are readable only by their owner, and nothing sends
them anywhere else.

**Until the keys exist the app runs in local mode**: the same plan service
runs on the phone against the bundled placeholder classes and nothing leaves
the device. You → Developer shows which mode a build is in.

[docs/services.md](docs/services.md) is the step-by-step for switching each
service on: App Store Connect, RevenueCat, Supabase, Mux, PostHog, Sentry and
Adjust. None of those steps has been run.

## Membership

- **Products.** `pilatrain_annual`, `pilatrain_quarterly` and
  `pilatrain_monthly`, one subscription group, each with a 7-day free trial.
  RevenueCat entitlement `member`, one default offering. The IDs are in
  [src/config/brand.ts](src/config/brand.ts).
- **Where prices come from.** StoreKit, through RevenueCat, and nowhere else.
  [storekit/Pilatrain.storekit](storekit/Pilatrain.storekit) is the StoreKit
  test configuration for Xcode; it is also what the preview store reads in
  development, through `npm run storekit:build`. It is the only file with a
  price in it and it does not ship.
- **What the paywall says** is worked out in
  [src/features/membership/pricing.ts](src/features/membership/pricing.ts).
- **Her membership** is RevenueCat's `member` entitlement, reduced to six
  fields in [entitlement.ts](src/features/membership/entitlement.ts). Every
  state follows from those: free week, paid, payment problem, ended.
- **Who may watch what** is one rule,
  [supabase/functions/_shared/billing/access.ts](supabase/functions/_shared/billing/access.ts),
  used by the app to draw locks and by the server to decide.
- **Trying it without a store.** In a development build, You → Developer →
  "Preview store" puts her straight into any membership state, turns the free
  trial on or off, and sets how the next purchase ends. "Skip to tomorrow"
  runs a trial out.

Analytics events, the two funnels and the flag are in
[docs/analytics.md](docs/analytics.md). Attribution and the tracking prompt
are in [docs/attribution.md](docs/attribution.md). The App Review checklist
and the demo account are in [docs/app-review.md](docs/app-review.md), and the
privacy labels in [docs/privacy-labels.md](docs/privacy-labels.md).

## Video

Classes play through `expo-video`. A class with a Mux playback ID plays its
own adaptive stream, and that stream is **signed**: the address only works
with a short-lived token. Before playing, the app asks the `playback-token`
function for one, and the function checks on the server that she may watch
that class: she is a member, or it is the free class, or it is the first
session of her first plan. What the app shows as locked is a courtesy; that
check is the lock. If her purchase's webhook has not arrived yet, the
function asks RevenueCat directly rather than refuse a new member.

Until the real classes exist, **every class plays one sample video**. It is
set in the environment:

- `EXPO_PUBLIC_SAMPLE_VIDEO_URL`: any HLS address. Left empty, the app uses
  Apple's public test stream, chosen because it carries captions, so the
  captions toggle can be seen working on a device. It is a test pattern, not a
  class.
- The web preview cannot play HLS, so it plays a five-second CC0 clip from
  MDN instead.

Because the sample is not the length of the class it stands in for, the
class's chapter times are scaled to fit it. A class with its own video keeps
its own times.

When the classes are on Mux: put each playback ID in the class sheet
(`mux_playback_id`), run `npm run seed:build`, and the sample is no longer
used for that class. Captions come from the stream's own subtitle tracks, so
add them to the Mux asset; `captions_url` in the sheet is kept for reference.

## Project layout

```
app.config.ts            Expo config, the privacy manifest. Reads brand.ts and APP_ENV.
eas.json                 Build profiles: development, staging, production.
.env.example             Every key the app reads, with none filled in.
storekit/                The StoreKit test configuration: the three products.
.maestro/                End-to-end flows (not yet run).
src/
  app/                   Screens. The file tree is the route tree (Expo Router).
    index.tsx            Launch
    welcome.tsx
    quiz/                The quiz: [step], safety, disclaimer
    holding.tsx          After "I'll check first"
    building.tsx         Building your plan (the real plan call)
    plan-preview.tsx     Her 28 days at a glance
    paywall.tsx          The paywall
    create-account.tsx   Create account · sign-in.tsx · email.tsx · auth.tsx (the emailed link)
    reminders.tsx        "Want a nudge on your Pilates days?"
    (tabs)/              Today · Plan · Progress · You
    class/[id].tsx       Class detail (a sheet)
    player.tsx           The player
    after-class.tsx      "Nicely done." and "How did that feel?"
    library.tsx          All classes, with filters
    adjust.tsx           Adjust my plan
    move/[sessionId].tsx The sheet for moving a session
    delete-account.tsx   Delete account, in two steps
    dev/gallery.tsx      Component gallery (development only)
  components/            The design system
  config/                brand.ts (the rename file, and the product IDs), env.ts
                         photos.ts (the stand-in photos, until the real ones)
  features/
    onboarding/          Quiz definition, day spread, safety gate, flow, store,
                         and what follows the paywall (next.ts)
    plan/                Repository (local or remote), queries, and what each
                         screen shows (today.ts, preview.ts, planTab.ts,
                         progress.ts)
    player/              The player's rules (playback.ts), video sources
    membership/          Products, what the paywall says (pricing.ts), her
                         entitlement, and purchases/: the RevenueCat adapter
                         and the development preview store
    account/             Sign in with Apple, email, sign-out, delete
    reminders/           What to remind her of and when (schedule.ts)
    dev/                 Developer tools (development only)
  lib/                   storage, supabase, clock, haptics, formatting,
                         analytics and its sinks (posthog, attribution,
                         adEvents), sentry, flags, reminders, connection
  strings/               en.ts
  theme/                 Tokens
supabase/
  migrations/            The schema and row-level security
  seed/classes.csv       The class sheet (source of truth for class tags)
  seed.sql               Generated from the sheet
  functions/
    _shared/engine/      The plan engine: the ten rules
    _shared/billing/     Who may watch, what a RevenueCat event means, Mux tokens
    _shared/             plan-service.ts, supabase-store.ts
    plan/                revenuecat-webhook/ · playback-token/ · delete-account/
scripts/
  build-seed.ts          Class sheet → seed.sql and the app's local catalogue
  build-storekit.ts      StoreKit configuration → the preview store's products
  check-db.ts            Migration, seed and row-level security checks
docs/
  architecture.md        A short walkthrough of how it fits together
  services.md            Switching each outside service on, step by step
  analytics.md           Events, the two funnels, the flag
  attribution.md         Adjust, the tracking prompt, conversion values
  app-review.md          The App Review checklist and the demo account
  privacy-labels.md      What to answer under App Privacy
```

## What the owner needs to supply

Every one of these is marked `TODO(owner)` in the code.

**To run and ship**

- [x] **Xcode on the development Mac.** Installed, with CocoaPods. The app compiles for the iOS Simulator (first built 19 November 2026). Still to do once: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, so Xcode's tools work from any terminal.
- [ ] Apple Developer account and App Store Connect access. Requested 19 November 2026; waiting on Apple.
- [x] Expo account and project. The project ID is in `src/config/brand.ts`. Still to do before the first cloud build: `npx eas-cli login`.
- [x] Bundle ID confirmed: `com.pilatrain.app` (`src/config/brand.ts`). It cannot change after the first upload.

**Keys** (`.env.example`, `src/config/env.ts`)

Step by step in [docs/services.md](docs/services.md).

- [ ] **App Store Connect:** the subscription group and three products, each with a one-week free trial, and Billing Grace Period switched on. Prices are set there.
- [ ] **RevenueCat:** the project, the `member` entitlement, a default offering, the public iOS SDK key, a webhook secret and a secret API key.
- [ ] **Supabase:** URL and anon key, one project per environment, with anonymous sign-ins, manual linking and the Apple provider switched on, and the email templates changed to carry the link and the code.
- [ ] **Mux:** a signing key, and each member class set to signed playback.
- [ ] **PostHog:** project key and host, the `paywall_variant` flag and the two funnels.
- [ ] **Sentry:** the DSN, and the organisation, project and auth token for source maps.
- [ ] **Adjust:** the app token, and the tokens of two events created in its dashboard ("Trial started" and "Subscription started").
- [ ] A sample video of your own, if you would rather not see a test pattern (`EXPO_PUBLIC_SAMPLE_VIDEO_URL`).

**Decisions**

- [ ] The event name `subscription_started`, added for a purchase with no trial. The spec lists none. ([docs/analytics.md](docs/analytics.md))
- [ ] Whether the trial reminder should also be sent from a server. Today it is scheduled on the phone.
- [ ] Whether deleting an account should also erase her analytics events at PostHog. That needs a PostHog personal API key.
- [ ] The privacy labels, confirmed by whoever is responsible for privacy. ([docs/privacy-labels.md](docs/privacy-labels.md))
- [ ] A demo account for App Review. ([docs/app-review.md](docs/app-review.md))
- [ ] "Every class led by [NAME], certified" is on the paywall. The certification must be true before launch.
- [ ] The Terms, Privacy and Health disclaimer pages must exist at the addresses in `src/config/brand.ts`. The paywall links to them.

**Content** (`src/config/brand.ts` and elsewhere)

- [ ] Instructor's name and credential. Shown as `[NAME]`, `[CREDENTIAL]` until supplied.
- [x] Company legal name: Optivads Limited.
- [x] Support email confirmed: `hello@pilatrain.com`.
- [ ] Trademark check on the name.
- [ ] Instructor photography: the Welcome hero (3:4) and one photo per class (3:4, cropped to 4:5 on cards). Generated stand-ins are shown until then. They must be replaced before release: the woman in them is not the instructor, and the app names the instructor beside them. Then delete `assets/images/stand-ins` and the list in `src/config/photos.ts`.
- [ ] App icon artwork, 1024 × 1024. The current icon is a generated placeholder (`assets/images/icon.png`).
- [ ] The sixteen classes with video, captions and thumbnails, and the instructor's tag sheet filled into `supabase/seed/classes.csv`: level, length, focus, intensity, equipment, what each class is unsuitable for, chapter times and an easier option per chapter. See "What the class sheet must cover". The current sheet is placeholder content.
- [ ] A decision on catalogue size. Sixteen classes cannot give every plan "no class more than twice" (ten-minute plans three or more days a week are the clearest case). More short classes fix it; otherwise the engine repeats a class a third time.
- [ ] Sign-off on the dark colour map before it is ever switched on (`src/theme/colors.ts`).

## Assumptions made

Where the brief left a detail open, the calmer, simpler option was chosen.

- **Stand-in photos, by the owner's decision on 19 November 2026.** The brief
  asks for neutral Sand blocks until the real photography arrives, and no
  stock photos. The owner asked for generated stand-ins instead, so that test
  builds show pictures. They are 17 images made with Higgsfield (Nano Banana
  Pro, 896 × 1200), all in one room and one outfit, with her face turned away
  or small in the frame. They are for test builds only. A class with neither
  a thumbnail nor a stand-in still gets the Sand block.

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

**Milestone 3: classes**

- **A session of two classes plays one after the other**, and is done when the
  second reaches 90%. Each class sends its own started, progress and completed
  events.
- **"90% watched" is the furthest point reached**, so scrubbing back does not
  un-complete a class. Time skipped is not counted towards the thirty seconds
  that make closing ask first.
- **The session is marked done at 90%**, not at the very end, so she can leave
  during the cool-down and keep the credit. The after-class screen appears
  when the video ends, or when she closes after that point.
- **"Leave this class?" is a card in the player**, not a system alert, so it
  looks like the app and can be tested.
- **Her rating is saved when she presses Done**, so she can change her mind
  until then, and it is optional. Once saved it is not edited.
- **When feedback changes the plan she is told once**, in a short message on
  Today ("Noted. Next week eases off a little."). The brief does not say she
  should be told; saying nothing seemed worse.
- **After class shows all-time minutes and sessions**, the same two numbers as
  the first two Progress tiles, so they always agree.
- **Adjust my plan is one screen**, not the quiz's four, and it rebuilds from
  today to the end of the 28 days. Changing "best time of day" changes when
  her reminders arrive, and nothing else.
- **Consistency counts what has had its day**: sessions done, against sessions
  done plus sessions dropped when their week ran out, over the last 28 days.
  Sessions still ahead of her are not counted either way.
- **The bar chart shows this plan's four weeks**, matching "Week 2 of 4"
  elsewhere, not a rolling four weeks.
- **The month view shows the current month only.**
- **"Weeks active" counts calendar weeks**, Monday to Sunday, with at least one
  session.
- **Starting a later session early is allowed** from class detail, and is
  recorded on the day she did it.
- **The class sheet gained three columns**, `do_1` to `do_3`, for "What you'll
  do". The data model's `captions_url` is kept but unused: captions come from
  the stream.
- **Portrait is held per screen**, not app-wide, so that the player can turn.

**Milestone 4: membership**

- **Adjust for attribution.** The brief offered AppsFlyer or Adjust; the owner
  chose Adjust. It is confined to one file.
- **The free class is her first session**, whichever class that is and
  whether it is one class or two, until she has finished it. The class marked
  free in the sheet ("Start here") is free to everyone as well.
- **"Continue your plan" is the button for anyone without a membership**, not
  only someone whose membership has ended. It never says "expired".
- **Closing the paywall goes back to where she was.** After the free class it
  moves her on instead: to an account, then reminders, then Today.
- **An account can always be declined**, after a purchase too. Restore
  purchases works without one, and App Review expects this.
- **Reminders are asked about once.** After that the switch is on the You tab.
- **The per-month figure is rounded to the nearest cent** and loses its ".00"
  when whole, so the quarterly plan reads as the brief has it. "Save 58%" is
  rounded down, never up.
- **The yearly plan is called "Yearly"** on its card, to match "billed yearly".
- **If the store cannot say whether she may have the trial, the paywall
  assumes she may not**, and says "Subscribe". It never promises a free week
  it is unsure of.
- **A purchase with no trial is reported as `subscription_started`**, an event
  added to the spec's list.
- **The trial reminder goes out two days before the trial ends**, which for a
  seven-day trial is day 5, and is scheduled on the phone at the moment of
  purchase. It is cancelled if she cancels.
- **Session reminders have no sound** and say only what today's class is and
  how long it takes.
- **The tracking prompt is tied to attribution.** With no Adjust app token it
  is never shown, because there would be nothing to ask permission for.
- **"Delete account and data" is offered to everyone**, with or without an
  account: an anonymous user's answers are on our server too.
- **Deleting an account does not cancel a subscription**, because only Apple
  can. The first step says so and offers "Manage subscription".
- **Signing out clears this phone** and starts a fresh anonymous session. Her
  plan is on the server and returns when she signs back in.
- **Data model additions:** `subscriptions.last_event_at` and `environment`,
  a check on `subscriptions.status`, and `billing_events`, the webhook's log.
- **The player asks the server for the video address**, rather than building
  it from the playback ID, so that the membership check happens there.
