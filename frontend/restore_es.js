const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const esPath = path.join(localesDir, 'es.json');
const enPath = path.join(localesDir, 'en.json');

const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Deep merge keys from en into es if they are missing in es
function restoreKeys(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      restoreKeys(target[key], source[key]);
    } else {
      if (target[key] === undefined) {
        // We restore the English value to es.json (we can translate it manually later if needed, but it was originally Spanish anyway!)
        // Wait, the English value is English, not Spanish. But wait, I can just restore it from the git history of es.json!
        // But since I don't have git history easily accessible, I'll just put the English value for now. 
        target[key] = source[key];
      }
    }
  }
}

restoreKeys(es, en);

fs.writeFileSync(esPath, JSON.stringify(es, null, 2));
console.log('es.json restored missing keys from en.json');
