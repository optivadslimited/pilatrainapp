# Attribution

Which advert, if any, brought someone to the app. **AppsFlyer** is used: the
owner's choice on 21 November 2026, in place of Adjust (the brief offered
either). The provider is confined to one file, `src/lib/attribution.ts`, and
uses `react-native-appsflyer` 7 (New Architecture) with
`expo-tracking-transparency` for Apple's prompt.

NOT YET RUN. It needs an iOS build, the app created in App Store Connect (for
its numeric Apple ID), and the app added in AppsFlyer.

## What it is told

Two events, and nothing else. The rule is `src/lib/adEvents.ts`, and a test
(`src/lib/__tests__/adEvents.test.ts`) types every event the app can send and
fails if any other one gets through.

| App event              | AppsFlyer event  | Carries                            |
| ---------------------- | ---------------- | ---------------------------------- |
| `trial_started`        | `af_start_trial` | The product ID, as `af_content_id` |
| `subscription_started` | `af_subscribe`   | The product ID, as `af_content_id` |

Both are AppsFlyer's own recommended event names, so its reports and its
partners know them without any mapping.

Nothing from the quiz is ever sent: not her goal, not her days, and never
anything about pregnancy, injury or pain. The product ID is the only value,
and `src/lib/__tests__/attribution.test.ts` checks that nothing else rides
along even if an event carries more. Her user ID (a random UUID, nothing else)
is set as AppsFlyer's **customer user ID**, so an install can be matched to a
subscription.

AppsFlyer also records installs and app opens by itself; that is what
attribution is.

## What ad networks get

In AppsFlyer, each ad network is a partner (Collaborate → Partner
Marketplace). For every partner switched on, set its **in-app event
postbacks** to these two events only, `af_start_trial` and `af_subscribe`,
sent **without values**, so a network hears that a trial or a purchase
happened and nothing more. That is the brief's rule: ad platforms get only
trial and purchase events.

## Renewals and trial conversions

These happen on Apple's side, when the app is not open, so RevenueCat reports
them to AppsFlyer from its own server. The app hands RevenueCat AppsFlyer's ID
for this install (`Purchases.setAppsflyerID`) once the SDK has started.

In RevenueCat's AppsFlyer integration, map **only** the events the app does
not send itself, so nothing is counted twice, and keep them out of partner
postbacks:

| RevenueCat event            | Map to an AppsFlyer event?    |
| --------------------------- | ----------------------------- |
| Trial started               | No. The app sends it.         |
| Initial purchase (no trial) | No. The app sends it.         |
| Trial converted             | Yes                           |
| Renewal                     | Yes                           |
| Cancellation, expiration    | If you want them in AppsFlyer |

## The tracking prompt

Apple's "Allow tracking?" prompt is shown **after her first completed class,
never at launch**: when she leaves the after-class screen, once, if it has
never been answered. The app works the same whatever she answers. The SDK is
not told to wait for the answer at launch (AppsFlyer's guidance: only wait if
the prompt is shown at launch); it reads her answer by itself from then on.

If the dev key or the app ID is not set, the prompt is never shown at all.

The prompt's wording is set once in `app.config.ts` (`TRACKING_PROMPT`):

> This lets Pilatrain see which adverts bring people to the app. Your answers
> and anything about your health are never shared.

## SKAdNetwork and AdAttributionKit

The AppsFlyer SDK handles both. When the dev key and app ID are present at
build time, `app.config.ts` adds the two keys that send AppsFlyer a copy of
each postback (AppsFlyer's documented value; copies arrive only from the App
Store version, not TestFlight):

| Info.plist key                           | Value                                |
| ---------------------------------------- | ------------------------------------ |
| `NSAdvertisingAttributionReportEndpoint` | `https://appsflyer-skadnetwork.com/` |
| `AttributionCopyEndpoint`                | `https://appsflyer-skadnetwork.com/` |

Conversion values are set in AppsFlyer's SKAN Conversion Studio, not in the
app. Map them there to the same two events:

| What happened                                         | Conversion value | Coarse value |
| ----------------------------------------------------- | ---------------- | ------------ |
| Installed, nothing else yet                           | Lowest           | `low`        |
| `af_start_trial`: a free trial started                | Next             | `medium`     |
| `af_subscribe`: a subscription bought without a trial | Above that       | `high`       |
| A trial converted to paid (reported by RevenueCat)    | Highest          | `high`       |

## Switching it on

1. **After Apple approves the developer account**, create the app in App
   Store Connect. Its **Apple ID** (App Information → Apple ID, digits only)
   is the AppsFlyer app ID.
2. In AppsFlyer, **My Apps → + Add app → iOS**, choose that the app is **not
   yet published** (it shows as Pending until it is live; attribution works
   the same) and enter that Apple ID. Note the **dev key** (App settings).
3. For development and staging builds, add a second, test-only pending iOS
   app in AppsFlyer, with an ID of 9 digits starting `1111` as AppsFlyer
   suggests, so test installs never mix with real ones.
4. Set these as EAS environment variables (and in `.env.local` for a
   development build):

   | Variable                        | What it is                                                                    |
   | ------------------------------- | ----------------------------------------------------------------------------- |
   | `EXPO_PUBLIC_APPSFLYER_DEV_KEY` | The AppsFlyer dev key                                                         |
   | `EXPO_PUBLIC_APPSFLYER_APP_ID`  | The Apple ID, digits only: the real one in production, the test one elsewhere |

5. Build. With both present, `app.config.ts` adds the postback endpoints and
   marks tracking in the privacy manifest. Without them, neither is in the
   build and the SDK is never started.
6. Update the App Store privacy labels to match: see `docs/privacy-labels.md`.
7. In RevenueCat, turn on the AppsFlyer integration and map the events as
   above.
8. In AppsFlyer, set each partner's in-app event postbacks as above, and the
   SKAN conversion values as above.
9. Test on a device with AppsFlyer's SDK integration test (Settings → SDK
   integration tests), then remove the test device.
