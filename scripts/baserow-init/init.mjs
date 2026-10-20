#!/usr/bin/env node
/**
 * Initialisation du Baserow de PRODUCTION d'une carte — schéma seul, premier déploiement.
 *
 * Exécuté par le script de déploiement (scripts/deploy-v2.sh) sur le Baserow VIDE de
 * l'instance de la carte :
 *  1. crée le compte admin (BASEROW_ADMIN_EMAIL / BASEROW_ADMIN_PASSWORD, générés par le
 *     script de déploiement, jamais versionnés) puis FERME les inscriptions publiques ;
 *  2. crée le workspace, la base et les 5 tables de la carte (schéma partagé avec le seed
 *     local : scripts/seed-baserow/schema.mjs) : création SEULE — aucune ligne, aucune
 *     donnée de test, aucune modification ni suppression d'une colonne existante (une
 *     colonne existante au mauvais type est une erreur, voir schema.mjs) ;
 *  3. crée un jeton de base de données en LECTURE SEULE pour le backend de la carte ;
 *  4. écrit backend.env (URL d'appel, jeton, IDs de tables et du champ de modération).
 *
 * L'URL d'appel (--url, ex. http://baserow en interne au réseau Docker) est celle écrite
 * dans backend.env : Baserow construit de toute façon les URLs des visuels et logos
 * depuis BASEROW_PUBLIC_URL (constaté sur Baserow 2.4.1), le backend n'a pas besoin
 * de l'URL publique.
 *
 * Les référentiels (formats, publics, thématiques, partenaires : libellés, pictos, couleurs,
 * logos) et les événements sont saisis DANS Baserow par l'équipe, ainsi que les autres
 * options de listes (états de modération, tarif payant, pastilles de couleur, pictos) ;
 * seules les options issues de la config sont créées (valeur de modération visible,
 * modalités, tarif gratuit).
 *
 * Idempotent : relancé, il ne crée rien (compte, jeton, tables et colonnes retrouvés).
 * Exception assumée à la règle « Baserow en lecture seule » : cette règle concerne le
 * BACKEND de l'application ; cet outil ne cible que l'instance de SA carte, et n'y crée
 * jamais de ligne (jamais le pointer vers un Baserow contenant des données existantes :
 * voir le garde-fou du script de déploiement).
 *
 * Usage (voir deploy/README.md) :
 *   node scripts/baserow-init/init.mjs --url=<URL d'appel> \
 *     --config=app.config-<CARTE>.json --out=<chemin>/backend.env
 *
 * --url        : URL Baserow joignable depuis ce script ET depuis le backend de la carte
 *                (en déploiement : http://baserow, interne au réseau Docker) ;
 * --config     : config de la carte (app.config-<CARTE>.json) ;
 * --out        : chemin du backend.env à écrire (requis).
 * Compte admin : BASEROW_ADMIN_EMAIL et BASEROW_ADMIN_PASSWORD (environnement).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeApi, waitReady, authenticate, ensureSchema } from '../seed-baserow/schema.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const log = (...a) => console.log('[init]', ...a);

const BASE = String(args.url || process.env.BASEROW_INIT_URL || '').replace(/\/$/, '');
// URL de l'interface Baserow pour le message final (BASEROW_PUBLIC_URL côté déploiement).
const PUBLIC_URL_LABEL = String(process.env.BASEROW_PUBLIC_URL || BASE).replace(/\/$/, '');
const CONFIG_PATH = resolve(ROOT, String(args.config || 'app.config.json'));
const OUT_PATH = args.out ? resolve(String(args.out)) : null;

if (!BASE) {
  console.error('--url requis (URL Baserow joignable depuis ce script, ex. http://baserow).');
  process.exit(1);
}
if (!OUT_PATH) {
  console.error('--out requis (chemin du backend.env à écrire).');
  process.exit(1);
}
const ADMIN = {
  name: 'Admin',
  email: process.env.BASEROW_ADMIN_EMAIL,
  password: process.env.BASEROW_ADMIN_PASSWORD,
};
if (!ADMIN.email || !ADMIN.password) {
  console.error('BASEROW_ADMIN_EMAIL et BASEROW_ADMIN_PASSWORD requis (environnement).');
  process.exit(1);
}

const appConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
log(`Config : ${CONFIG_PATH} (carte « ${appConfig.app.name} »)`);

/** Ferme les inscriptions publiques de l'instance (l'équipe est invitée par l'admin). */
async function closePublicSignups(api) {
  const res = await api('PATCH', '/api/settings/update/', { allow_new_signups: false }, { raw: true });
  if (res.status !== 200) {
    throw new Error(
      `Impossible de fermer les inscriptions publiques (PATCH /api/settings/update/ -> ${res.status} : ${JSON.stringify(res.json).slice(0, 200)}).`,
    );
  }
}

