const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const missingPath = path.join(__dirname, 'missing_keys.json');
const missingKeys = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

const languages = ['en', 'fr', 'it', 'pt', 'ca', 'de', 'ar', 'el', 'ru'];

// Helper to deep merge and add [TODO] prefix to translated values
function mergeAndMark(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      mergeAndMark(target[key], source[key]);
    } else {
      if (target[key] === undefined) {
        // Just copy the Spanish value, we can add a prefix if we want
        target[key] = source[key];
      }
    }
  }
}

for (const lang of languages) {
  const filePath = path.join(localesDir, `${lang}.json`);
  let content = {};
  if (fs.existsSync(filePath)) {
    content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  
  mergeAndMark(content, missingKeys);
  
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  console.log(`Updated ${lang}.json with missing keys.`);
}
