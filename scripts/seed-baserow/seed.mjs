#!/usr/bin/env node
/**
 * Seed Baserow LOCAL pour l'audit et le dev (outil de dev, JAMAIS en production).
 *
 * - Crée (idempotent) un compte admin, une base "LGSV test", 5 tables
 *   (Événements, Partenaires, Thématiques, Formats, Publics) et leurs champs.
 * - Vide puis recharge les lignes : le résultat est reproductible à chaque exécution.
 * - Écrit apps/backend/.env (gitignoré) avec les IDs de tables, de champ et le jeton.
 * - Écrit scripts/seed-baserow/out/schema.json (schéma réel créé).
 *
 * Les noms de champs et les valeurs de listes de choix suivent la config de la carte
 * (`baserow.fieldMapping` et `baserow.mapping` de `app.config.json`, ou `--config=...`).
 * NB : exception assumée à la règle "Baserow en lecture seule" : cette règle concerne
 * le BACKEND de l'application, pas cet outil de dev qui cible une instance Docker locale.
 *
 * Volume : 1000 événements au total par défaut (cas manuels + événements générés).
 * `--total=N` change le total ; `--bulk=N` fixe directement le nombre d'événements générés
 * (en plus des cas manuels) et l'emporte sur `--total`.
 *
 * Usage :
 *   node scripts/seed-baserow/seed.mjs [--total=1000 | --bulk=964] [--url=http://localhost:8088] [--no-env] [--config=chemin/app.config.json]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const BASE = (args.url || process.env.BASEROW_LOCAL_URL || 'http://localhost:8088').replace(/\/$/, '');
const DEFAULT_TOTAL = 1000;
function intArg(name, fallback) {
  if (args[name] === undefined) return fallback;
  const n = Number(args[name]);
  if (!Number.isInteger(n) || n < 0) {
    console.error(`--${name} doit être un entier positif ou nul (reçu : ${args[name]}).`);
    process.exit(1);
  }
  return n;
}
const TOTAL = intArg('total', DEFAULT_TOTAL);
const BULK_OVERRIDE = intArg('bulk', null);
const ADMIN = {
  name: 'Admin LGSV',
  email: process.env.BASEROW_LOCAL_EMAIL || 'admin@lgsv.local',
  password: process.env.BASEROW_LOCAL_PASSWORD || 'Lgsv-Local-2026!',
};
const DB_NAME = 'LGSV test';

// Noms de champs et valeurs de listes : repris de la config de la carte pour rester alignés avec
// le backend. `--config=chemin/vers/app.config.json` seed le schéma d'une autre carte.
const CONFIG_PATH = args.config ? resolve(String(args.config)) : resolve(ROOT, 'app.config.json');
const appConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const FM = appConfig.baserow.fieldMapping;
const MAPPING = appConfig.baserow.mapping;
const REF = MAPPING.referenceFields; // colonnes des tables de référence (nom, logo, picto, couleur)
const MODERATION_OK = appConfig.baserow.moderationVisibleValue;
const TARIFF_FREE = MAPPING.tariffFreeValue;

// Les cas de test parlent de rôles ('Présentiel', 'Distanciel', 'Hybride', 'Gratuit') : on les
// traduit ici en valeurs de listes de choix de la config (le seed crée les options de la config).
const labelsFor = (role) => Object.entries(MAPPING.modality).filter(([, v]) => v === role).map(([k]) => k);
const MODALITY_OPTIONS = Object.keys(MAPPING.modality);
const MODALITY_LABEL = {
  Présentiel: labelsFor('presentiel')[0],
  Distanciel: labelsFor('distanciel')[0],
  Hybride: labelsFor('presentiel')[1] ?? labelsFor('presentiel')[0],
};
if (!MODALITY_LABEL.Présentiel || !MODALITY_LABEL.Distanciel) {
  throw new Error('baserow.mapping.modality doit associer au moins une valeur à "presentiel" et une à "distanciel"');
}
const TARIFF_LABEL = (token) => (token === 'Gratuit' ? TARIFF_FREE : token);
console.log(`[seed] Config : ${CONFIG_PATH}`);

// ---------------------------------------------------------------- HTTP
let jwt = null;
async function api(method, path, body, { token = 'jwt', raw = false } = {}) {
  const headers = {};
  if (token === 'jwt' && jwt) headers.Authorization = `JWT ${jwt}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (raw) return { status: res.status, json };
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${typeof json === 'string' ? json : JSON.stringify(json)}`);
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[seed]', ...a);

async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/api/_health/`);
      if (r.ok) return;
    } catch {
      /* pas prêt */
    }
    if (i % 5 === 0) log(`Baserow pas prêt (${BASE}), attente...`);
    await sleep(5000);
  }
  throw new Error(`Baserow injoignable sur ${BASE}`);
}

async function authenticate() {
  const signup = await api(
    'POST',
    '/api/user/',
    { ...ADMIN, language: 'fr', authenticate: true },
    { token: null, raw: true },
  );
  if (signup.status === 200) {
    jwt = signup.json.access_token ?? signup.json.token;
    log('Compte admin créé');
    return;
  }
  const login = await api(
    'POST',
    '/api/user/token-auth/',
    { email: ADMIN.email, password: ADMIN.password },
    { token: null },
  );
  jwt = login.access_token ?? login.token;
  log('Connecté avec le compte admin existant');
}

