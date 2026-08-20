/**
 * Script de validacion de i18n
 * Verifica que todos los archivos de traduccion tengan las mismas claves que es.json (base)
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../frontend/src/i18n/locales');
const BASE_LOCALE = 'es.json';

console.log('🔍 Validando i18n...\n');

// Leer archivo base
const basePath = path.join(LOCALES_DIR, BASE_LOCALE);
const baseContent = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const baseKeys = new Set(Object.keys(baseContent));

console.log(`📄 Archivo base: ${BASE_LOCALE} (${baseKeys.size} keys)\n`);

// Leer todos los archivos .json en el directorio
const files = fs.readdirSync(LOCALES_DIR)
  .filter(file => file.endsWith('.json') && file !== BASE_LOCALE && !file.includes('_tmp') && !file.includes('_original'));

let hasErrors = false;

files.forEach(file => {
  const filePath = path.join(LOCALES_DIR, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const keys = new Set(Object.keys(content));
  
  // Verificar keys faltantes
  const missingKeys = [...baseKeys].filter(key => !keys.has(key));
  
  // Verificar keys extra
  const extraKeys = [...keys].filter(key => !baseKeys.has(key));
  
  if (missingKeys.length > 0 || extraKeys.length > 0) {
    hasErrors = true;
    console.log(`❌ ${file}:`);
    
    if (missingKeys.length > 0) {
      console.log(`   Faltan ${missingKeys.length} keys:`);
      missingKeys.slice(0, 10).forEach(key => console.log(`     - ${key}`));
      if (missingKeys.length > 10) {
        console.log(`     ... y ${missingKeys.length - 10} mas`);
      }
    }
    
    if (extraKeys.length > 0) {
      console.log(`   Extra ${extraKeys.length} keys:`);
      extraKeys.slice(0, 10).forEach(key => console.log(`     - ${key}`));
      if (extraKeys.length > 10) {
        console.log(`     ... y ${extraKeys.length - 10} mas`);
      }
    }
    
    console.log('');
  } else {
    console.log(`✅ ${file}: OK (${keys.size} keys)`);
  }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('❌ VALIDACION FALLIDA: Hay inconsistencias en las traducciones');
  console.log('\nEjecuta uno de los siguientes scripts para corregir:');
  console.log('  - node frontend/sync_locales.js (sincronizar keys)');
  console.log('  - node frontend/translate_others.js (traducir keys faltantes)');
  process.exit(1);
} else {
  console.log('✅ VALIDACION EXITOSA: Todos los archivos tienen las mismas keys');
  process.exit(0);
}
