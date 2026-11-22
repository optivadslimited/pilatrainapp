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

There are two stages, because RevenueCat can be set up before Apple has
approved the developer account.

### Now: the Test Store (no Apple account needed)

RevenueCat's Test Store sells pretend products with nothing behind them. It
lets the real purchase code run in a development build today.

1. In **Product catalog → Products**, in the Test Store, create three
   subscriptions. The identifiers must match exactly:

   | Identifier            | Duration |
   | --------------------- | -------- |
   | `pilatrain_annual`    | 1 year   |
   | `pilatrain_quarterly` | 3 months |
   | `pilatrain_monthly`   | 1 month  |

   Give them the prices you intend to charge. A Test Store product cannot be
   edited once saved; to change a price you create a new one.

2. In **Entitlements**, create one called **`member`** and attach all three.
3. In **Offerings**, make one offering, set it as **default**, and add the
   three products as its annual, three-month and monthly packages.
4. The products RevenueCat created by itself when the project was made
   (`lifetime`, `yearly`, `monthly`, and the entitlement `pilatrain_com_pro`)
   are not used by the app. Leave them out of the default offering.
5. Put the Test Store key (it starts `test_`) in `.env.local` as
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. **Development builds only.** RevenueCat's
   SDK crashes on purpose if a Test Store key is used in a release build, and
   TestFlight counts as one. The app refuses to hand a Test Store key to the
   SDK outside development for that reason.

Done on 21 November 2026, and tried in the Simulator: the paywall showed the
three Test Store prices, a test purchase of the three-month plan opened the
app, and RevenueCat showed the `member` entitlement as active.

What to expect when testing with the Test Store:

- The three products have no free trial, so the paywall says "Subscribe" and
  never mentions "free". That is what it is meant to do for a product with no
  trial. The trial itself is first seen with the real App Store products.
- Subscriptions run on a short clock. A three-month plan bought at 00:34 was
  due to renew at about 00:49, so "Renews" on the You tab shows today's date.
- With Supabase switched on, RevenueCat knows her by her Supabase user ID
  from the first launch (checked on 21 November 2026: RevenueCat first saw
  the Simulator's user in the same second Supabase created her). With
  Supabase off, it sees an anonymous ID (`$RCAnonymousID:…`).

### Once Apple has approved the account

1. Add the iOS app to the RevenueCat project with the App Store Connect key.
2. Add the three App Store products (same identifiers) and attach them to the
   same `member` entitlement and the same default offering.
3. `EXPO_PUBLIC_REVENUECAT_IOS_KEY` for staging and production builds: the
   public **iOS** SDK key (it starts `appl_`), not the Test Store key.
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

The app draws its own paywall, as the brief specifies, and "Manage
subscription" opens Apple's own sheet. RevenueCat's hosted Paywalls and
Customer Center are not used.

## 3. Supabase

One project each for development, staging and production.

**Done on 21 November 2026** in the project "Pilatrain" (`emiadurcphdcumunooka`,
EU West): the four migrations and the seed, applied through Supabase's own
connector and then compared with this repo (every table, access rule, index,
database function and class matched). The migration history carries the same
versions as the files here, so `supabase migration list` agrees. The same
project also holds the website's waitlist tables (`waitlist`, `consent_log`,
`rate_limits`), from the website repo's own migrations; `supabase db push`
from this repo will report those two versions as unknown, which is expected.
Supabase's security advisor then reports only the tables that are meant to
have no access rules (service role only).

The four functions were deployed the same day with the Supabase CLI, run
through `npx` (version 3.2.0), which bundles them on Supabase's side so no
Docker is needed. In version 3 `--project-ref` became `--remote`, and a
deploy run by an agent stops until `--yes` is added with the owner's go-ahead:

```bash
npx --yes supabase@3.2.0 functions deploy plan --remote=emiadurcphdcumunooka --use-api
```

Each function was then called without signing in, and each refused (401).
Then, once anonymous sign-ins were on, a throwaway user went through it all
against the live project: an anonymous sign-in (which made its `users` row),
saving quiz answers under the access rules, `plan` building a 28-day plan
of 12 sessions in under a second and returning it again, `playback-token`
answering for the free class (no Mux video yet, so no playback ID), and
`delete-account` removing the user and every row of hers.

Still to do: **manual linking** (step 1) was still off when tried, which
"Sign in with Apple" needs; the Apple provider and email templates (steps 2
and 3); and the server secrets (step 6). TODO(owner): this one
project serves development and the website for now; give development its own
project before launch.

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
