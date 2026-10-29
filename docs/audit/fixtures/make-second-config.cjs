// Génère docs/audit/fixtures/app.config.second-map.json à partir de app.config.json.
// Sert au test « N cartes » : autre profil, autres dates, autres couleurs/polices, autres textes.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const c = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));

c.profile = 'autre-evenement-test';
c.app.name = 'Les Journées du Test';
c.app.shortName = 'JDT';
c.app.eventDates = { weekStart: '2026-11-10', weekEnd: '2026-11-16' };
Object.assign(c.theme.colors, { primary: '#1F5FAE', 'primary-dark': '#123A6B', 'primary-light': '#A7C4E8' });
Object.assign(c.theme.fonts, {
  heading: 'Poppins',
  body: 'Inter',
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Inter:wght@400;600&display=swap',
});
c.filters.dateFilterModes[1].label = 'Pendant les Journées du Test';

fs.writeFileSync(path.join(__dirname, 'app.config.second-map.json'), JSON.stringify(c, null, 2) + '\n');
console.log('fixture ok');
