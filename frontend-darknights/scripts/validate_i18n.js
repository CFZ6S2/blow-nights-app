const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const locales = ['es', 'en', 'de', 'pt', 'ca', 'fr', 'it', 'el', 'ru', 'ar'];
const masterLocale = 'es';

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getKeys(obj[key], prefix + key + '.'));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

try {
  const masterPath = path.join(localesDir, `${masterLocale}.json`);
  const masterContent = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const masterKeys = new Set(getKeys(masterContent));
  
  let hasErrors = false;

  for (const locale of locales) {
    if (locale === masterLocale) continue;
    const localePath = path.join(localesDir, `${locale}.json`);
    if (!fs.existsSync(localePath)) {
      console.error(`❌ ${locale}.json is missing!`);
      hasErrors = true;
      continue;
    }
    
    const content = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    const keys = new Set(getKeys(content));
    
    const missingKeys = [...masterKeys].filter(x => !keys.has(x));
    const orphanKeys = [...keys].filter(x => !masterKeys.has(x));
    
    if (missingKeys.length > 0 || orphanKeys.length > 0) {
      console.error(`\n⚠️  ${locale}.json:`);
      if (missingKeys.length > 0) console.error(`   ❌ Missing: ${missingKeys.length} keys (e.g. ${missingKeys.slice(0, 3).join(', ')})`);
      if (orphanKeys.length > 0) console.error(`   ⚠️  Orphan: ${orphanKeys.length} keys (e.g. ${orphanKeys.slice(0, 3).join(', ')})`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n❌ Validation failed. Keys do not match across all locales.');
    process.exit(1);
  } else {
    console.log(`\n✅ All ${locales.length} locales: 0 missing keys, 0 orphan keys`);
  }
} catch (error) {
  console.error("Error running validation:", error);
  process.exit(1);
}
