const fs = require('fs');

const files = [
  'src/app/[city]/page.tsx',
  'src/app/[city]/wallet/page.tsx',
  'src/app/[city]/visits/page.tsx'
];

for (const file of files) {
  try {
    let code = fs.readFileSync(file, 'utf8');
    if (!code.includes('useTranslation')) {
      if (code.includes("import { useState")) {
         code = code.replace(/import \{ useState/, "import { useTranslation } from 'react-i18next';\nimport { useState");
      } else {
         code = code.replace(/import /, "import { useTranslation } from 'react-i18next';\nimport ");
      }
      code = code.replace(/export default function[^{]+\{/, match => match + "\n  const { t } = useTranslation();");
      fs.writeFileSync(file, code);
      console.log('Updated ' + file);
    }
  } catch(e) {
    console.error('Error on ' + file + ': ' + e.message);
  }
}
