import { TranslationId, Verse } from './types';

// Web: fetch one book at a time from public/bible/ (written by scripts/splitBibleData.js),
// so the Bible is never part of the JavaScript bundle. Native apps use bibleData.ts.

const cache = new Map<string, Promise<Verse[]>>();

/** All verses of one book, sorted by chapter and verse. */
export function loadBook(translationId: TranslationId, bookId: string): Promise<Verse[]> {
  const key = `${translationId}/${bookId}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const request = fetch(`/bible/${translationId.toLowerCase()}/${bookId}.json`).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load ${key}: HTTP ${res.status}`);
    }
    return res.json() as Promise<Verse[]>;
  });

  cache.set(key, request);
  // Don't keep a failed request cached, so the next attempt fetches again.
  request.catch(() => cache.delete(key));
  return request;
}
