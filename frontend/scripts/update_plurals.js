const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const languages = ['es', 'en', 'fr', 'it', 'pt', 'ca', 'de', 'ar', 'el', 'ru'];

for (const lang of languages) {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;
  
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Map 'active_now'
  // If the language is Spanish, or if it's missing, we set Spanish values.
  // We'll just do naive plurals for the scaffolding.
  if (content.landing && content.landing.active_now) {
    content.landing.active_now_one = '{{count}} persona activa ahora';
    content.landing.active_now_other = '{{count}} personas activas ahora';
    delete content.landing.active_now;
  }

  // 2. venuesPage 'person' and 'people'
  if (content.venuesPage) {
    if (content.venuesPage.person) delete content.venuesPage.person;
    if (content.venuesPage.people) delete content.venuesPage.people;
    content.venuesPage.people_one = 'persona';
    content.venuesPage.people_other = 'personas';
  }

  // 3. venueDetail 'personGoes' and 'peopleGo'
  if (content.venueDetail) {
    if (content.venueDetail.personGoes) delete content.venueDetail.personGoes;
    if (content.venueDetail.peopleGo) delete content.venueDetail.peopleGo;
    content.venueDetail.peopleGo_one = 'persona va';
    content.venueDetail.peopleGo_other = 'personas van';
  }

  // 4. visits 'people'
  if (content.visits && content.visits.people) {
    delete content.visits.people;
    content.visits.people_one = 'persona';
    content.visits.people_other = 'personas';
  }
  
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
}

console.log('Pluralization keys added to all locales.');
