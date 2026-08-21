const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const es = JSON.parse(fs.readFileSync(path.join(localesDir, 'es.json'), 'utf8'));
const languages = ['en', 'fr', 'it', 'pt', 'ca', 'de', 'ar', 'el', 'ru'];

function syncKeys(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      syncKeys(target[key], source[key]);
    } else {
      if (target[key] === undefined) {
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
  
  syncKeys(content, es);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  console.log(`Synced missing keys from es.json to ${lang}.json`);
}
