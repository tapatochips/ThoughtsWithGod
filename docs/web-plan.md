# Thoughts With God on the Web: Development Plan

Nov 8, 2026 · @Daniel

> This is the working copy of the plan for coding sessions. Update the Progress table here when a story is done. The copy in the claude.ai project ("Thoughts With God on the Web Development Plan") is updated from this file at milestones.

## Overview

The plan is to ship Thoughts With God as a website by reusing the existing Expo codebase through Expo's web support, not rewriting it. It covers about 109 hours over 10 weeks at about 10 hrs/week, in two phases:

- **Phase 1, the web app (weeks 1–8):** the signed-in app (Bible reader, favorites, prayer board, discussions, profile, subscription) running in the browser at `app.thoughtswithgod.com`.
- **Phase 2, public SEO pages (weeks 9–10):** a landing page plus static pages for every Bible chapter, so people find the site through Google and then sign up.

**Why reuse the codebase:** the app already uses the Firebase JS SDK, React Navigation and plain React Native components, all of which run on the web. Most screens will work with small changes, and one codebase keeps iOS, Android and web in sync.

**Stack**

- **Web app:** Expo web (react-native-web), built with `npx expo export -p web` and hosted on Firebase Hosting. The only `firebase.json` today is in `functions/` and has no `hosting` section, so S-3 adds one.
- **URLs:** React Navigation's linking config, so every screen has a real, shareable URL.
- **Bible data:** one JSON file per book and translation in `public/bible/`, written by `npm run bible:split` and fetched on demand on web. Native apps keep the full Bible bundled.
- **Payments on web:** Stripe Checkout and the Stripe Customer Portal, reusing the existing Stripe Cloud Functions and webhook. Subscription status stays in Firestore, shared across all platforms.
- **Public pages:** a small Node build script that generates static HTML for each chapter from the same Bible JSON.

**Out of scope:** push notifications on web, offline mode (PWA), and the church admin dashboard (it has its own plan).

## Progress

A code review on Nov 8 compared this plan with the church plan and recommended starting here: this plan reuses almost all of the existing code, while the church plan has no code yet and begins with pastor interviews. Those interviews can run alongside this build.

As of Nov 8, the web app runs in the browser with `npm run web`. Sign-in works, and the prayer board shows other users' posts.

| Story | Status | Notes |
| --- | --- | --- |
| M-2 Report and block | Done, not yet tested on a device | New `ModerationSheet.tsx`, opened from a "⋯" button on posts and comments in `CommunityBoard.tsx`. Posts and comments from blocked users are hidden. Anonymous posts can be reported but not blocked. Reports store the full Firestore path. Existing Firestore rules already allowed the writes |
| S-1 Web spike | Done | Web packages installed. The only crash on load was the native Stripe library (C-1). Screens load; UI issues still to be logged against L-1 to L-3 |
| C-1 Native Stripe library | Done | `StripeWrapper.tsx` (native) and `StripeWrapper.web.tsx` (web). `StripeProvider` stays on iOS too, because `SubscriptionScreen.tsx` calls `useStripe()` on every platform. New `SubscriptionScreen.web.tsx` shows Premium status until P-1 adds Stripe Checkout |
| B-1 Per-book files | Done | `scripts/splitBibleData.js` (run with `npm run bible:split`) writes `public/bible/{kjv,asv}/{BOOK_ID}.json`, e.g. `/bible/kjv/JHN.json`, plus `src/data/bibleIndex.json` (verse counts per chapter). The generated files are committed; `public/bible/` is in `.easignore` |
| B-2 Load books on demand | Done, 4G timing not yet measured | `services/bible/bibleData.ts` (native, bundled) and `bibleData.web.ts` (fetch and cache one book). Web bundle went from 16.4 MB to 3.78 MB. The largest book, Psalms, is 441 KB, about 93 KB compressed |
| B-3 Random verse and favorites | Done | The random verse picks a verse from the index, then loads only that book. Favorites store their own verse text, so they never load a translation |
| C-3 Confirmation dialogs | Done, not yet tested signed in or on a device | `components/common/dialog.tsx` (native, wraps `Alert.alert`) and `dialog.web.tsx` (a themed modal, rendered by `<DialogHost />` in `App.tsx`). `confirm()` asks before an action and `notify()` shows a message. All 39 `Alert.alert` calls in 4 files now use them (`BibleReader.tsx` had 2). Checked on web from the sign-in page: Cancel, OK, Escape and two dialogs queued in a row |
| C-2 RevenueCat off the web | Done, not yet tested signed in on web | New `services/payment/revenueCatService.web.ts` exports the same functions as the native file, and each one throws if called. The web bundle went from 3.78 MB to 2.85 MB and no longer contains `react-native-purchases`. The native file is unchanged, so iOS and Android behave as before. Android still bundles RevenueCat but never calls it |
| S-3 Firebase Hosting | Live at `thoughtswithgod-a5a08.web.app`; custom domain still to do | Root `firebase.json` (hosting only) and `.firebaserc` pointing at `thoughtswithgod-a5a08`. `npm run web:preview` builds and deploys to a 7-day preview channel; `npm run web:deploy` builds and deploys live. Checked with the local hosting emulator: app routes serve the app, book files serve as JSON, and a missing book is a real 404. Preview channel deployed and checked: routes, cache headers (app page `no-cache`, hashed bundle 1 year, book files 1 day) and the icon font. Don't add the usual `**/node_modules/**` ignore to `firebase.json`: Expo puts fonts under `dist/assets/node_modules/` and the icons break. Deployed live on Nov 10 with Analytics included. Still to do: smoke test signed in, and connect `app.thoughtswithgod.com` in the Firebase console and add its DNS records |

