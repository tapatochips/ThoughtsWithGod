export type TranslationId = 'KJV' | 'ASV';

export interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
  info: string;
}
