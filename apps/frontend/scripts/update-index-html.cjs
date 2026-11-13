'use strict';

/**
 * Génère `apps/frontend/index.html` (fichier ignoré par git) à partir de
 * `apps/frontend/index.template.html` (suivi par git) et de la config de la carte.
 *
 * - Le modèle n'est jamais modifié : le script est idempotent et ne laisse aucun diff.
 * - Config lue : `APP_CONFIG_PATH` si défini, sinon `app.config.json` à la racine du dépôt
 *   (même convention que le backend). Les gabarits `{{...}}` y sont résolus.
 * - Une valeur manquante ou un placeholder absent du modèle fait échouer le script avec un
 *   message clair, plutôt que d'écrire « undefined » dans la page.
 *
 * Une carte = une compilation : lancer `APP_CONFIG_PATH=<config> pnpm build` par carte.
 */

const fs = require('fs');
const path = require('path');
const { resolveConfigTemplates } = require('./config-template.cjs');

const TEMPLATE_PATH = path.resolve(__dirname, '../index.template.html');
const OUTPUT_PATH = path.resolve(__dirname, '../index.html');
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../../../app.config.json');

// Placeholder du modèle -> chemin de la valeur dans la config.
const REPLACEMENTS = [
  ['<meta name="description" content="description" />', 'meta', 'app.description'],
  ['<meta property="og:title" content="og:title" />', 'meta', 'texts.meta.ogTitle'],
  ['<meta property="og:description" content="og:description" />', 'meta', 'texts.meta.ogDescription'],
  ['<meta property="twitter:title" content="twitter:title" />', 'meta', 'texts.meta.ogTitle'],
  ['<meta property="twitter:description" content="twitter:description" />', 'meta', 'texts.meta.ogDescription'],
  ['<title>title</title>', 'title', 'texts.meta.title'],
  ['<link rel="icon" type="image/x-icon" href="iconRef" />', 'icon', 'texts.meta.iconRef'],
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function render(placeholder, kind, value) {
  const v = escapeHtml(value);
  if (kind === 'title') return `<title>${v}</title>`;
  if (kind === 'icon') return `<link rel="icon" type="image/x-icon" href="${v}" />`;
  // meta : on conserve la balise du modèle en remplaçant uniquement l'attribut content
  return placeholder.replace(/content="[^"]*"/, () => `content="${v}"`);
}

/** Retourne le HTML final. Lève une erreur claire si la config ou le modèle sont incomplets. */
function buildIndexHtml(template, rawConfig, onWarn = () => undefined) {
  const config = resolveConfigTemplates(rawConfig, onWarn);

  const missing = [
    ...new Set(
      REPLACEMENTS.map(([, , key]) => key).filter((key) => {
        const value = getPath(config, key);
        return typeof value !== 'string' || value.trim() === '';
      }),
    ),
  ];
  if (missing.length > 0) {
    throw new Error(
      `Config incomplète pour index.html : valeur(s) texte absente(s) ou vide(s) : ${missing.join(', ')}.`,
    );
  }

  let html = template;
  for (const [placeholder, kind, key] of REPLACEMENTS) {
    if (!html.includes(placeholder)) {
      throw new Error(
        `Modèle index.template.html : placeholder introuvable (${placeholder}). Le modèle doit rester celui du dépôt.`,
      );
    }
    html = html.replace(placeholder, () => render(placeholder, kind, getPath(config, key)));
  }
  return html;
}

function main() {
  const configPath = process.env.APP_CONFIG_PATH
    ? path.resolve(process.env.APP_CONFIG_PATH)
    : DEFAULT_CONFIG_PATH;

  if (!fs.existsSync(configPath)) {
    console.error(`Config introuvable : ${configPath} (définir APP_CONFIG_PATH).`);
    process.exit(1);
  }

  try {
    const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const html = buildIndexHtml(template, rawConfig, (m) => console.warn(`[index.html] ${m}`));
    fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
    console.log(`index.html généré depuis ${configPath}`);
  } catch (error) {
    console.error(`[index.html] ${error.message}`);
    process.exit(1);
  }
}

module.exports = { buildIndexHtml, escapeHtml };

if (require.main === module) main();
