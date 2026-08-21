const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const es = JSON.parse(fs.readFileSync(path.join(localesDir, 'es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));

function getMissingKeys(source, target) {
  let missing = {};
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) {
        missing[key] = source[key];
      } else {
        const nestedMissing = getMissingKeys(source[key], target[key]);
        if (Object.keys(nestedMissing).length > 0) {
          missing[key] = nestedMissing;
        }
      }
    } else {
      if (target[key] === undefined) {
        missing[key] = source[key];
      }
    }
  }
  return missing;
}

const missing = getMissingKeys(es, en);
fs.writeFileSync('missing_keys.json', JSON.stringify(missing, null, 2));
console.log('Missing keys extracted to missing_keys.json. Total top-level keys:', Object.keys(missing).length);
