# App Store privacy labels

What to answer in App Store Connect under App Privacy. It must say the same
as the privacy manifest in `app.config.ts`; change one, change the other.

TODO(owner): these are the developer's reading of what the app does. Have
whoever is responsible for privacy confirm them, and check them against the
published privacy policy, before submitting.

## Data collected

| Data type                                                                                                        | Collected for                                                                               | Linked to her | Used to track                        |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------- | ------------------------------------ |
| **Contact info: Email address**                                                                                  | App functionality (her account)                                                             | Yes           | No                                   |
| **Contact info: Name** (first name only, optional)                                                               | App functionality (greeting her)                                                            | Yes           | No                                   |
| **Health and fitness: Health** (what she ticked under "Anything to work around", including pregnancy and injury) | App functionality (leaving out classes that do not suit); Analytics (a yes-or-no flag only) | Yes           | No                                   |
| **Sensitive info** (pregnancy or childbirth, one of the "Anything to work around" options)                       | App functionality                                                                           | Yes           | No                                   |
| **Health and fitness: Fitness** (classes started and completed)                                                  | App functionality, Analytics                                                                | Yes           | No                                   |
| **Purchases: Purchase history**                                                                                  | App functionality, Analytics                                                                | Yes           | No, unless attribution is on (below) |
| **Identifiers: User ID**                                                                                         | App functionality, Analytics                                                                | Yes           | No, unless attribution is on (below) |
| **Identifiers: Device ID** (identifiers for the vendor, kept by RevenueCat with the subscription)                | App functionality                                                                           | Yes           | No, unless attribution is on (below) |
| **Usage data: Product interaction**                                                                              | Analytics                                                                                   | Yes           | No                                   |
| **Diagnostics: Crash data**                                                                                      | App functionality                                                                           | Yes           | No                                   |
| **Diagnostics: Other diagnostic data** (Sentry's device context with a crash)                                    | App functionality                                                                           | Yes           | No                                   |

The health answers go to our own database and nowhere else. They are not sent
to Sentry, RevenueCat or AppsFlyer, and PostHog gets only the yes-or-no flag.
Sentry drops tap and navigation breadcrumbs, so a tapped option's label never
reaches it. PostHog's GeoIP lookup is off, so no location is derived. She can
turn PostHog off under You → Privacy.

## If attribution is switched on

When a build has AppsFlyer switched on (`EXPO_PUBLIC_APPSFLYER_DEV_KEY` and
`EXPO_PUBLIC_APPSFLYER_APP_ID` are set), two answers change:

| Data type                                                                            | Collected for                                                      | Linked to her | Used to track |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------- | ------------- |
| **Purchases: Purchase history**                                                      | add: Developer's advertising or marketing                          | Yes           | **Yes**       |
| **Identifiers: Device ID** (the advertising identifier, only if she allows tracking) | add: Developer's advertising or marketing, Third-party advertising | Yes           | **Yes**       |
| **Identifiers: User ID** (set as AppsFlyer's customer user ID)                       | add: nothing; becomes used to track                                | Yes           | **Yes**       |

and "Does this app track?" becomes **Yes**.

## Not collected

Location, contacts, photos, browsing history, search history, financial info
(Apple handles payment; the app never sees a card), body measurements, weight. The app has no body or weight tracking of any kind.

## Third parties that receive data

| Who               | What they receive                                                                 | Why                |
| ----------------- | --------------------------------------------------------------------------------- | ------------------ |
| Supabase          | Everything above (it is our database)                                             | To run the app     |
| RevenueCat        | Her user ID, purchase history and device identifiers                              | Subscriptions      |
| Mux               | Nothing about her; it serves the video                                            | Video              |
| PostHog           | Her user ID and the events in `docs/analytics.md`                                 | Analytics          |
| Sentry            | Her user ID, crash reports and device context (no taps, no screens)               | Fixing crashes     |
| AppsFlyer (if on) | Her user ID, two purchase events, and the advertising identifier if she allows it | Advert attribution |
