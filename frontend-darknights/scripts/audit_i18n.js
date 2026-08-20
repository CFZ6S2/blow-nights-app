const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const inventoryPath = path.join(__dirname, 'translation_inventory.json');

const EXCLUDED_DIRS = ['node_modules', '.next', 'i18n'];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && !EXCLUDED_DIRS.includes(f)) {
      walkDir(dirPath, callback);
    } else if (!isDirectory && dirPath.endsWith('.tsx')) {
      callback(path.join(dir, f));
    }
  });
}

const results = {};

// Very simple heuristic to find Spanish text in TSX
// Matches >Texto<, placeholder="Texto", aria-label="Texto", title="Texto"
const textRegex = />([^<>{]+)</g;
const placeholderRegex = /placeholder="([^"]+)"/g;
const ariaRegex = /aria-label="([^"]+)"/g;
const titleRegex = /title="([^"]+)"/g;
const altRegex = /alt="([^"]+)"/g;
const toastRegex = /toast\(\s*['"]([^'"]+)['"]/g;

function extractStrings(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const strings = new Set();
  
  // Exclude files that are mostly english or already fully translated if we want, 
  // but let's just grab everything that looks like Spanish text (heuristics: spaces, length > 2)
  
  const addMatches = (regex) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].trim();
      if (text.length > 1 && /[a-zA-ZÁÉÍÓÚáéíóúÑñ]/.test(text) && !text.includes('className') && !text.includes('flex')) {
        strings.add(text);
      }
    }
  };

  addMatches(textRegex);
  addMatches(placeholderRegex);
  addMatches(ariaRegex);
  addMatches(titleRegex);
  addMatches(altRegex);
  addMatches(toastRegex);
  
  if (strings.size > 0) {
    results[filePath.replace(srcDir, '')] = Array.from(strings);
  }
}

walkDir(srcDir, extractStrings);

fs.writeFileSync(inventoryPath, JSON.stringify(results, null, 2));
console.log(`Inventory saved to ${inventoryPath}. Found strings in ${Object.keys(results).length} files.`);
