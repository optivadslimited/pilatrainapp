# Analytics

PostHog, for events, funnels and one feature flag. The names below are fixed
by the product spec and are used exactly as written. `track` is typed
(`src/lib/analytics.ts`): an event that is not in the list does not compile.

Nothing reaches PostHog until `EXPO_PUBLIC_POSTHOG_KEY` is set. In a
development build every event is printed to the console instead.

## The privacy rule

Answers about pregnancy, injury or pain never leave our own database.

- The one event that touches those answers, `quiz_step_completed` for the
  "Anything to work around" step, sends `true` or `false`: whether she ticked
  anything other than "None". Which thing is never sent.
- Her first name is never sent, only whether she gave one.
- There is no autocapture and no session replay, so nothing typed or shown on
  a screen is recorded.
- She is identified by her user ID, a random UUID. Her name and email are
  never sent to PostHog, Sentry or the attribution provider.
- Ad platforms receive two events and nothing else. See `docs/attribution.md`.

Tests hold each of these: `src/lib/__tests__/analytics.test.ts` and
`src/lib/__tests__/adEvents.test.ts`.

## Events

### Onboarding

The brief also lists `safety_gate_shown` and `safety_gate_choice`. They were
removed on 28 November 2026: the safety gate only ever appears after an answer
about pregnancy or recent injury, so either event would tell analytics more
than the single yes-or-no flag the privacy rule allows.

| Event                 | Properties                | Sent when                                                         |
| --------------------- | ------------------------- | ----------------------------------------------------------------- |
| `app_opened`          |                           | The app starts.                                                   |
| `onboarding_started`  |                           | She taps "Build my plan".                                         |
| `quiz_step_completed` | `step`, `answer`          | She answers a quiz step. `answer` follows the privacy rule above. |
| `plan_built`          | `days`, `minutes`, `goal` | Her plan is built.                                                |
| `plan_preview_viewed` |                           | The plan preview appears.                                         |

### Money

| Event                  | Properties                                                                    | Sent when                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `paywall_viewed`       | `placement`, `variant`                                                        | The paywall appears. Placements: `plan_preview`, `after_free_class`, `locked_class`, `today`, `you_tab`. |
| `plan_selected`        | `product`                                                                     | She picks a different plan card.                                                                         |
| `trial_started`        | `product`                                                                     | A purchase with a free trial succeeds.                                                                   |
| `subscription_started` | `product`                                                                     | A purchase with **no** trial succeeds (she has had the trial before). See the note below.                |
| `purchase_failed`      | `reason`: `offline`, `not_allowed`, `unavailable`, `store_problem`, `unknown` | A purchase fails.                                                                                        |
| `purchase_cancelled`   |                                                                               | She closes Apple's purchase sheet.                                                                       |
| `account_created`      | `method`: `apple` or `email`                                                  | She creates an account.                                                                                  |

**One event was added to the spec's list:** `subscription_started`. The spec
names `trial_started` but nothing for a purchase without a trial, and calling
that a trial would make the trial numbers wrong. TODO(owner): confirm the
name, or say what it should be.

### Sent by the server

The RevenueCat webhook reports these, because they happen when the app is not
open. They carry `product` and her user ID.

| Event                    | When                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `subscription_renewed`   | A renewal is charged. This is also how a trial becomes paid.   |
| `subscription_cancelled` | She turns off renewal. She keeps access until the period ends. |
| `subscription_expired`   | Access ends.                                                   |
| `subscription_refunded`  | Apple refunds her. Access ends at once.                        |

### Use

| Event                             | Properties                        | Sent when                               |
| --------------------------------- | --------------------------------- | --------------------------------------- |
| `push_prompt_shown`               |                                   | Our reminder screen appears.            |
| `push_enabled`                    |                                   | She allows notifications.               |
| `class_started`                   | `class`, `source`                 | A class begins to play.                 |
| `class_progress_25`, `_50`, `_75` | `class`                           | She passes each point, once.            |
| `class_completed`                 | `class`                           | She reaches 90%.                        |
| `easier_option_opened`            | `class`                           | She opens an "Easier option" card.      |
| `feedback_submitted`              | `rating`: `easy`, `right`, `hard` | She answers "How did that feel?".       |
| `session_moved`                   |                                   | She moves a session.                    |
| `plan_adjusted`                   |                                   | She changes her days or session length. |
| `account_deleted`                 |                                   | She deletes her account.                |

## The two funnels

Build these in PostHog as funnels over the events above.

**Install to paid**

1. `Application Installed` (PostHog's own lifecycle event)
2. `plan_built` (the quiz is complete)
3. `paywall_viewed`
4. `trial_started`
5. `subscription_renewed` (the first one is the trial becoming paid)

Add `subscription_started` as an alternative at step 4 if purchases without a
trial should count.

**Trial to habit**

1. `trial_started`
2. `class_completed` (first)
3. `class_completed` three times within seven days of step 1

The server events and the app events join up because both use the same user
ID: the app identifies her to PostHog with her Supabase user ID from the first
launch, and the webhook reports under RevenueCat's user ID, which is the same
value.

## The flag

`paywall_variant` decides which plan is pre-selected on the paywall.

| Value                                               | Pre-selected |
| --------------------------------------------------- | ------------ |
| `quarterly` (or the flag missing, or anything else) | Quarterly    |
| `annual`                                            | Yearly       |

Create it in PostHog as a multivariate flag with those two variants. The
variant is sent with `paywall_viewed`, so the two can be compared on the
install-to-paid funnel. If PostHog cannot be reached the paywall opens on
Quarterly; it never waits for the flag.
