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
        const chapterFiles = fs.readdirSync(bookDir);

        chapterFiles.forEach(chapterFile => {
            if (chapterFile.endsWith('.json')) {
                const filePath = path.join(bookDir, chapterFile);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                // Function to recursively extract verses from JSON
                function extractVerses(obj) {
                    if (Array.isArray(obj) && obj.every(item => typeof item.id === 'string' && typeof item.text === 'string')) {
                        combinedData.push(...obj);
                    } else if (typeof obj === 'object') {
                        for (const key in obj) {
                            extractVerses(obj[key]);
                        }
                    }
                }

                extractVerses(data);
            }
        });

    } catch (error) {
        console.error(`Error processing ${book}:`, error);
    }
});

fs.writeFileSync(path.join(dataDir, 'combinedBible.json'), JSON.stringify(combinedData, null, 2));

console.log('Bible data combined!');