// ---------------------------------------------------------------- Schéma
async function ensureWorkspaceAndDb() {
  const workspaces = await api('GET', '/api/workspaces/');
  let workspace = workspaces[0];
  if (!workspace) {
    workspace = await api('POST', '/api/workspaces/', { name: 'LGSV' });
    log('Workspace "LGSV" créé');
  }
  const apps = await api('GET', `/api/applications/workspace/${workspace.id}/`);
  let db = apps.find((a) => a.type === 'database' && a.name === DB_NAME);
  if (!db) {
    db = await api('POST', `/api/applications/workspace/${workspace.id}/`, {
      name: DB_NAME,
      type: 'database',
    });
    log(`Base "${DB_NAME}" créée`);
  }
  return { workspace, db };
}

async function ensureTable(db, name, primaryName) {
  const tables = await api('GET', `/api/database/tables/database/${db.id}/`);
  let table = tables.find((t) => t.name === name);
  if (!table) {
    table = await api('POST', `/api/database/tables/database/${db.id}/`, {
      name,
      data: [[primaryName]],
      first_row_header: true,
    });
    log(`Table "${name}" créée`);
  }
  let fields = await api('GET', `/api/database/fields/table/${table.id}/`);
  const primary = fields.find((f) => f.primary);
  if (primary && primary.name !== primaryName) {
    await api('PATCH', `/api/database/fields/${primary.id}/`, { name: primaryName });
    fields = await api('GET', `/api/database/fields/table/${table.id}/`);
  }
  return { table, fields };
}

async function ensureField(ctx, def) {
  const existing = ctx.fields.find((f) => f.name === def.name);
  if (existing && (existing.type === def.type || existing.primary)) {
    return def.select_options && !existing.primary ? syncSelectOptions(ctx, existing, def.select_options) : existing;
  }
  if (existing) {
    // Schéma local périmé (ex. ancienne colonne « Couleur » en liste de choix multiple, remplacée
    // par une liste de choix simple) : on supprime la colonne pour la recréer au bon type.
    log(`Colonne "${def.name}" de "${ctx.table.name}" : type ${existing.type} remplacé par ${def.type}`);
    await api('DELETE', `/api/database/fields/${existing.id}/`);
    ctx.fields = ctx.fields.filter((f) => f.id !== existing.id);
  }
  const created = await api('POST', `/api/database/fields/table/${ctx.table.id}/`, def);
  ctx.fields.push(created);
  return created;
}

// Liste de choix existante : ajoute les options manquantes et aligne leur pastille sur le seed
// (les options existantes gardent leur identifiant, les lignes qui les utilisent restent valides).
async function syncSelectOptions(ctx, field, wanted) {
  const current = field.select_options || [];
  const merged = current.map((o) => {
    const w = wanted.find((x) => x.value === o.value);
    return w ? { ...o, color: w.color } : o;
  });
  for (const w of wanted) if (!current.some((o) => o.value === w.value)) merged.push(w);
  const unchanged =
    merged.length === current.length && merged.every((o, i) => o.color === current[i].color);
  if (unchanged) return field;
  const updated = await api('PATCH', `/api/database/fields/${field.id}/`, { select_options: merged });
  ctx.fields = ctx.fields.map((f) => (f.id === field.id ? updated : f));
  return updated;
}

const opts = (values, color = 'light-blue') => values.map((value) => ({ value, color }));

