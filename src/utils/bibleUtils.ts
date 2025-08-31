export const BIBLE_BOOKS = [
  // Old Testament
  { id: 'GEN', name: 'Genesis', testament: 'Old' },
  { id: 'EXO', name: 'Exodus', testament: 'Old' },
  { id: 'LEV', name: 'Leviticus', testament: 'Old' },
  { id: 'NUM', name: 'Numbers', testament: 'Old' },
  { id: 'DEU', name: 'Deuteronomy', testament: 'Old' },
  { id: 'JOS', name: 'Joshua', testament: 'Old' },
  { id: 'JDG', name: 'Judges', testament: 'Old' },
  { id: 'RUT', name: 'Ruth', testament: 'Old' },
  { id: '1SA', name: '1 Samuel', testament: 'Old' },
  { id: '2SA', name: '2 Samuel', testament: 'Old' },
  { id: '1KI', name: '1 Kings', testament: 'Old' },
  { id: '2KI', name: '2 Kings', testament: 'Old' },
  { id: '1CH', name: '1 Chronicles', testament: 'Old' },
  { id: '2CH', name: '2 Chronicles', testament: 'Old' },
  { id: 'EZR', name: 'Ezra', testament: 'Old' },
  { id: 'NEH', name: 'Nehemiah', testament: 'Old' },
  { id: 'EST', name: 'Esther', testament: 'Old' },
  { id: 'JOB', name: 'Job', testament: 'Old' },
  { id: 'PSA', name: 'Psalms', testament: 'Old' },
  { id: 'PRO', name: 'Proverbs', testament: 'Old' },
  { id: 'ECC', name: 'Ecclesiastes', testament: 'Old' },
  { id: 'SNG', name: 'Song of Solomon', testament: 'Old' },
  { id: 'ISA', name: 'Isaiah', testament: 'Old' },
  { id: 'JER', name: 'Jeremiah', testament: 'Old' },
  { id: 'LAM', name: 'Lamentations', testament: 'Old' },
  { id: 'EZK', name: 'Ezekiel', testament: 'Old' },
  { id: 'DAN', name: 'Daniel', testament: 'Old' },
  { id: 'HOS', name: 'Hosea', testament: 'Old' },
  { id: 'JOL', name: 'Joel', testament: 'Old' },
  { id: 'AMO', name: 'Amos', testament: 'Old' },
  { id: 'OBA', name: 'Obadiah', testament: 'Old' },
  { id: 'JON', name: 'Jonah', testament: 'Old' },
  { id: 'MIC', name: 'Micah', testament: 'Old' },
  { id: 'NAM', name: 'Nahum', testament: 'Old' },
  { id: 'HAB', name: 'Habakkuk', testament: 'Old' },
  { id: 'ZEP', name: 'Zephaniah', testament: 'Old' },
  { id: 'HAG', name: 'Haggai', testament: 'Old' },
  { id: 'ZEC', name: 'Zechariah', testament: 'Old' },
  { id: 'MAL', name: 'Malachi', testament: 'Old' },

  // New Testament
  { id: 'MAT', name: 'Matthew', testament: 'New' },
  { id: 'MRK', name: 'Mark', testament: 'New' },
  { id: 'LUK', name: 'Luke', testament: 'New' },
  { id: 'JHN', name: 'John', testament: 'New' },
  { id: 'ACT', name: 'Acts', testament: 'New' },
  { id: 'ROM', name: 'Romans', testament: 'New' },
  { id: '1CO', name: '1 Corinthians', testament: 'New' },
  { id: '2CO', name: '2 Corinthians', testament: 'New' },
  { id: 'GAL', name: 'Galatians', testament: 'New' },
  { id: 'EPH', name: 'Ephesians', testament: 'New' },
  { id: 'PHP', name: 'Philippians', testament: 'New' },
  { id: 'COL', name: 'Colossians', testament: 'New' },
  { id: '1TH', name: '1 Thessalonians', testament: 'New' },
  { id: '2TH', name: '2 Thessalonians', testament: 'New' },
  { id: '1TI', name: '1 Timothy', testament: 'New' },
  { id: '2TI', name: '2 Timothy', testament: 'New' },
  { id: 'TIT', name: 'Titus', testament: 'New' },
  { id: 'PHM', name: 'Philemon', testament: 'New' },
  { id: 'HEB', name: 'Hebrews', testament: 'New' },
  { id: 'JAS', name: 'James', testament: 'New' },
  { id: '1PE', name: '1 Peter', testament: 'New' },
  { id: '2PE', name: '2 Peter', testament: 'New' },
  { id: '1JN', name: '1 John', testament: 'New' },
  { id: '2JN', name: '2 John', testament: 'New' },
  { id: '3JN', name: '3 John', testament: 'New' },
  { id: 'JUD', name: 'Jude', testament: 'New' },
  { id: 'REV', name: 'Revelation', testament: 'New' },
];

export const findBookByName = (name: string) => {
  return BIBLE_BOOKS.find(book => book.name === name);
};

export const findBookById = (id: string) => {
  return BIBLE_BOOKS.find(book => book.id === id);
};

export const getBookIndex = (bookId: string) => {
  return BIBLE_BOOKS.findIndex(book => book.id === bookId);
};

export const getNextBook = (currentBookId: string) => {
  const index = getBookIndex(currentBookId);
  if (index >= 0 && index < BIBLE_BOOKS.length - 1) {
    return BIBLE_BOOKS[index + 1];
  }
  return null;
};

export const getPreviousBook = (currentBookId: string) => {
  const index = getBookIndex(currentBookId);
  if (index > 0) {
    return BIBLE_BOOKS[index - 1];
  }
  return null;
};