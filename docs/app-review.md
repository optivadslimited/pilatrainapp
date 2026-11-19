# App Review checklist

What App Review looks for in a subscription app with health content, and
where each thing stands. Milestone 6 is the submission; this is kept current
from milestone 4 so nothing is found late.

| Requirement                                                                                                | Where                                                                  | State                                                                         |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Subscription terms on the paywall: price, period, what renews and how to cancel, directly under the button | `src/app/paywall.tsx`, wording in `src/features/membership/pricing.ts` | Built and tested                                                              |
| Links to Terms and Privacy on the paywall                                                                  | `src/app/paywall.tsx`                                                  | Built. TODO(owner): the pages must exist at the URLs in `src/config/brand.ts` |
| Restore purchases                                                                                          | Paywall, and You → Membership                                          | Built. Not yet run against StoreKit                                           |
| Prices from StoreKit, in her currency                                                                      | `src/features/membership/purchases/`                                   | Built. A test fails if a price is typed into the app                          |
| Free trial described accurately; nothing says "free" to someone who cannot have it                         | `paywallOffer` in `pricing.ts`                                         | Built and tested                                                              |
| Manage subscription from inside the app                                                                    | You → Membership → Manage subscription (Apple's sheet)                 | Built. Not yet run                                                            |
| Account deletion inside the app (guideline 5.1.1(v))                                                       | You → Delete account and data, two steps                               | Built. The server function is not yet deployed                                |
| An account is not required to use what she has paid for                                                    | Create account can be declined; restore works without one              | Built                                                                         |
| Sign in with Apple offered alongside any other sign-in (guideline 4.8)                                     | Create account and sign-in screens                                     | Built. Not yet run                                                            |
| Health disclaimer, and no medical claims                                                                   | Shown before the plan is built; linked from You → Legal; copy tests    | Built and tested                                                              |
| No weight-loss claims, no before/after, no body or weight tracking                                         | Copy tests in `src/strings/__tests__/copy.test.ts`                     | Tested                                                                        |
| Privacy manifest, and privacy labels that match it                                                         | `app.config.ts`, `docs/privacy-labels.md`                              | Written. TODO(owner): confirm the labels                                      |
| Tracking prompt only if the app tracks, and not at launch                                                  | `src/lib/attribution.ts`                                               | Built. Shown after the first completed class, only when attribution is on     |
| Notification permission asked in context                                                                   | The reminder screen, after a purchase or the free class                | Built                                                                         |
| A demo account with an active membership                                                                   | See below                                                              | TODO(owner)                                                                   |
| Works on iPhone SE (3rd generation) through iPhone 16 Pro Max                                              |                                                                        | Not yet run on any device                                                     |
| No generated stand-in photos in the build; every photo is real photography of the instructor               | `src/config/photos.ts`, `assets/images/stand-ins`                      | TODO(owner): stand-ins are in use today and must be replaced first            |
| Six screenshots at 6.9 and 6.5 inches                                                                      | `.maestro/screenshots.yaml`                                            | Written, not yet run. Needs the real photography first                        |

## The demo account

App Review needs to see the member experience without paying.

TODO(owner), once the production Supabase and RevenueCat projects exist:

1. In a production build, create an account with an email address you
   control (for example `review@` your domain) using "Continue with email".
2. In the RevenueCat dashboard, find that customer and grant the `member`
   entitlement as a **promotional** entitlement, lifetime.
3. Open the app signed in to that account and confirm Today shows no lock.
4. In App Store Connect → App Review Information, give the email address and
   explain how to sign in (below).

Sign-in is by emailed link or code, so there is no password to hand over.
Either give Review access to that inbox, or write in the notes:

> Sign in with "I already have an account" → "Continue with email" →
> `review@…`. The app emails a 6-digit code to that address. To save you
> waiting for it, reply to this message and we will send the code at once, or
> use Sign in with Apple and we will grant that account membership on request.

A simpler option, if Review allows it for this app: they can also start the
7-day free trial in the sandbox, which unlocks everything without a charge.
Say so in the notes as well.

## Notes for the reviewer (draft)

> Pilatrain builds a 28-day Pilates plan from a short quiz and offers one
> class each training day.
>
> The first class is free. Everything else needs a subscription, which starts
> with a 7-day free trial. Subscriptions: Yearly, Quarterly, Monthly, in one
> group, "Pilatrain Membership".
>
> The classes are general movement classes. The app makes no medical or
> weight-loss claims and does not track weight or body measurements. Anyone
> who says she is pregnant, postpartum or recovering from an injury or
> surgery is asked to check with a doctor or physiotherapist first, and is
> given gentler classes if she continues.
>
> Account deletion: You tab → Delete account and data.
