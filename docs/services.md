# Switching the services on

Every outside service does nothing until its key is supplied. This is the
order to switch them on in, and what each needs. None of these steps has been
run yet: there are no accounts. Expect the first run of each to turn up small
things.

Keys with an `EXPO_PUBLIC_` name go in EAS environment variables (and
`.env.local` on a development Mac). Everything else is a server secret and
goes to the Edge Functions with `supabase secrets set`. Nothing goes in the
repository.

## 1. App Store Connect

1. Create the app with the bundle ID in `src/config/brand.ts`.
2. Create one subscription group, **Pilatrain Membership**, with three
   auto-renewable subscriptions. The product IDs must match exactly:

   | Product ID            | Period   | Introductory offer |
   | --------------------- | -------- | ------------------ |
   | `pilatrain_annual`    | 1 year   | Free trial, 1 week |
   | `pilatrain_quarterly` | 3 months | Free trial, 1 week |
   | `pilatrain_monthly`   | 1 month  | Free trial, 1 week |

   Prices are set here and nowhere else. The app reads them from StoreKit.
   `storekit/Pilatrain.storekit` mirrors these for testing in Xcode without
   an App Store Connect account; keep the two in step.

3. Turn on **Billing Grace Period** for the app (16 days, all renewals).
4. Offer codes, if wanted, are created here. The app redeems them through
   Apple's own sheet (You → Membership → Redeem a code).

## 2. RevenueCat

1. Create a project and add the iOS app with the App Store Connect key.
2. Add the three products, one entitlement called **`member`** with all three
   attached, and one offering, set as **default**, with three packages
   (annual, three-month, monthly).
3. `EXPO_PUBLIC_REVENUECAT_IOS_KEY`: the public iOS SDK key.
4. Webhook: URL `https://<project>.supabase.co/functions/v1/revenuecat-webhook`,
   and an authorization header value of your choosing. The same value goes in
   the `REVENUECAT_WEBHOOK_SECRET` server secret.
5. `REVENUECAT_SECRET_KEY`: a secret API key, as a server secret. Used when a
   purchase is transferred between users, and so that a new member is never
   refused a class in the seconds before her purchase's webhook arrives.
6. Leave "Transfer purchases" on its default (transfer to the new user), so a
   member who restores on a new phone before signing in keeps her membership.

RevenueCat's user ID is her Supabase user ID from the first launch, so the
two systems always agree on who she is.

## 3. Supabase

One project each for development, staging and production.

1. Auth settings: turn on **anonymous sign-ins** and **manual linking**
   (creating an account attaches Apple or an email to the anonymous user).
2. Auth providers: **Apple**, with the app's bundle ID as the client ID (and
   the `.dev` and `.staging` bundle IDs for those builds).
3. Auth email templates: "Magic Link" and "Change Email Address" should each
   carry both the link and the code, for example:

   ```
   {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email
   Or enter this code in the app: {{ .Token }}
   ```

   (`type=email_change` in the "Change Email Address" template.) Add
   `pilatrain://auth` to the allowed redirect URLs.

4. Apply the migrations and deploy the functions:

   ```bash
   supabase link
   ```

   ```bash
   supabase db push
   ```

   ```bash
   supabase functions deploy plan
   ```

   ```bash
   supabase functions deploy playback-token
   ```

   ```bash
   supabase functions deploy delete-account
   ```

   ```bash
   supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```

   The webhook is deployed without JWT verification because RevenueCat has no
   Supabase token; it is protected by the shared secret instead.

5. Run `supabase/seed.sql` in the SQL editor.
6. Server secrets:

   | Secret                                          | Used by                                                  |
   | ----------------------------------------------- | -------------------------------------------------------- |
   | `REVENUECAT_WEBHOOK_SECRET`                     | `revenuecat-webhook`                                     |
   | `REVENUECAT_SECRET_KEY`                         | `revenuecat-webhook`, `playback-token`, `delete-account` |
   | `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY` | `playback-token`                                         |
   | `POSTHOG_KEY`, `POSTHOG_HOST`                   | `revenuecat-webhook` (optional)                          |

7. `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

A link in an email cannot always open a custom URL scheme (`pilatrain://`).
The 6-digit code is the fallback and always works. TODO(owner): if the link
should open the app reliably from any mail app, set up a universal link on
`pilatrain.com` that forwards to the app.

## 4. Mux

1. Upload each class, with its captions, and set its playback policy to
   **signed**. ("Start here" may stay public if it should play without an
   account, but it does not need to: the server signs a token for the free
   class too.)
2. Create a **signing key**. Its ID is `MUX_SIGNING_KEY_ID`; its private key,
   exactly as Mux gives it, is `MUX_SIGNING_PRIVATE_KEY`.
3. Put each playback ID in `supabase/seed/classes.csv` (`mux_playback_id`),
   run `npm run seed:build`, and apply the seed.

## 5. PostHog

1. `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST`
   (`https://eu.i.posthog.com` or `https://us.i.posthog.com`).
2. Create the flag and the two funnels described in `docs/analytics.md`.

## 6. Sentry

1. `EXPO_PUBLIC_SENTRY_DSN`.
2. For readable crash reports, set `SENTRY_ORG`, `SENTRY_PROJECT` and
   `SENTRY_AUTH_TOKEN` as EAS secrets. With the first two present,
   `app.config.ts` adds Sentry's build step, which uploads source maps.

## 7. AppsFlyer

See `docs/attribution.md`.
