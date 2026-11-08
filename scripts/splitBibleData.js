// Splits the bundled Bible JSON into one file per book for the web app (story B-1).
//
// Writes:
//   public/bible/{kjv|asv}/{BOOK_ID}.json  verses of one book, sorted by chapter and verse
//   src/data/bibleIndex.json               { [BOOK_ID]: [verse count of chapter 1, chapter 2, ...] }
//
// Run after changing anything in src/data:  npm run bible:split

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const translations = {
  kjv: 'src/data/combinedBible.json',
  asv: 'src/data/combinedBibleASV.json',
};

const byChapterAndVerse = (a, b) => a.chapter - b.chapter || a.verse - b.verse;

// Returns { [bookId]: verses[] } and { [bookId]: verseCountsPerChapter[] }
function splitByBook(verses) {
  const books = {};
  for (const verse of verses) {
    (books[verse.book_id] ||= []).push(verse);
  }

  // Sorted keys, so the index doesn't depend on the order books appear in the source file.
  const index = {};
  for (const [bookId, bookVerses] of Object.entries(books).sort(([a], [b]) => a.localeCompare(b))) {
    bookVerses.sort(byChapterAndVerse);
    const counts = [];
    for (const verse of bookVerses) {
      counts[verse.chapter - 1] = (counts[verse.chapter - 1] || 0) + 1;
    }
    if (counts.some((count) => !count)) {
      throw new Error(`${bookId} has a missing chapter`);
    }
    index[bookId] = counts;
  }
  return { books, index };
}

let sharedIndex = null;

for (const [translation, file] of Object.entries(translations)) {
  const verses = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const { books, index } = splitByBook(verses);

  // Both translations must share one structure, because the app uses a single index.
  if (sharedIndex && JSON.stringify(index) !== JSON.stringify(sharedIndex)) {
    throw new Error(`${translation} has different books, chapters or verse counts than kjv`);
  }
  sharedIndex = index;

  const outDir = path.join(root, 'public', 'bible', translation);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [bookId, bookVerses] of Object.entries(books)) {
    fs.writeFileSync(path.join(outDir, `${bookId}.json`), JSON.stringify(bookVerses));
  }
  console.log(`${translation}: wrote ${Object.keys(books).length} books to public/bible/${translation}/`);
}

fs.writeFileSync(path.join(root, 'src', 'data', 'bibleIndex.json'), JSON.stringify(sharedIndex));
console.log('Wrote src/data/bibleIndex.json');
