const fs = require('fs');
const path = require('path');

// Book name mapping (folder name -> display name and ID)
const bookMapping = {
  'genesis': { id: 'GEN', name: 'Genesis' },
  'exodus': { id: 'EXO', name: 'Exodus' },
  'leviticus': { id: 'LEV', name: 'Leviticus' },
  'numbers': { id: 'NUM', name: 'Numbers' },
  'deuteronomy': { id: 'DEU', name: 'Deuteronomy' },
  'joshua': { id: 'JOS', name: 'Joshua' },
  'judges': { id: 'JDG', name: 'Judges' },
  'ruth': { id: 'RUT', name: 'Ruth' },
  '1samuel': { id: '1SA', name: '1 Samuel' },
  '2samuel': { id: '2SA', name: '2 Samuel' },
  '1kings': { id: '1KI', name: '1 Kings' },
  '2kings': { id: '2KI', name: '2 Kings' },
  '1chronicles': { id: '1CH', name: '1 Chronicles' },
  '2chronicles': { id: '2CH', name: '2 Chronicles' },
  'ezra': { id: 'EZR', name: 'Ezra' },
  'nehemiah': { id: 'NEH', name: 'Nehemiah' },
  'esther': { id: 'EST', name: 'Esther' },
  'job': { id: 'JOB', name: 'Job' },
  'psalms': { id: 'PSA', name: 'Psalms' },
  'proverbs': { id: 'PRO', name: 'Proverbs' },
  'ecclesiastes': { id: 'ECC', name: 'Ecclesiastes' },
  'songofsolomon': { id: 'SNG', name: 'Song of Solomon' },
  'isaiah': { id: 'ISA', name: 'Isaiah' },
  'jeremiah': { id: 'JER', name: 'Jeremiah' },
  'lamentations': { id: 'LAM', name: 'Lamentations' },
  'ezekiel': { id: 'EZK', name: 'Ezekiel' },
  'daniel': { id: 'DAN', name: 'Daniel' },
  'hosea': { id: 'HOS', name: 'Hosea' },
  'joel': { id: 'JOL', name: 'Joel' },
  'amos': { id: 'AMO', name: 'Amos' },
  'obadiah': { id: 'OBA', name: 'Obadiah' },
  'jonah': { id: 'JON', name: 'Jonah' },
  'micah': { id: 'MIC', name: 'Micah' },
  'nahum': { id: 'NAM', name: 'Nahum' },
  'habakkuk': { id: 'HAB', name: 'Habakkuk' },
  'zephaniah': { id: 'ZEP', name: 'Zephaniah' },
  'haggai': { id: 'HAG', name: 'Haggai' },
  'zechariah': { id: 'ZEC', name: 'Zechariah' },
  'malachi': { id: 'MAL', name: 'Malachi' },
  'matthew': { id: 'MAT', name: 'Matthew' },
  'mark': { id: 'MRK', name: 'Mark' },
  'luke': { id: 'LUK', name: 'Luke' },
  'john': { id: 'JHN', name: 'John' },
  'acts': { id: 'ACT', name: 'Acts' },
  'romans': { id: 'ROM', name: 'Romans' },
  '1corinthians': { id: '1CO', name: '1 Corinthians' },
  '2corinthians': { id: '2CO', name: '2 Corinthians' },
  'galatians': { id: 'GAL', name: 'Galatians' },
  'ephesians': { id: 'EPH', name: 'Ephesians' },
  'philippians': { id: 'PHP', name: 'Philippians' },
  'colossians': { id: 'COL', name: 'Colossians' },
  '1thessalonians': { id: '1TH', name: '1 Thessalonians' },
  '2thessalonians': { id: '2TH', name: '2 Thessalonians' },
  '1timothy': { id: '1TI', name: '1 Timothy' },
  '2timothy': { id: '2TI', name: '2 Timothy' },
  'titus': { id: 'TIT', name: 'Titus' },
  'philemon': { id: 'PHM', name: 'Philemon' },
  'hebrews': { id: 'HEB', name: 'Hebrews' },
  'james': { id: 'JAS', name: 'James' },
  '1peter': { id: '1PE', name: '1 Peter' },
  '2peter': { id: '2PE', name: '2 Peter' },
  '1john': { id: '1JN', name: '1 John' },
  '2john': { id: '2JN', name: '2 John' },
  '3john': { id: '3JN', name: '3 John' },
  'jude': { id: 'JUD', name: 'Jude' },
  'revelation': { id: 'REV', name: 'Revelation' }
};

