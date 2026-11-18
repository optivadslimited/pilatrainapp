# App Store privacy labels

What to answer in App Store Connect under App Privacy. It must say the same
as the privacy manifest in `app.config.ts`; change one, change the other.

TODO(owner): these are the developer's reading of what the app does. Have
whoever is responsible for privacy confirm them, and check them against the
published privacy policy, before submitting.

## Data collected

| Data type                                                                                                        | Collected for                                            | Linked to her | Used to track                        |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------- | ------------------------------------ |
| **Contact info: Email address**                                                                                  | App functionality (her account)                          | Yes           | No                                   |
| **Contact info: Name** (first name only, optional)                                                               | App functionality (greeting her)                         | Yes           | No                                   |
| **Health and fitness: Health** (what she ticked under "Anything to work around", including pregnancy and injury) | App functionality (leaving out classes that do not suit) | Yes           | No                                   |
| **Health and fitness: Fitness** (classes started and completed)                                                  | App functionality, Analytics                             | Yes           | No                                   |
| **Purchases: Purchase history**                                                                                  | App functionality, Analytics                             | Yes           | No, unless attribution is on (below) |
| **Identifiers: User ID**                                                                                         | App functionality, Analytics                             | Yes           | No                                   |
| **Usage data: Product interaction**                                                                              | Analytics                                                | Yes           | No                                   |
| **Diagnostics: Crash data**                                                                                      | App functionality                                        | Yes           | No                                   |

The health answers go to our own database and nowhere else. They are not sent
to PostHog, Sentry, RevenueCat or AppsFlyer.

## If attribution is switched on

When a build includes AppsFlyer (`EXPO_PUBLIC_ATTRIBUTION_KEY` is set), two
answers change:

| Data type                                                                            | Collected for                             | Linked to her | Used to track |
| ------------------------------------------------------------------------------------ | ----------------------------------------- | ------------- | ------------- |
| **Purchases: Purchase history**                                                      | add: Developer's advertising or marketing | Yes           | **Yes**       |
| **Identifiers: Device ID** (the advertising identifier, only if she allows tracking) | Developer's advertising or marketing      | Yes           | **Yes**       |

and "Does this app track?" becomes **Yes**.

## Not collected

Location, contacts, photos, browsing history, search history, financial info
(Apple handles payment; the app never sees a card), sensitive info, body
measurements, weight. The app has no body or weight tracking of any kind.

## Third parties that receive data

| Who               | What they receive                                                                 | Why                |
| ----------------- | --------------------------------------------------------------------------------- | ------------------ |
| Supabase          | Everything above (it is our database)                                             | To run the app     |
| RevenueCat        | Her user ID and purchase history                                                  | Subscriptions      |
| Mux               | Nothing about her; it serves the video                                            | Video              |
| PostHog           | Her user ID and the events in `docs/analytics.md`                                 | Analytics          |
| Sentry            | Her user ID and crash reports                                                     | Fixing crashes     |
| AppsFlyer (if on) | Her user ID, two purchase events, and the advertising identifier if she allows it | Advert attribution |
