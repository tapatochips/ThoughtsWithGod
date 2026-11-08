import kjvData from '../../data/combinedBible.json';
import asvData from '../../data/combinedBibleASV.json';
import { TranslationId, Verse } from './types';

// Native (iOS + Android): the whole Bible stays bundled, so reading works offline.
// The web bundle loads bibleData.web.ts instead, which fetches one book at a time.

const allVerses: Record<TranslationId, Verse[]> = {
  KJV: kjvData as Verse[],
  ASV: asvData as Verse[],
};

const cache = new Map<string, Verse[]>();

/** All verses of one book, sorted by chapter and verse. */
export async function loadBook(translationId: TranslationId, bookId: string): Promise<Verse[]> {
  const key = `${translationId}/${bookId}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const verses = allVerses[translationId]
    .filter((v) => v.book_id === bookId)
    .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  if (verses.length === 0) {
    throw new Error(`Book ${bookId} not found in ${translationId}`);
  }

  cache.set(key, verses);
  return verses;
}