**Found along the way**

- **KJV book order fixed.** The KJV source file is sorted alphabetically by book code, so the reader's book list and next/previous-book arrows ran 1 Chronicles, 1 Corinthians, and so on. The reader now always uses Genesis to Revelation, from `BIBLE_BOOKS`.
- **RevenueCat was about 0.9 MB of the web bundle** (`react-native-purchases` and its helper packages). C-2 removed it.
- **The daily verse is always KJV,** whatever translation is selected. This was already the case before; decide whether it should follow the selected translation.
- **A missing book file returns the app's HTML page, not a 404,** on the dev server, so it fails as a JSON parse error rather than a clear "not found". On Firebase Hosting it is a real 404: the S-3 rewrite leaves `/bible/**` alone.
- **Reports aren't sent anywhere.** They only land in the `reports` collection. Apple expects you to act on them, so check the collection regularly until there's a notification.
- **There's no unblock screen.** `unblockUser` exists but nothing calls it.
- **The Apple Pay merchant ID is a placeholder** (`merchant.com.yourcompany.thoughtswithgod`) in `StripeWrapper.tsx`, while `app.config.js` uses `merchant.com.tapatochips.thoughtswithgod`.
- **`package-lock.json` was out of sync** with `package.json` (missing `expo-font`), so `npm ci` failed. Running `npm install` and committing the lock file fixes it.
- **Editing a favorite's note uses `Alert.prompt`,** which only exists on iOS, so it does nothing on web or Android (`FavoritesScreen.tsx`). It needs a text-input dialog, which C-3 didn't cover.

**Next up:** S-3 (Firebase Hosting), then the rest of Sprint 1.

## What breaks on web today

A code review found nine things to handle before the app works well in a browser. The first three are now fixed (see Progress).

| Issue | Where | Fix |
| --- | --- | --- |
| The web packages aren't installed: `package.json` has a `web` script but no `react-dom`, `react-native-web` or `@expo/metro-runtime`, so `expo start --web` fails immediately | `package.json` | `npx expo install react-dom react-native-web @expo/metro-runtime` as the first step of S-1 (done) |
| KJV (8.5 MB) and ASV (7.7 MB) JSON imported directly into the bundle | `src/context/TranslationContext.tsx` | Split into one file per book; fetch on demand on web (B-1, B-2, done) |
| `StripeProvider` from `@stripe/stripe-react-native` wraps the whole app, but that library is native-only | `App.tsx` | Platform-split wrapper; use Stripe Checkout on web (C-1 done, P-1 to do) |
| RevenueCat (`react-native-purchases`) is imported in the Firebase context, through `revenueCatService.tsx` | `src/context/FirebaseContext.tsx` | Move the import behind an iOS-only file so the web bundle never loads it (C-2) |
| `Alert.alert` is used for confirmations, but on react-native-web it shows nothing. There are 33 calls: 20 in `SubscriptionScreen.tsx`, 9 in `CommunityBoard.tsx`, 4 in `ProfileSetup.tsx` (including delete account). M-2 added 6 more in `CommunityBoard.tsx` | 3 files | A shared `confirm()` helper using a modal on web (C-3). Most `SubscriptionScreen` calls sit in native payment code that won't run on web |
| `Share.share` for receipts has no fallback on desktop browsers | `src/screens/ReceiptViewer.tsx` | Use the Web Share API where available, otherwise copy a link (C-4) |
| Manage-subscription link opens `itms-apps://`, which only works on iPhone | `src/services/payment/revenueCatService.tsx` | Show where the subscription is managed based on its source: App Store, Google Play or Stripe portal (P-3) |
| No Firebase Hosting config: the only `firebase.json` is in `functions/` and has only `functions` and `firestore` sections | `functions/firebase.json` | Add a root-level `firebase.json` with a `hosting` section for the web build (S-3) |
| Push notification code is mocked and logs a fake token | `src/services/notifications.tsx` | Skip on web for now (out of scope) |

