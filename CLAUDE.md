# Thoughts With God

A Bible reading and prayer app built with Expo 54, React Native 0.81 and TypeScript. One codebase ships to iOS, Android and the web:

- **iOS:** subscriptions through RevenueCat (`react-native-purchases`)
- **Android:** subscriptions through Stripe (`@stripe/stripe-react-native`)
- **Web:** react-native-web, hosted on Firebase Hosting (not set up yet). Subscriptions will use Stripe Checkout (story P-1)
- **Backend:** Firebase Auth, Firestore and Cloud Functions, all in `functions/` (`index.tsx`, `firestore.rules`, `firebase.json`)

The current work is the web app. The plan, story list and progress are in `docs/web-plan.md`. Work one story at a time, and update its row in the plan's Progress table when it's done.

## Design principles

1. Don't overengineer: simple beats complex
2. No fallbacks: one correct path, no alternatives
3. One way: one way to do things, not many
4. Clarity over compatibility: clear code beats backward compatibility
5. Throw errors: fail fast when preconditions aren't met
6. No backups: trust the primary mechanism
7. Separation of concerns: each function has a single responsibility

## Development methodology

1. Surgical changes only: minimal, focused fixes
2. Evidence-based debugging: minimal, targeted logging
3. Fix root causes, not symptoms
4. Let TypeScript catch errors instead of adding runtime checks
5. Work with the user to find the most efficient solution

## Commands

- `npm run web`: dev server at http://localhost:8081. Add `--clear` after build errors
- `npx tsc --noEmit`: type-check. Must be clean before a change is done
- `npx expo export -p web --output-dir dist`: production web build. Note the bundle size (2.85 MB after C-2)
- `npx expo export -p android --output-dir dist-android`: check that a change to shared code still bundles for native
- `npm run bible:split`: regenerate `public/bible/` and `src/data/bibleIndex.json` after changing anything in `src/data/`

## Platform-specific code

The base file is the native version, and a `.web.tsx` (or `.web.ts`) file beside it replaces it on web. TypeScript resolves the base file, and Metro picks the `.web` file in web builds. Both files must export the same shape. Don't use `.native.tsx`: without a base file, TypeScript can't resolve the import.

Current examples:

- `src/components/payment/StripeWrapper.tsx` / `.web.tsx`
- `src/screens/SubscriptionScreen.tsx` / `.web.tsx` (the web file is a placeholder until P-1)
- `src/services/bible/bibleData.ts` / `.web.ts`
- `src/components/common/dialog.tsx` / `.web.tsx`
- `src/services/payment/revenueCatService.tsx` / `.web.ts` (every web export throws)

Native-only libraries must never be imported from code the web bundle loads: `@stripe/stripe-react-native` and `react-native-purchases`.

## Bible data

- Use `loadBook(translationId, bookId)` from `src/services/bible/bibleData` for verses, and `BOOKS` / `getRandomVerse()` from `src/services/bible/bibleBooks` for the book list and random verses.
- Never import `src/data/combinedBible.json` or `combinedBibleASV.json` anywhere except `bibleData.ts`, or the whole Bible (16 MB) ends up back in the web bundle.
- Book IDs are upper-case codes (`GEN`, `JHN`). Book order and names come from `BIBLE_BOOKS` in `src/utils/bibleUtils.ts`, never from the source files: the KJV file is sorted alphabetically by book code.
- Web fetches `/bible/{kjv,asv}/{BOOK_ID}.json` from `public/`. Those generated files are committed to git and excluded from EAS uploads in `.easignore`.

## Things to know

- `Alert.alert` does nothing on react-native-web. Use `confirm()` and `notify()` from `src/components/common/dialog` instead; never call `Alert.alert` directly.
- Report and block live in `src/components/community/ModerationSheet.tsx` and `CommunityBoard.tsx`, and call `src/services/firebase/moderationService.ts`. Reports only land in the Firestore `reports` collection; nothing notifies anyone yet.
- Never commit `.env`.
- Keep `package-lock.json` in sync with `package.json` and commit it, or `npm ci` (and EAS builds) fail.
- Every story must leave the iOS and Android apps behaving as they did before. Check the definition of done in `docs/web-plan.md`.