// ---------------------------------------------------------------- Images PNG générées
function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(w, h, [r, g, b]) {
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
async function uploadImage(name, w, h, rgb) {
  const form = new FormData();
  form.append('file', new Blob([makePng(w, h, rgb)], { type: 'image/png' }), name);
  const res = await api('POST', '/api/user-files/upload-file/', form);
  return { name: res.name, visible_name: name };
}

// ---------------------------------------------------------------- Référentiels
// Options de la colonne « Couleur » (liste de choix simple) des référentiels : le nom est libre,
// seule la pastille Baserow compte (traduite par apps/backend/src/baserow/baserow-palette.ts).
// Uniquement des pastilles proposées par le sélecteur de Baserow (lignes « dark » et « darker »),
// pour que le jeu de test ressemble à ce qu'un admin peut créer. La dernière option, nommée par un
// code hexadécimal, reproduit l'ancien schéma : ce code prime sur la pastille (docs/baserow/couleurs.md).
const COLOR_OPTIONS = [
  ['Orange', 'darker-orange'],
  ['Vert', 'darker-green'],
  ['Vert clair', 'dark-green'],
  ['Bleu', 'darker-blue'],
  ['Bleu clair', 'dark-blue'],
  ['Cyan', 'darker-cyan'],
  ['Violet', 'darker-purple'],
  ['Lilas', 'dark-purple'],
  ['Rose', 'darker-pink'],
  ['Rouge', 'darker-red'],
  ['Saumon', 'dark-red'],
  ['Jaune', 'dark-yellow'],
  ['Marron', 'darker-brown'],
  ['Gris', 'darker-gray'],
  ['#E74C8C', 'darker-pink'],
];
const FORMATS = [
  ['Atelier de cuisine', 'ChefHat', 'Orange'],
  ['Dégustation ou menu végétal', 'Utensils', 'Vert'],
  ['Visite de jardin / potager ou cueillette', 'Sprout', 'Vert clair'],
  ['Atelier pédagogique ou formation', 'GraduationCap', 'Bleu'],
  ['Conférence/webinaire/table-ronde', 'Mic', 'Violet'],
  ['Festival', 'PartyPopper', '#E74C8C'],
  ['Autres', 'Sparkles', 'Gris'],
  // Cas limites référentiel : picto inexistant, puis sans picto ni couleur.
  ['[TEST] Format picto invalide', 'IconeQuiNexistePas', 'Jaune'],
  ['[TEST] Format sans picto ni couleur', null, null],
];
const PUBLICS = [
  ['Tout public', 'Users', 'Vert'],
  ['Familles / enfants', 'Baby', 'Orange'],
  ["Salariés d'une entreprise", 'Briefcase', 'Bleu clair'],
  ['Professionnels', 'Building2', 'Lilas'],
  ['Scolaires', 'School', 'Rouge'],
];
const THEMES = [
  ['Cuisine végétale', 'Carrot', 'Orange'],
  ['Santé & nutrition', 'HeartPulse', 'Saumon'],
  ['Biodiversité', 'Bug', 'Vert clair'],
  ['Agriculture', 'Tractor', 'Marron'],
  ['Climat & environnement', 'Leaf', 'Cyan'],
];
const PARTNERS = [
  ['Association Légumineuses & Co', [255, 190, 120]],
  ['Ferme du Vert Bocage', [140, 200, 130]],
  ['Fédération des Cuisiniers Végétaux', [240, 130, 130]],
  ['Ville de Nantes', [130, 170, 230]],
  ['Collectif Alimentation Durable', [200, 160, 220]],
  ['[TEST] Partenaire sans logo', null],
];
const ACCESS = ['Accessible PMR', 'Boucle auditive', 'Parking à proximité', 'Transports en commun'];

// ---------------------------------------------------------------- Lieux (adresses réelles)
const CITIES = [
  ['Paris', '75011', 'rue Oberkampf'], ['Lyon', '69002', 'rue de la République'],
  ['Marseille', '13001', 'rue de la République'], ['Toulouse', '31000', 'rue d\'Alsace-Lorraine'],
  ['Nantes', '44000', 'rue Crébillon'], ['Bordeaux', '33000', 'rue Sainte-Catherine'],
  ['Lille', '59000', 'rue Faidherbe'], ['Strasbourg', '67000', 'rue des Grandes Arcades'],
  ['Rennes', '35000', 'rue de Nemours'], ['Montpellier', '34000', 'rue de la Loge'],
  ['Nice', '06000', 'avenue Jean Médecin'], ['Grenoble', '38000', 'rue Lafayette'],
  ['Dijon', '21000', 'rue de la Liberté'], ['Clermont-Ferrand', '63000', 'rue du Onze Novembre'],
  ['Rouen', '76000', 'rue du Gros Horloge'], ['Tours', '37000', 'rue Nationale'],
  ['Besançon', '25000', 'Grande Rue'], ['Brest', '29200', 'rue de Siam'],
  ['Limoges', '87000', 'rue Jean Jaurès'], ['Amiens', '80000', 'rue des Trois Cailloux'],
  ['Metz', '57000', 'rue Serpenoise'], ['Orléans', '45000', 'rue Jeanne d\'Arc'],
  ['Perpignan', '66000', 'rue de la Loge'], ['Poitiers', '86000', 'rue Gambetta'],
  ['Saint-Denis', '97400', 'rue de Paris'], ['Fort-de-France', '97200', 'rue Victor Hugo'],
  ['Pointe-à-Pitre', '97110', 'rue Frébault'], ['Cayenne', '97300', 'avenue du Général de Gaulle'],
  ['Mamoudzou', '97600', 'rue du Commerce'], ['Ajaccio', '20000', 'cours Napoléon'],
];

// ---------------------------------------------------------------- PRNG déterministe
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- Événements de test
// Dates en UTC (Z), dérivées de la semaine configurée (app.eventDates.weekStart..weekEnd
// dans app.config.json) : le jeu de test reste cohérent avec les dates de la carte seedée.
const WEEK_START_MS = Date.parse(`${appConfig.app.eventDates.weekStart}T00:00:00Z`);
const WEEK_END_MS = Date.parse(`${appConfig.app.eventDates.weekEnd}T00:00:00Z`);
if (!Number.isFinite(WEEK_START_MS) || !Number.isFinite(WEEK_END_MS)) {
  throw new Error('app.eventDates.weekStart/weekEnd doit être au format AAAA-MM-JJ (voir app.config.json)');
}
if (WEEK_END_MS < WEEK_START_MS) {
  throw new Error('app.eventDates.weekEnd doit suivre weekStart (voir app.config.json)');
}
const WEEK_DAYS = Math.round((WEEK_END_MS - WEEK_START_MS) / 86400000) + 1;
// Datetime UTC à dayOff (+n ou -n) jours de weekStart ; time au format HH:MM:SS.
const D = (dayOff, time) => `${new Date(WEEK_START_MS + dayOff * 86400000).toISOString().slice(0, 10)}T${time}Z`;
// Libellé de jour pour les titres des cas de test (« 26 octobre »).
const dayFR = (dayOff) => new Date(WEEK_START_MS + dayOff * 86400000)
  .toLocaleDateString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long' });
const hand = () => [
  { k: 'E01', t: 'Atelier cuisine de légumineuses (cas nominal, tous champs)', mod: MODERATION_OK, hl: true, fmt: ['Atelier de cuisine'], pub: ['Tout public', 'Familles / enfants'], th: ['Cuisine végétale', 'Santé & nutrition'], part: ['Association Légumineuses & Co', 'Ville de Nantes'], city: 'Nantes', num: 3, start: D(1, '16:00:00'), end: D(1, '18:30:00'), modality: 'Présentiel', img: [120, 200, 120], reg: true, cap: 25, tarif: 'Gratuit', access: ['Accessible PMR', 'Parking à proximité'], venue: 'Maison de quartier' },
  { k: 'E02', t: 'Webinaire : manger végétal au quotidien (en ligne)', mod: MODERATION_OK, fmt: ['Conférence/webinaire/table-ronde'], pub: ['Tout public'], th: ['Santé & nutrition'], modality: 'Distanciel', visio: 'https://visio.example.org/lgsv-webinaire', start: D(2, '17:00:00'), end: D(2, '18:00:00'), tarif: 'Gratuit' },
  { k: 'E03', t: 'Dégustation hybride (présentiel + visio)', mod: MODERATION_OK, fmt: ['Dégustation ou menu végétal'], pub: ['Professionnels'], th: ['Cuisine végétale'], modality: 'Hybride', city: 'Lyon', num: 12, visio: 'https://visio.example.org/hybride', start: D(3, '10:00:00'), end: D(3, '12:00:00') },
  { k: 'E04', t: `Festival multi-jours (${dayFR(1)} au ${dayFR(5)})`, mod: MODERATION_OK, hl: true, fmt: ['Festival'], pub: ['Tout public'], th: ['Biodiversité', 'Agriculture'], part: ['Ferme du Vert Bocage'], modality: 'Présentiel', city: 'Rennes', num: 7, start: D(1, '08:00:00'), end: D(5, '20:00:00'), img: [230, 130, 170] },
  { k: 'E05', t: `Atelier hors semaine (avant, ${dayFR(-14)})`, mod: MODERATION_OK, fmt: ['Atelier de cuisine'], pub: ['Scolaires'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Toulouse', num: 5, start: D(-14, '09:00:00'), end: D(-14, '11:00:00') },
  { k: 'E06', t: `Conférence après la semaine (${dayFR(14)})`, mod: MODERATION_OK, fmt: ['Conférence/webinaire/table-ronde'], pub: ['Professionnels'], th: ['Climat & environnement'], modality: 'Présentiel', city: 'Lille', num: 2, start: D(14, '18:00:00'), end: D(14, '20:00:00') },
  { k: 'E07', t: 'Atelier créole végétal (La Réunion)', mod: MODERATION_OK, hl: true, fmt: ['Atelier de cuisine'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Saint-Denis', num: 4, start: D(2, '04:00:00'), end: D(2, '07:00:00') },
  { k: 'E08', t: 'Visite de potager (Martinique)', mod: MODERATION_OK, fmt: ['Visite de jardin / potager ou cueillette'], pub: ['Familles / enfants'], th: ['Agriculture'], modality: 'Présentiel', city: 'Fort-de-France', num: 9, start: D(4, '13:00:00'), end: D(4, '15:00:00') },
  { k: 'E09', t: 'Dégustation (Guyane)', mod: MODERATION_OK, fmt: ['Dégustation ou menu végétal'], pub: ['Tout public'], th: ['Biodiversité'], modality: 'Présentiel', city: 'Cayenne', num: 1, start: D(5, '14:00:00'), end: D(5, '16:00:00') },
  { k: 'E10', t: 'Atelier (Guadeloupe)', mod: MODERATION_OK, fmt: ['Atelier pédagogique ou formation'], pub: ['Scolaires'], th: ['Santé & nutrition'], modality: 'Présentiel', city: 'Pointe-à-Pitre', num: 6, start: D(1, '13:00:00'), end: D(1, '15:00:00') },
  { k: 'E11', t: 'Rencontre (Mayotte)', mod: MODERATION_OK, fmt: ['Autres'], pub: ['Tout public'], th: ['Agriculture'], modality: 'Présentiel', city: 'Mamoudzou', num: 2, start: D(6, '06:00:00'), end: D(6, '09:00:00') },
  { k: 'E12', t: 'Cueillette (Corse)', mod: MODERATION_OK, fmt: ['Visite de jardin / potager ou cueillette'], pub: ['Familles / enfants'], th: ['Biodiversité'], modality: 'Présentiel', city: 'Ajaccio', num: 8, start: D(3, '08:00:00'), end: D(3, '11:00:00') },
  { k: 'E13', t: 'Adresse invalide (géocodage doit échouer)', mod: MODERATION_OK, fmt: ['Atelier de cuisine'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', rawAddr: ['zzzz qqqq 999 impasse introuvable', '00000', 'Nullepart-sur-Mer'], start: D(2, '10:00:00') },
  { k: 'E14', t: 'Adresse vide, seulement ville + code postal', mod: MODERATION_OK, fmt: ['Dégustation ou menu végétal'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', rawAddr: ['', '34000', 'Montpellier'], start: D(3, '10:00:00') },
  { k: 'E15', t: 'Sans format (champ lié vide)', mod: MODERATION_OK, fmt: [], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Bordeaux', num: 4, start: D(4, '10:00:00') },
  { k: 'E16', t: 'Sans date de début', mod: MODERATION_OK, fmt: ['Festival'], pub: ['Tout public'], th: ['Biodiversité'], modality: 'Présentiel', city: 'Strasbourg', num: 3, start: null, end: null },
  { k: 'E17', t: '', mod: MODERATION_OK, fmt: ['Autres'], pub: ['Tout public'], th: [], modality: 'Présentiel', city: 'Dijon', num: 3, start: D(4, '09:00:00') },
  { k: 'E18', t: 'Atelier payant (15 EUR)', mod: MODERATION_OK, fmt: ['Atelier de cuisine'], pub: ['Professionnels'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Grenoble', num: 5, tarif: 'Payant', montant: 15, start: D(5, '09:00:00') },
  { k: 'E19', t: 'Gratuit implicite (tarif et montant vides)', mod: MODERATION_OK, fmt: ['Atelier de cuisine'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Tours', num: 6, start: D(5, '09:00:00') },
  { k: 'E20', t: 'Sans image ni description', mod: MODERATION_OK, fmt: ['Autres'], pub: ['Tout public'], th: [], modality: 'Présentiel', city: 'Limoges', num: 2, desc: '', start: D(6, '09:00:00') },
  { k: 'E21', t: 'Titre très long avec caractères spéciaux <b>gras</b> & "guillemets" — ' + 'très long '.repeat(18), mod: MODERATION_OK, fmt: ['Conférence/webinaire/table-ronde'], pub: ['Tout public'], th: ['Santé & nutrition'], modality: 'Présentiel', city: 'Amiens', num: 4, desc: '<script>alert("xss")</script> Description longue. ' + 'Lorem ipsum dolor sit amet. '.repeat(60), start: D(2, '09:00:00') },
  { k: 'E22', t: 'Multi thèmes, publics et partenaires', mod: MODERATION_OK, fmt: ['Festival'], pub: ['Tout public', 'Familles / enfants', 'Scolaires', 'Professionnels'], th: ['Cuisine végétale', 'Santé & nutrition', 'Biodiversité', 'Agriculture', 'Climat & environnement'], part: ['Association Légumineuses & Co', 'Ferme du Vert Bocage', 'Fédération des Cuisiniers Végétaux', '[TEST] Partenaire sans logo'], modality: 'Présentiel', city: 'Metz', num: 2, start: D(4, '09:00:00'), img: [100, 150, 220] },
  { k: 'E23', t: 'Contact : e-mail animateur uniquement (repli)', mod: MODERATION_OK, fmt: ['Atelier pédagogique ou formation'], pub: ['Scolaires'], th: ['Santé & nutrition'], modality: 'Présentiel', city: 'Orléans', num: 9, noContactEmail: true, start: D(3, '14:00:00') },
  { k: 'E24', t: 'Avec lien d\'inscription', mod: MODERATION_OK, fmt: ['Atelier de cuisine'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Poitiers', num: 3, reg: true, start: D(2, '14:00:00') },
  { k: 'E25', t: 'Capacité 0 et accès multi-modalités', mod: MODERATION_OK, fmt: ['Atelier de cuisine'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Perpignan', num: 4, cap: 0, access: ACCESS, start: D(2, '09:00:00') },
  { k: 'E26', t: 'Date de fin AVANT la date de début', mod: MODERATION_OK, fmt: ['Atelier de cuisine'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Brest', num: 4, start: D(4, '18:00:00'), end: D(3, '09:00:00') },
  { k: 'E27', t: `Fuseau horaire : 23h30 UTC, affiché à Paris après minuit le ${dayFR(1)}`, mod: MODERATION_OK, fmt: ['Dégustation ou menu végétal'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Paris', num: 20, start: D(0, '23:30:00'), end: D(1, '02:00:00') },
  { k: 'E28', t: 'Format de test (picto invalide)', mod: MODERATION_OK, fmt: ['[TEST] Format picto invalide'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Marseille', num: 14, start: D(3, '09:00:00') },
  { k: 'E29', t: 'Format de test (sans picto ni couleur)', mod: MODERATION_OK, fmt: ['[TEST] Format sans picto ni couleur'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Nice', num: 11, start: D(3, '09:00:00') },
  { k: 'E30', t: 'Doublon de titre', mod: MODERATION_OK, fmt: ['Festival'], pub: ['Tout public'], th: ['Biodiversité'], modality: 'Présentiel', city: 'Rouen', num: 3, start: D(3, '09:00:00') },
  { k: 'E31', t: 'Doublon de titre', mod: MODERATION_OK, fmt: ['Festival'], pub: ['Tout public'], th: ['Biodiversité'], modality: 'Présentiel', city: 'Clermont-Ferrand', num: 3, start: D(3, '09:00:00') },
  { k: 'R01', t: '[REFUSÉ] Événement refusé par la modération', mod: 'Refusé', fmt: ['Festival'], pub: ['Tout public'], th: ['Biodiversité'], modality: 'Présentiel', city: 'Paris', num: 1, start: D(3, '09:00:00') },
  { k: 'R02', t: '[REFUSÉ] Autre événement refusé', mod: 'Refusé', fmt: ['Autres'], pub: ['Tout public'], th: [], modality: 'Distanciel', start: D(4, '09:00:00') },
  { k: 'P01', t: '[EN ATTENTE] À modérer 1', mod: 'En attente', fmt: ['Atelier de cuisine'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Lyon', num: 40, start: D(3, '09:00:00') },
  { k: 'P02', t: '[EN ATTENTE] À modérer 2', mod: 'En attente', fmt: ['Festival'], pub: ['Tout public'], th: ['Biodiversité'], modality: 'Présentiel', city: 'Nantes', num: 40, start: D(3, '09:00:00') },
  { k: 'P03', t: '[MODÉRATION VIDE] Soumis par le formulaire, non traité', mod: null, fmt: ['Atelier de cuisine'], pub: ['Tout public'], th: ['Cuisine végétale'], modality: 'Présentiel', city: 'Toulouse', num: 40, start: D(3, '09:00:00') },
];

function bulk(n) {
  const rand = rng(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const some = (arr, max) => {
    const c = 1 + Math.floor(rand() * max);
    return [...arr].sort(() => rand() - 0.5).slice(0, c);
  };
  const subjects = ['pois chiches', 'lentilles', 'haricots rouges', 'tofu maison', 'seitan', 'soja', 'légumes d\'automne', 'cuisine bio', 'zéro déchet', 'potager', 'pâtisserie sans œuf'];
  const kinds = ['Atelier', 'Dégustation', 'Rencontre', 'Conférence', 'Visite', 'Stand', 'Projection'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const [city] = pick(CITIES);
    const r = rand();
    const mod = r < 0.8 ? MODERATION_OK : r < 0.92 ? 'En attente' : 'Refusé';
    const online = rand() < 0.12;
    // 75 % pendant la semaine configurée, sinon réparti avant (majorité) ou après.
    const dayOff = rand() < 0.75
      ? Math.floor(rand() * WEEK_DAYS)
      : (rand() < 0.6 ? -(15 + Math.floor(rand() * 120)) : WEEK_DAYS + Math.floor(rand() * 35));
    const hour = 7 + Math.floor(rand() * 13);
    const start = D(dayOff, `${String(hour).padStart(2, '0')}:00:00`);
    out.push({
      k: `B${i}`,
      t: `${pick(kinds)} ${pick(subjects)} #${i + 1}`,
      mod,
      fmt: [pick(FORMATS.slice(0, 7))[0]],
      pub: some(PUBLICS.map((p) => p[0]), 2),
      th: some(THEMES.map((p) => p[0]), 2),
      modality: online ? 'Distanciel' : 'Présentiel',
      visio: online ? 'https://visio.example.org/bulk' : undefined,
      city: online ? undefined : city,
      num: 1 + Math.floor(rand() * 6),
      start,
      end: D(dayOff, `${String(hour + 2).padStart(2, '0')}:00:00`),
      tarif: rand() < 0.8 ? 'Gratuit' : 'Payant',
      montant: undefined,
      hl: i % 25 === 0, // sans consommer le générateur : les données générées restent identiques
    });
  }
  return out;
}

// ---------------------------------------------------------------- Main
async function main() {
  await waitReady();
  await authenticate();
  const { workspace, db } = await ensureWorkspaceAndDb();

  // --- Tables (référentiels d'abord)
  const T = {};
  T.formats = await ensureTable(db, 'Formats', REF.name);
  T.publics = await ensureTable(db, 'Publics', REF.name);
  T.themes = await ensureTable(db, 'Thématiques', REF.name);
  T.partners = await ensureTable(db, 'Partenaires', REF.name);
  T.events = await ensureTable(db, 'Événements', FM.title);

  const pictosOf = (list) => [...new Set(list.map((r) => r[1]).filter(Boolean))];
  const refFields = {};
  for (const [key, list] of [['formats', FORMATS], ['publics', PUBLICS], ['themes', THEMES]]) {
    const picto = await ensureField(T[key], { name: REF.picto, type: 'multiple_select', select_options: opts(pictosOf(list), 'light-green') });
    const couleur = await ensureField(T[key], {
      name: REF.color,
      type: 'single_select',
      select_options: COLOR_OPTIONS.map(([value, color]) => ({ value, color })),
    });
    refFields[key] = { picto, couleur };
  }
  await ensureField(T.partners, { name: REF.logo, type: 'file' });

  // --- Champs des événements (noms = fieldMapping, sauf champs "formulaire" additionnels)
  const E = T.events;
  const linkField = (name, tableId) => ensureField(E, { name, type: 'link_row', link_row_table_id: tableId, has_related_field: false });
  const f = {};
  f.description = await ensureField(E, { name: FM.description, type: 'long_text' });
  f.start = await ensureField(E, { name: FM.startDate, type: 'date', date_format: 'ISO', date_include_time: true, date_time_format: '24' });
  f.end = await ensureField(E, { name: FM.endDate, type: 'date', date_format: 'ISO', date_include_time: true, date_time_format: '24' });
  f.format = await linkField(FM.format, T.formats.table.id);
  f.modality = await ensureField(E, { name: FM.modality, type: 'single_select', select_options: opts(MODALITY_OPTIONS) });
  f.audience = await linkField(FM.audience, T.publics.table.id);
  f.theme = await linkField(FM.theme, T.themes.table.id);
  f.partners = await linkField(FM.partnerField, T.partners.table.id);
  f.image = await ensureField(E, { name: FM.image, type: 'file' });
  f.address = await ensureField(E, { name: FM.address, type: 'text' });
  f.postalCode = await ensureField(E, { name: FM.postalCode, type: 'text' });
  f.city = await ensureField(E, { name: FM.city, type: 'text' });
  f.organizer = await ensureField(E, { name: FM.organizer, type: 'text' });
  f.firstName = await ensureField(E, { name: FM.organizerFirstName, type: 'text' });
  f.lastName = await ensureField(E, { name: FM.organizerLastName, type: 'text' });
  f.registrationUrl = await ensureField(E, { name: FM.registrationUrl, type: 'text' });
  f.venue = await ensureField(E, { name: FM.venueName, type: 'text' });
  f.access = await ensureField(E, { name: FM.accessModalities, type: 'multiple_select', select_options: opts(ACCESS, 'light-gray') });
  f.visio = await ensureField(E, { name: FM.videoConferenceUrl, type: 'text' });
  f.contactEmail = await ensureField(E, { name: FM.contactEmail, type: 'text' });
  f.contactEmailFallback = await ensureField(E, { name: FM.contactEmailFallback, type: 'text' });
  f.phone = await ensureField(E, { name: FM.contactPhone, type: 'text' });
  f.website = await ensureField(E, { name: FM.organizerWebsite, type: 'text' });
  f.capacity = await ensureField(E, { name: FM.capacity, type: 'number', number_decimal_places: 0 });
  f.tarif = await ensureField(E, { name: FM.tariff, type: 'single_select', select_options: opts([TARIFF_FREE, 'Payant']) });
  f.price = await ensureField(E, { name: FM.price, type: 'number', number_decimal_places: 2 });
  f.moderation = await ensureField(E, { name: FM.moderation, type: 'single_select', select_options: opts([MODERATION_OK, 'Refusé', 'En attente'], 'light-red') });
  // Rôle OPTIONNEL « coup de cœur » : colonne créée seulement si la config le déclare.
  if (FM.highlight) f.highlight = await ensureField(E, { name: FM.highlight, type: 'boolean' });
  // Champs "formulaire" présents dans BaserowRecord mais non utilisés par le mapping (doivent être ignorés)
  await ensureField(E, { name: 'Respect de la charte', type: 'boolean' });
  await ensureField(E, { name: 'Avez-vous quelque chose à ajouter ?', type: 'long_text' });
  await ensureField(E, { name: "Téléphone de l'animateur", type: 'text' });

  const optId = (field, value) => {
    const o = field.select_options.find((x) => x.value === value);
    if (!o) throw new Error(`Option "${value}" absente du champ "${field.name}"`);
    return o.id;
  };

  // --- Vider (événements d'abord : ils référencent les autres tables)
  async function clear(ctx) {
    for (;;) {
      const page = await api('GET', `/api/database/rows/table/${ctx.table.id}/?size=200`);
      if (!page.results.length) break;
      await api('POST', `/api/database/rows/table/${ctx.table.id}/batch-delete/`, { items: page.results.map((r) => r.id) });
    }
  }
  for (const ctx of [T.events, T.partners, T.themes, T.publics, T.formats]) await clear(ctx);

  async function insert(ctx, items) {
    const ids = [];
    for (let i = 0; i < items.length; i += 100) {
      const res = await api('POST', `/api/database/rows/table/${ctx.table.id}/batch/?user_field_names=true`, { items: items.slice(i, i + 100) });
      ids.push(...res.items.map((r) => r.id));
    }
    return ids;
  }

  // --- Référentiels
  const idByName = {};
  for (const [key, list] of [['formats', FORMATS], ['publics', PUBLICS], ['themes', THEMES]]) {
    const items = list.map(([name, picto, color]) => ({
      [REF.name]: name,
      [REF.picto]: picto ? [optId(refFields[key].picto, picto)] : [],
      [REF.color]: color ? optId(refFields[key].couleur, color) : null,
    }));
    const ids = await insert(T[key], items);
    list.forEach(([name], i) => (idByName[`${key}:${name}`] = ids[i]));
  }
  const partnerItems = [];
  for (const [name, rgb] of PARTNERS) {
    partnerItems.push({ [REF.name]: name, [REF.logo]: rgb ? [await uploadImage(`logo-${partnerItems.length}.png`, 200, 200, rgb)] : [] });
  }
  const pIds = await insert(T.partners, partnerItems);
  PARTNERS.forEach(([name], i) => (idByName[`partners:${name}`] = pIds[i]));

  // --- Événements
  // `--bulk` explicite sinon complète les cas manuels jusqu'à `--total` (jamais négatif).
  const BULK = BULK_OVERRIDE ?? Math.max(0, TOTAL - hand().length);
  const events = [...hand(), ...bulk(BULK)];
  const imageCache = new Map();
  const getImage = async (rgb) => {
    const key = rgb.join(',');
    if (!imageCache.has(key)) imageCache.set(key, await uploadImage(`visuel-${key}.png`, 600, 400, rgb));
    return imageCache.get(key);
  };
  const rows = [];
  for (const [idx, e] of events.entries()) {
    let address = '';
    let postal = '';
    let city = '';
    if (e.rawAddr) [address, postal, city] = e.rawAddr;
    else if (e.city) {
      const c = CITIES.find((x) => x[0] === e.city);
      address = `${e.num} ${c[2]}`;
      postal = c[1];
      city = c[0];
    }
    const row = {
      [FM.title]: e.t,
      [FM.description]: e.desc ?? (e.t ? `Description de test pour « ${e.t.slice(0, 60)} ». Rejoignez-nous pour découvrir l'alimentation végétale.` : ''),
      [FM.startDate]: e.start ?? null,
      [FM.endDate]: e.end ?? null,
      [FM.format]: e.fmt.map((n) => idByName[`formats:${n}`]),
      [FM.modality]: optId(f.modality, MODALITY_LABEL[e.modality]),
      [FM.audience]: e.pub.map((n) => idByName[`publics:${n}`]),
      [FM.theme]: e.th.map((n) => idByName[`themes:${n}`]),
      [FM.partnerField]: (e.part || []).map((n) => idByName[`partners:${n}`]),
      [FM.image]: e.img ? [await getImage(e.img)] : [],
      [FM.address]: address,
      [FM.postalCode]: postal,
      [FM.city]: city,
      [FM.organizer]: `Structure de test ${idx + 1}`,
      [FM.organizerFirstName]: 'Camille',
      [FM.organizerLastName]: 'Durand',
      [FM.registrationUrl]: e.reg ? 'https://example.org/inscription' : '',
      [FM.venueName]: e.venue || '',
      [FM.accessModalities]: (e.access || []).map((v) => optId(f.access, v)),
      [FM.videoConferenceUrl]: e.visio || '',
      [FM.contactEmail]: e.noContactEmail ? '' : `contact${idx + 1}@example.org`,
      [FM.contactEmailFallback]: `animateur${idx + 1}@example.org`,
      [FM.contactPhone]: '01 02 03 04 05',
      [FM.organizerWebsite]: 'https://example.org',
      [FM.capacity]: e.cap ?? null,
      [FM.tariff]: e.tarif ? optId(f.tarif, TARIFF_LABEL(e.tarif)) : null,
      [FM.price]: e.montant != null ? String(e.montant) : null,
      [FM.moderation]: e.mod ? optId(f.moderation, e.mod) : null,
    };
    if (FM.highlight) row[FM.highlight] = Boolean(e.hl);
    rows.push(row);
  }
  await insert(T.events, rows);
  log(`${rows.length} événements insérés (${hand().length} cas manuels + ${BULK} générés)`);

  // --- Jeton base de données
  let tokens = await api('GET', '/api/database/tokens/');
  let token = tokens.find((t) => t.name === 'lgsv-backend-local');
  if (!token) token = await api('POST', '/api/database/tokens/', { name: 'lgsv-backend-local', workspace: workspace.id });

  // --- Sorties
  const env = [
    '# Généré par scripts/seed-baserow/seed.mjs (Baserow LOCAL uniquement)',
    `BASEROW_API_URL=${BASE}`,
    `BASEROW_API_TOKEN=${token.key}`,
    `BASEROW_EVENT_TABLE_ID=${T.events.table.id}`,
    `BASEROW_MODERATION_FIELD_ID=${f.moderation.id}`,
    `BASEROW_PARTNERS_TABLE_ID=${T.partners.table.id}`,
    `BASEROW_THEMATIQUES_TABLE_ID=${T.themes.table.id}`,
    `BASEROW_FORMATS_TABLE_ID=${T.formats.table.id}`,
    `BASEROW_PUBLICS_TABLE_ID=${T.publics.table.id}`,
    'PORT=3000',
    '# Local uniquement : autorise ?devMode=true (voir apps/backend/.env.example)',
    'ALLOW_DEV_MODE=true',
    '',
  ].join('\n');
  const outDir = resolve(ROOT, 'scripts/seed-baserow/out');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'backend.env'), env);
  if (!args['no-env']) {
    const target = resolve(ROOT, 'apps/backend/.env');
    writeFileSync(target, env);
    log(`Écrit ${target}`);
  }
  const schema = {};
  for (const [name, ctx] of Object.entries(T)) {
    const fields = await api('GET', `/api/database/fields/table/${ctx.table.id}/`);
    schema[name] = { tableId: ctx.table.id, name: ctx.table.name, fields: fields.map((x) => ({ id: x.id, name: x.name, type: x.type, primary: x.primary })) };
  }
  writeFileSync(resolve(outDir, 'schema.json'), JSON.stringify(schema, null, 2));
  log('Terminé. Schéma : scripts/seed-baserow/out/schema.json');
  log(`Admin : ${ADMIN.email} / ${ADMIN.password}  -  UI : ${BASE}`);
}

main().catch((err) => {
  console.error('[seed] ERREUR', err.message);
  process.exit(1);
});