**Already web-ready:** Firebase is set up with the JS SDK (`getAuth`, `getFirestore`), all Cloud Functions are called through `httpsCallable`, and the subscription truth already lives in Firestore for every platform. The server already has `deleteAccount`, `validateSubscription`, `stripeWebhook` and `revenueCatWebhook`.

## Architecture

The web app talks to the same Firebase project as the mobile apps. The only new pieces are the web build itself, the static public pages, and Firebase Hosting to serve them.

- **Four clients:** the iOS app, the Android app, the web app (`app.thoughtswithgod.com`) and the static public pages (`thoughtswithgod.com`).
- **One Firebase project:** Auth, Firestore and Cloud Functions, shared by every client. Firebase Hosting serves the web app and the public pages.
- **Two payment providers:** RevenueCat (iOS) and Stripe (Android and web). Each has a webhook Cloud Function (`revenueCatWebhook`, `stripeWebhook`) that writes the user's subscription to Firestore.

Purchases flow through RevenueCat on iOS and Stripe on Android and web, and both webhooks write to the same subscription record. The public pages are plain files on the CDN, so heavy search traffic never touches Firestore.

## URL map

Every screen gets a real URL, so links can be shared and bookmarked and the browser's back button works. The app lives on `app.thoughtswithgod.com`, and the public pages live on `thoughtswithgod.com`.

| URL | Screen | Sign-in needed | Notes |
| --- | --- | --- | --- |
| `thoughtswithgod.com/` | Landing page | No | Static; links to the app and both stores |
| `thoughtswithgod.com/bible/{translation}/{book}/{chapter}` | Public chapter page | No | Static HTML, e.g. `/bible/kjv/john/3`; "Save this verse" leads to sign-up |
| `thoughtswithgod.com/terms`, `/privacy` | Legal pages | No | Same text as the in-app screens |
| `app.thoughtswithgod.com/` | Verse of the day (`VerseDisplay`) | No | Default screen |
| `/read/{translation}/{book}/{chapter}` | `BibleReader` | No | Reading works signed out; saving needs an account |
| `/favorites` | `FavoritesScreen` | Yes |  |
| `/prayers` | `PrayerBoard` | Yes |  |
| `/discussions` | `BiblicalDiscussions` | Yes |  |
| `/profile` | `ProfileSetup` | Yes | Includes delete account |
| `/subscribe` | `SubscriptionScreen` | Yes | Stripe Checkout on web |
| `/subscribe/success`, `/subscribe/canceled` | Checkout return pages | Yes | Refresh subscription status from Firestore |
| `/receipts/{id}` | `ReceiptViewer` | Yes | Stripe receipts only |
| `/login` | `AuthScreen` | No | Redirects back to the page the user came from |
| anything else | Not found | No | Links home |

Book data files are served from the app at `/bible/{kjv,asv}/{BOOK_ID}.json`. They use upper-case book codes and a `.json` extension, so they don't clash with the public chapter pages.

## Epics and user stories

There are 34 stories across 10 epics, about 109 hours in total. P0 stories are needed to launch the web app, P1 for the SEO phase and polish, and P2 can wait.

