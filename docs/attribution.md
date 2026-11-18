# Attribution

Which advert, if any, brought someone to the app. **Adjust** is used (the
owner's choice; the brief offered AppsFlyer or Adjust). The provider is
confined to one file, `src/lib/attribution.ts`.

NOT YET RUN. It needs an iOS build and an Adjust account.

## What it is told

Two events, and nothing else. The rule is `src/lib/adEvents.ts`, and a test
(`src/lib/__tests__/adEvents.test.ts`) types every event the app can send and
fails if any other one gets through.

| App event              | Adjust event                                                       | Carries        |
| ---------------------- | ------------------------------------------------------------------ | -------------- |
| `trial_started`        | The event whose token is `EXPO_PUBLIC_ADJUST_TRIAL_EVENT_TOKEN`    | The product ID |
| `subscription_started` | The event whose token is `EXPO_PUBLIC_ADJUST_PURCHASE_EVENT_TOKEN` | The product ID |

Nothing from the quiz is ever sent: not her goal, not her days, and never
anything about pregnancy, injury or pain.

The product ID travels as a **callback parameter**, which comes back to us in
Adjust's own reports and is not passed on to ad networks. No partner
parameters are set. Her user ID (a random UUID, nothing else) is attached to
those same reports so an install can be matched to a subscription.

An event with no token set is simply not sent, so the app can ship with the
app token alone and the events added later.

## Renewals and trial conversions

These happen on Apple's side, when the app is not open, so RevenueCat reports
them to Adjust from its own server. The app hands RevenueCat the Adjust ID it
needs for that.

In RevenueCat's Adjust integration, map **only** the events the app does not
send itself, so nothing is counted twice:

| RevenueCat event            | Map to an Adjust event?    |
| --------------------------- | -------------------------- |
| Trial started               | No. The app sends it.      |
| Initial purchase (no trial) | No. The app sends it.      |
| Trial converted             | Yes                        |
| Renewal                     | Yes                        |
| Cancellation, expiration    | If you want them in Adjust |

## The tracking prompt

Apple's "Allow tracking?" prompt is shown **after her first completed class,
never at launch**: when she leaves the after-class screen, once, if it has
never been answered. The app works the same whatever she answers. It is asked
through Adjust's own request, so Adjust learns her answer straight away.

If the Adjust app token is not set the prompt is never shown at all.

The prompt's wording is set in `app.config.ts`:

> This lets Pilatrain see which adverts bring people to the app. Your answers
> and anything about your health are never shared.

## SKAdNetwork and AdAttributionKit

The Adjust SDK handles both. When the app token is present at build time,
`app.config.ts` adds the two keys that send Adjust a copy of each postback:

| Info.plist key                           | Value                            |
| ---------------------------------------- | -------------------------------- |
| `NSAdvertisingAttributionReportEndpoint` | `https://adjust-skadnetwork.com` |
| `AttributionCopyEndpoint`                | `https://adjust-skadnetwork.com` |

Conversion values are managed by Adjust, in the app's SKAdNetwork settings in
the Adjust dashboard, not in the app: Adjust's servers tell the SDK which
value to set. Map them there to the same two events:

| What happened                                             | Conversion value | Coarse value |
| --------------------------------------------------------- | ---------------- | ------------ |
| Installed, nothing else yet                               | Lowest           | `low`        |
| The trial event: a free trial started                     | Next             | `medium`     |
| The purchase event: a subscription bought without a trial | Above that       | `high`       |
| A trial converted to paid (reported by RevenueCat)        | Highest          | `high`       |

## Switching it on

1. In Adjust, create the app and two events, "Trial started" and
   "Subscription started". Each gets a token.
2. Set these as EAS environment variables for the build:

   | Variable                                  | What it is                             |
   | ----------------------------------------- | -------------------------------------- |
   | `EXPO_PUBLIC_ADJUST_APP_TOKEN`            | The app token                          |
   | `EXPO_PUBLIC_ADJUST_TRIAL_EVENT_TOKEN`    | The "Trial started" event token        |
   | `EXPO_PUBLIC_ADJUST_PURCHASE_EVENT_TOKEN` | The "Subscription started" event token |

3. Build. With the app token present, `app.config.ts` adds the postback
   endpoints and marks tracking in the privacy manifest. Without it, neither
   is in the build and the SDK is never started.
4. Staging builds report to Adjust's **sandbox** environment and production
   builds to **production**, so test installs never count as real ones.
5. Update the App Store privacy labels to match: see `docs/privacy-labels.md`.
6. In RevenueCat, turn on the Adjust integration and map the events as above.
7. Set the SKAdNetwork conversion values in Adjust as above.
