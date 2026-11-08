import verseCountsJson from '../../data/bibleIndex.json';
import { BIBLE_BOOKS } from '../../utils/bibleUtils';
import { loadBook } from './bibleData';
import { TranslationId, Verse } from './types';

// Verse counts per chapter for every book, written by scripts/splitBibleData.js.
// Both translations share this structure (the script checks).
const verseCounts = verseCountsJson as Record<string, number[]>;

export interface BookInfo {
  book_id: string;
  book_name: string;
  chapters: number;
}

/** Every book in canonical order (Genesis to Revelation). */
export const BOOKS: BookInfo[] = BIBLE_BOOKS.map((book) => {
  const counts = verseCounts[book.id];
  if (!counts) {
    throw new Error(`bibleIndex.json has no entry for ${book.id}; run npm run bible:split`);
  }
  return { book_id: book.id, book_name: book.name, chapters: counts.length };
});

const totalVerses = Object.values(verseCounts).reduce(
  (sum, counts) => sum + counts.reduce((a, b) => a + b, 0),
  0
);

/** A random verse, every verse equally likely. Loads only the book it lands in. */
export async function getRandomVerse(translationId: TranslationId): Promise<Verse> {
  let remaining = Math.floor(Math.random() * totalVerses);

  for (const book of BOOKS) {
    for (const [chapterIndex, count] of verseCounts[book.book_id].entries()) {
      if (remaining < count) {
        const chapter = chapterIndex + 1;
        const verseNumber = remaining + 1;
        const bookVerses = await loadBook(translationId, book.book_id);
        const verse = bookVerses.find((v) => v.chapter === chapter && v.verse === verseNumber);
        if (!verse) {
          throw new Error(`${book.book_id} ${chapter}:${verseNumber} missing from ${translationId}`);
        }
        return verse;
      }
      remaining -= count;
    }
  }

  throw new Error('Random verse index out of range');
}