| ID | Epic | Story | Acceptance criteria | Priority | Est. hrs |
| --- | --- | --- | --- | --- | --- |
| S-1 | Setup | As the developer, I run the app with `expo start --web` and log every crash | `react-dom`, `react-native-web` and `@expo/metro-runtime` installed with `npx expo install`; a list of every screen that fails, with the cause | P0 | 4 |
| S-2 | Setup | As the developer, I have a pattern for platform-specific code | A base file for native plus a `.web.tsx` file beside it (TypeScript resolves the base file; Metro picks `.web.tsx` on web), as used by `StripeWrapper`, `SubscriptionScreen` and `bibleData`; `npx expo export -p web` builds without errors in CI | P0 | 3 |
| S-3 | Setup | As the developer, I can deploy the web app to Firebase Hosting | Root-level `firebase.json` with a `hosting` section; `app.thoughtswithgod.com` serves the build over HTTPS; preview channels for testing | P0 | 3 |
| C-1 | Compatibility | As a web user, the app loads without the native Stripe library | `StripeProvider` wraps the app only in native builds; the web bundle doesn't include `@stripe/stripe-react-native` | P0 | 3 |
| C-2 | Compatibility | As a web user, the app loads without RevenueCat | RevenueCat is imported only in iOS files; the web bundle doesn't include it | P0 | 2 |
| C-3 | Compatibility | As a web user, I see confirmation dialogs | A shared `confirm()` helper replaces `Alert.alert` in all 3 files (39 calls); delete account asks before deleting. The estimate may run over because of the call count | P0 | 4 |
| C-4 | Compatibility | As a web user, I can share a receipt or verse | Web Share API where supported, otherwise copy a link with a "Copied" message | P1 | 2 |
| C-5 | Compatibility | As a web user, forms behave like web forms | Enter submits; tab order is correct; no layout jumps from mobile keyboard code | P1 | 2 |
| B-1 | Bible data | As the developer, I split the Bible JSON into per-book files | A script writes `public/bible/{translation}/{BOOK_ID}.json` for KJV and ASV; files are cached by the CDN | P0 | 4 |
| B-2 | Bible data | As a web user, the reader loads quickly | Web fetches only the book being read; first load is under 3 seconds on a 4G connection; native apps keep the bundled data | P0 | 5 |
| B-3 | Bible data | As a web user, the random verse and favorites still work | Random verse picks a book first, then loads it; favorites show verse text without loading whole translations | P1 | 3 |
| R-1 | Routing | As a user, every screen has a URL | React Navigation linking config matches the URL map; refresh keeps you on the same page | P0 | 4 |
| R-2 | Routing | As a signed-out user, I'm sent to log in and then back | Protected routes redirect to `/login?next=`; after login you land where you started | P0 | 3 |
| R-3 | Routing | As a user, a bad link shows a helpful page | Not-found page with links home and to the reader; browser back and forward work everywhere | P1 | 2 |
| L-1 | Layout | As a desktop user, the app is readable on a wide screen | Content capped at a comfortable reading width; breakpoints at 768 and 1024 px | P0 | 5 |
| L-2 | Layout | As a desktop user, I can move between sections easily | Top bar or sidebar navigation at 1024 px and up; current section highlighted | P0 | 4 |
| L-3 | Layout | As a keyboard or screen-reader user, I can use the app | Visible focus states, hover states, labels on icon buttons, contrast that passes WCAG AA | P1 | 3 |
| A-1 | Auth | As a user, I can sign up and sign in on the web | Same Firebase accounts as mobile; stays signed in after closing the tab | P0 | 2 |
| A-2 | Auth | As a user, I can reset my password | "Forgot password" sends Firebase's reset email; the link returns to the app | P1 | 3 |
| A-3 | Auth | As a visitor, I can read the terms and privacy policy | `/terms` and `/privacy` pages using the same text as the app | P0 | 2 |
| P-1 | Payments | As a web user, I can subscribe with Stripe Checkout | New `createCheckoutSession` function; success and cancel pages; the existing `stripeWebhook` writes the entitlement to Firestore; replaces the placeholder in `SubscriptionScreen.web.tsx` | P0 | 6 |
| P-2 | Payments | As a web subscriber, I can change my card or cancel | Stripe Customer Portal button on `/subscribe` | P1 | 2 |
| P-3 | Payments | As a subscriber, I see where my subscription is managed | Shows "Manage in the App Store", "Google Play" or "Stripe portal" based on where it was bought; premium access works on every platform | P0 | 3 |
| M-1 | Community | As a web user, I can use the prayer board and discussions | Post, comment and read with live updates, same as mobile | P0 | 3 |
| M-2 | Community | As a user, I can report a post or block someone | `CommunityBoard.tsx` gets report and block actions that call the existing `moderationService.ts`, and hides posts and comments from `blockedUserIds` (already loaded in `FirebaseContext`); covers the prayer board and discussions; shared with the iOS fix | P0 | 4 |
| M-3 | Community | As the developer, bots can't spam the web app | Firebase App Check with reCAPTCHA on web; Firestore and Functions enforce it | P1 | 3 |
| G-1 | Public site and SEO | As a visitor, I see a landing page that explains the app | Features, screenshots, App Store and Google Play badges, "Open the web app" button | P1 | 4 |
| G-2 | Public site and SEO | As a searcher, I can land on any Bible chapter page | A build script generates static pages for all 1,189 chapters in KJV and ASV, each with a title, description and a link into the app | P1 | 6 |
| G-3 | Public site and SEO | As the developer, search engines can find every page | `sitemap.xml`, `robots.txt`, canonical tags, Open Graph tags; submitted to Google Search Console | P1 | 3 |
| G-4 | Public site and SEO | As a user, a shared verse link opens that verse | `/bible/kjv/john/3#16` scrolls to and highlights the verse | P2 | 2 |
| G-5 | Public site and SEO | As the developer, I can see which pages bring sign-ups | Analytics on page views and sign-ups, with a consent banner where needed | P2 | 2 |
| Q-1 | Launch | As the developer, the app works in every major browser | Tested on Chrome, Safari, Firefox and Edge, plus mobile Safari and Chrome | P0 | 4 |
| Q-2 | Launch | As a visitor, pages load fast | Lighthouse performance 80+ on the landing and chapter pages; the web app is 70+ | P1 | 3 |
| Q-3 | Launch | As a mobile user, I learn the website exists | "Also on the web" link in the app's profile screen and store listings | P1 | 1 |