// Biblical book order
const bookOrder = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  'joshua', 'judges', 'ruth', '1samuel', '2samuel',
  '1kings', '2kings', '1chronicles', '2chronicles', 'ezra',
  'nehemiah', 'esther', 'job', 'psalms', 'proverbs',
  'ecclesiastes', 'songofsolomon', 'isaiah', 'jeremiah', 'lamentations',
  'ezekiel', 'daniel', 'hosea', 'joel', 'amos',
  'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
  'zephaniah', 'haggai', 'zechariah', 'malachi',
  'matthew', 'mark', 'luke', 'john', 'acts',
  'romans', '1corinthians', '2corinthians', 'galatians', 'ephesians',
  'philippians', 'colossians', '1thessalonians', '2thessalonians', '1timothy',
  '2timothy', 'titus', 'philemon', 'hebrews', 'james',
  '1peter', '2peter', '1john', '2john', '3john',
  'jude', 'revelation'
];

const booksDir = path.join(__dirname, 'books');
const outputPath = path.join(__dirname, 'src', 'data', 'combinedBibleASV.json');

const allVerses = [];

console.log('Starting ASV Bible data combination...\n');

for (const bookFolder of bookOrder) {
  const bookPath = path.join(booksDir, bookFolder);
  const bookInfo = bookMapping[bookFolder];

  if (!bookInfo) {
    console.log(`Warning: No mapping for ${bookFolder}`);
    continue;
  }

  if (!fs.existsSync(bookPath)) {
    console.log(`Warning: Book folder not found: ${bookFolder}`);
    continue;
  }

  const chaptersDir = path.join(bookPath, 'chapters');
  if (!fs.existsSync(chaptersDir)) {
    console.log(`Warning: No chapters directory for ${bookFolder}`);
    continue;
  }

  // Get all chapter directories (numbered folders containing verses)
  const chapterEntries = fs.readdirSync(chaptersDir);
  const chapterNumbers = chapterEntries
    .filter(entry => {
      const entryPath = path.join(chaptersDir, entry);
      return fs.statSync(entryPath).isDirectory() && !isNaN(parseInt(entry));
    })
    .map(entry => parseInt(entry))
    .sort((a, b) => a - b);

  let bookVerseCount = 0;

  for (const chapterNum of chapterNumbers) {
    const versesDir = path.join(chaptersDir, chapterNum.toString(), 'verses');

    if (!fs.existsSync(versesDir)) {
      continue;
    }

    // Get all verse files
    const verseFiles = fs.readdirSync(versesDir)
      .filter(file => file.endsWith('.json'))
      .map(file => parseInt(file.replace('.json', '')))
      .sort((a, b) => a - b);

    for (const verseNum of verseFiles) {
      const verseFilePath = path.join(versesDir, `${verseNum}.json`);

      try {
        const verseData = JSON.parse(fs.readFileSync(verseFilePath, 'utf8'));

        allVerses.push({
          book_id: bookInfo.id,
          book_name: bookInfo.name,
          chapter: chapterNum,
          verse: parseInt(verseData.verse) || verseNum,
          text: verseData.text || '',
          info: ''
        });
        bookVerseCount++;
      } catch (err) {
        console.log(`Error reading ${verseFilePath}: ${err.message}`);
      }
    }
  }

  console.log(`${bookInfo.name}: ${bookVerseCount} verses`);
}

console.log(`\nTotal verses: ${allVerses.length}`);

// Ensure the output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the combined data
fs.writeFileSync(outputPath, JSON.stringify(allVerses, null, 2));

console.log(`\nASV Bible data saved to: ${outputPath}`);
