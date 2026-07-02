ROUND 2 FILES — copy each file to the same path inside your repo, overwriting:

  src\components\community\CommunityBoard.tsx   (NEW - create the folder)
  src\utils\dateUtils.ts                        (NEW)
  src\screens\PrayerBoard.tsx                   (overwrite)
  src\screens\BiblicalDiscussions.tsx           (overwrite)
  functions\firestore.rules                     (overwrite)
  functions\firestore.indexes.json              (overwrite)
  functions\index.tsx                           (overwrite)

The rules/index.tsx files already INCLUDE the round-1 changes, so overwriting
is safe regardless of patch state.

Then run from the repo root:
  npm install @expo/vector-icons
  npx tsc --noEmit          (should be clean)
  cd functions && npx tsc --noEmit

Deploy order when ready:
  firebase deploy --only firestore:rules,firestore:indexes
  firebase deploy --only functions
  then rebuild the app