Totals: P0 = 68 hours, P1 = 37 hours, P2 = 4 hours.

## Sprint plan

There are five two-week sprints. The web app reaches public beta at the end of Sprint 4 (week 8), and Sprint 5 adds the public SEO pages. Each sprint's stories and hours are in the claude.ai project copy of this plan.

Sprint 1 is mostly discovery. If the spike finds more broken screens than expected, extend Sprint 1 rather than pushing fixes into later sprints. M-2 was pulled into Sprint 1 and done first, because it's needed for the iOS release regardless of the web work. B-2 and B-3 were also done early, alongside B-1.

## Definition of done and testing

A story is done when it meets its acceptance criteria in the browser and the iOS and Android apps still work the same way they did.

**Every story**

- [ ] Acceptance criteria met in Chrome and Safari on desktop, and in mobile Safari
- [ ] The native apps still build and behave the same (`eas build` preview for anything touching shared code)
- [ ] No native-only library in the web bundle
- [ ] Works at 375 px, 768 px and 1280 px widths
- [ ] Keyboard usable, with visible focus and labeled buttons

**Testing approach**

- **Smoke test per deploy:** sign in, read a chapter, save a favorite, post a prayer, open the subscription page, sign out. Run it on a Firebase Hosting preview channel before promoting it live.
- **Payments:** Stripe test mode for checkout, success, cancel, a failed card and the portal. Confirm the webhook updates Firestore and that premium shows up on mobile too.
- **Performance:** Lighthouse on the landing page, a chapter page and the reader. Check the bundle size after every sprint (3.78 MB after B-2).
- **SEO:** a sitemap check in Google Search Console, plus a spot check that chapter pages render their text without JavaScript.
- **Cross-platform regression:** after any change to shared code, open the iOS and Android preview builds and run the same smoke test.

## Risks and open questions

The biggest technical risk is react-native-web quirks in screens built only for phones. The biggest business risk is that Bible chapter pages compete with very large, established Bible sites for search traffic.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Screens built for phones look or behave badly on desktop | High | Spike first (S-1); fix layout with shared responsive helpers rather than per-screen hacks |
| Shared-code changes break iOS or Android | High | Platform-split files; native smoke test after each sprint |
| Chapter pages rank poorly against big Bible sites | Medium | Treat SEO as a bonus; add unique value per page (reading plans, prayer prompts) over time |
| Bots spam the prayer board through the open web | Medium | App Check (M-3), existing input validation, report and block (M-2) |
| Firebase costs grow with public traffic | Low | Public pages are static files on the CDN and never touch Firestore |
| Android app uses Stripe instead of Google Play Billing for subscriptions | High | Not a web issue, but found while reading the code: confirm you're enrolled in Google's [US alternative billing program](https://support.google.com/googleplay/android-developer/answer/16497028), and that non-US users get Google Play Billing |

**Open questions**

- Should signed-out visitors be able to read the Bible in the web app, or only on the public chapter pages?
- One domain with paths (`thoughtswithgod.com/app`) or a subdomain (`app.thoughtswithgod.com`)? A subdomain keeps the static site and the app deploys separate.
- Should web subscribers pay the same price as mobile, or less, since Stripe fees are lower than store fees? Check current App Store rules before mentioning web pricing inside the iOS app.
- Is the church admin dashboard (from the church plan) worth merging into this web app later, rather than keeping a separate Next.js app?
- Should the daily verse use the selected translation instead of always KJV?
