# Attribution

Which advert, if any, brought someone to the app. **AppsFlyer** is used.

ASSUMPTION: the brief leaves the choice between AppsFlyer and Adjust open.
TODO(owner): confirm AppsFlyer, or say Adjust. The provider is confined to one
file, `src/lib/attribution.ts`.

NOT YET RUN. It needs an iOS build and an AppsFlyer account.

## What it is told

Two events, and nothing else. The rule is `src/lib/adEvents.ts`, and a test
(`src/lib/__tests__/adEvents.test.ts`) types every event the app can send and
fails if any other one gets through.

| App event              | Sent to AppsFlyer as | Carries        |
| ---------------------- | -------------------- | -------------- |
| `trial_started`        | `af_start_trial`     | The product ID |
| `subscription_started` | `af_subscribe`       | The product ID |

Nothing from the quiz is ever sent: not her goal, not her days, and never
anything about pregnancy, injury or pain.

Renewals and trial conversions happen on Apple's side, so RevenueCat reports
them to AppsFlyer from its own server. Turn on the AppsFlyer integration in
RevenueCat for that; the app hands RevenueCat the AppsFlyer ID it needs.

## The tracking prompt

Apple's "Allow tracking?" prompt is shown **after her first completed class,
never at launch**: when she leaves the after-class screen, once, if it has
never been answered. The app works the same whatever she answers.

If attribution is not configured the prompt is never shown at all.

The prompt's wording is set in `app.config.ts`:

> This lets Pilatrain see which adverts bring people to the app. Your answers
> and anything about your health are never shared.

## SKAdNetwork and AdAttributionKit

The AppsFlyer SDK sends the postbacks. `app.config.ts` adds the two endpoints
that copy them to AppsFlyer (`NSAdvertisingAttributionReportEndpoint` and
`AttributionCopyEndpoint`) when attribution is switched on.

The conversion values are mapped in the AppsFlyer dashboard (SKAN Conversion
Studio), not in the app. Map them to the same two events:

| Conversion value | Meaning                                               |
| ---------------- | ----------------------------------------------------- |
| 0                | Installed, nothing else yet                           |
| 1                | `af_start_trial`: a free trial started                |
| 2                | `af_subscribe`: a subscription bought without a trial |
| 3                | A trial converted to paid (reported by RevenueCat)    |

For the coarse values used in later postbacks: `low` for an install, `medium`
for a trial, `high` for a purchase.

## Switching it on

1. Set `EXPO_PUBLIC_ATTRIBUTION_KEY` (the AppsFlyer dev key) and
   `EXPO_PUBLIC_APP_STORE_ID` (the numeric App Store ID) as EAS environment
   variables for the build.
2. Build. With both present, `app.config.ts` adds the AppsFlyer plugin, the
   postback endpoints, and marks tracking in the privacy manifest. Without
   them, none of that is in the build.
3. Update the App Store privacy labels to match: see `docs/privacy-labels.md`.
4. In RevenueCat, turn on the AppsFlyer integration.