/**
 * Jeton de base de données en LECTURE SEULE, retrouvé par son nom (idempotent).
 * Un jeton retrouvé avec des permissions élargies est recentré sur la lecture (jamais
 * l'inverse). La création ignore le champ permissions (constaté sur Baserow 2.4.1) :
 * les permissions se posent par PATCH après création.
 */
async function ensureReadOnlyToken(api, workspaceId, name) {
  const READ_ONLY = { create: false, read: true, update: false, delete: false };
  const tokens = await api('GET', '/api/database/tokens/');
  const existing = tokens.find((t) => t.name === name && t.workspace === workspaceId);
  if (existing) {
    const p = existing.permissions || {};
    const isReadOnly = p.read === true && [p.create, p.update, p.delete].every((v) => v !== true);
    if (!isReadOnly) {
      await api('PATCH', `/api/database/tokens/${existing.id}/`, { permissions: READ_ONLY });
      log(`Jeton « ${name} » retrouvé, permissions recentrées sur la lecture seule`);
    } else {
      log(`Jeton « ${name} » retrouvé (lecture seule)`);
    }
    return existing;
  }
  const created = await api('POST', '/api/database/tokens/', { name, workspace: workspaceId });
  await api('PATCH', `/api/database/tokens/${created.id}/`, { permissions: READ_ONLY });
  log(`Jeton « ${name} » créé (lecture seule)`);
  return created;
}

async function main() {
  await waitReady(BASE, () => log(`Baserow pas prêt (${BASE}), attente...`));
  const { api, setJwt } = makeApi(BASE);
  const auth = await authenticate(api, ADMIN);
  setJwt(auth.token);
  log(auth.created ? 'Compte admin créé' : 'Compte admin déjà présent (connexion)');

  await closePublicSignups(api);
  log('Inscriptions publiques fermées');

  // Schéma seul, en création seule : les tables restent vides (voir l'en-tête du fichier).
  const { workspace, T, f } = await ensureSchema(api, appConfig, {
    workspaceName: appConfig.app.name,
    databaseName: appConfig.app.name,
    strict: true,
    optionSets: null,
  });

  const token = await ensureReadOnlyToken(api, workspace.id, `${appConfig.app.shortName}-backend`);

  const env = [
    '# Généré par scripts/baserow-init/init.mjs (premier déploiement de la carte, ne pas versionner)',
    `# Carte : ${appConfig.app.name}`,
    '# URL d\'appel interne au réseau Docker ; les URLs des visuels et logos sont',
    '# construites par Baserow depuis BASEROW_PUBLIC_URL (déjà publiques).',
    `BASEROW_API_URL=${BASE}`,
    `BASEROW_API_TOKEN=${token.key}`,
    `BASEROW_EVENT_TABLE_ID=${T.events.table.id}`,
    `BASEROW_MODERATION_FIELD_ID=${f.moderation.id}`,
    `BASEROW_PARTNERS_TABLE_ID=${T.partners.table.id}`,
    `BASEROW_THEMATIQUES_TABLE_ID=${T.themes.table.id}`,
    `BASEROW_FORMATS_TABLE_ID=${T.formats.table.id}`,
    `BASEROW_PUBLICS_TABLE_ID=${T.publics.table.id}`,
    '',
  ].join('\n');
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, env);
  log(`Écrit ${OUT_PATH}`);
  log(`Terminé. Interface Baserow : ${PUBLIC_URL_LABEL} (admin : ${ADMIN.email})`);
  log("Renseigner ensuite les référentiels et les événements dans Baserow (aucune ligne n'est créée).");
}

main().catch((err) => {
  console.error('[init] ERREUR', err.message);
  process.exit(1);
});
