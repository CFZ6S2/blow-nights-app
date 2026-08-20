const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const esPath = path.join(localesDir, 'es.json');
const esOriginalPath = path.join(localesDir, 'es_original.json');

const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const esOriginal = JSON.parse(fs.readFileSync(esOriginalPath, 'utf8'));

// Deep merge keys from esOriginal into es if they are missing in es
function restoreKeys(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      restoreKeys(target[key], source[key]);
    } else {
      if (target[key] === undefined) {
        target[key] = source[key];
      }
    }
  }
}

restoreKeys(es, esOriginal);

fs.writeFileSync(esPath, JSON.stringify(es, null, 2));
console.log('es.json restored missing original keys successfully!');
