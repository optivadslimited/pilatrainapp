# End-to-end flows (Maestro)

NOT YET RUN. This machine has no Xcode, so these flows have never been
executed. They are written against the app's real test IDs and are the first
thing to run once a simulator build exists. Expect to adjust the two places
marked `SANDBOX` below, which tap Apple's own purchase sheet.

## What is here

| Flow                       | What it does                                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `first-run.yaml`           | First launch → quiz → plan → paywall → sandbox free trial → account and reminders declined → Today → a class played to the end → after-class → Today. |
| `screenshots.yaml`         | Walks the same path and captures the six App Store screenshots.                                                                                       |
| `subflows/onboarding.yaml` | Welcome to plan preview. Shared by both.                                                                                                              |
| `subflows/subscribe.yaml`  | The paywall and Apple's purchase sheet. Shared by both.                                                                                               |

## Running them

1. Install Maestro: https://maestro.mobile.dev
2. Build and install a **staging** simulator build, with:
   - a RevenueCat key (`EXPO_PUBLIC_REVENUECAT_IOS_KEY`), and the scheme's
     StoreKit configuration set to `storekit/Pilatrain.storekit`, so the
     three products exist with no App Store Connect account signed in;
   - `EXPO_PUBLIC_SAMPLE_VIDEO_URL` set to a short clip (a minute or less),
     so "a class played to the end" does not take ten minutes.
3. Run:

```bash
maestro test -e APP_ID=com.pilatrain.app.staging .maestro/first-run.yaml
```

## Screenshots

App Store Connect wants 6.9-inch and 6.5-inch sets. Run the flow once on each
simulator; the files land in the folder Maestro is run from.

```bash
maestro --device "iPhone 16 Pro Max" test -e APP_ID=com.pilatrain.app.staging -e SIZE=6.9 .maestro/screenshots.yaml
```

```bash
maestro --device "iPhone 11 Pro Max" test -e APP_ID=com.pilatrain.app.staging -e SIZE=6.5 .maestro/screenshots.yaml
```

TODO(owner): the screenshots need the real photography and instructor name
first. Until then they show labelled placeholders and `[NAME]`.

## Devices to check by hand

iPhone SE (3rd generation), iPhone 12, iPhone 15, iPhone 16 Pro Max. The SE is
the one that matters most: it is the smallest screen the paywall has to fit.
