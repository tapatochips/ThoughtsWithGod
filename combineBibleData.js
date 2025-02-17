const fs = require('fs');
const path = require('path');

const bibleJsonDir = path.join(__dirname, 'BibleJSON', 'JSON');
const dataDir = path.join(__dirname, 'data');

fs.mkdirSync(dataDir, { recursive: true });

const books = fs.readdirSync(bibleJsonDir).filter(item => fs.statSync(path.join(bibleJsonDir, item)).isDirectory());

console.log("Books found:", books);

const combinedData = [];

books.forEach(book => {
    try {
        const bookDir = path.join(bibleJsonDir, book);
        const chapterFiles = fs.readdirSync(bookDir); // Files are directly here

        chapterFiles.forEach(chapterFile => {
            if (chapterFile.endsWith('.json')) {
                const filePath = path.join(bookDir, chapterFile); // Path to the JSON file
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                const verses = data.verses || data;

                if (Array.isArray(verses)) {
                    combinedData.push(...verses);
                } else {
                    console.warn(`Unexpected data format in ${filePath}. Skipping.`);
                }
            }
        });

    } catch (error) {
        console.error(`Error processing ${book}:`, error);
    }
});

fs.writeFileSync(path.join(dataDir, 'combinedBible.json'), JSON.stringify(combinedData, null, 2));

console.log('Bible data combined!');