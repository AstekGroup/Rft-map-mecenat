#!/usr/bin/env node
/**
 * Tests de robustesse au schéma (Baserow LOCAL uniquement) : renomme / supprime un champ,
 * interroge le backend (redémarré par l'appelant), puis restaure.
 *
 * Usage : node scripts/seed-baserow/robustness.mjs <scenario> [--url=http://localhost:8088]
 * Scénarios : rename-city | rename-format | rename-moderation | delete-moderation | delete-title | restore
 * `restore` remet les noms de app.config.json (le seed complet reste la restauration de référence).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = (process.argv.find((a) => a.startsWith('--url='))?.slice(6) || 'http://localhost:8088').replace(/\/$/, '');
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error('Refus : instance non locale');
const scenario = process.argv[2];
const FM = JSON.parse(readFileSync(resolve(ROOT, 'app.config.json'), 'utf8')).baserow.fieldMapping;
const schema = JSON.parse(readFileSync(resolve(ROOT, 'scripts/seed-baserow/out/schema.json'), 'utf8'));

async function call(method, path, body, jwt) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `JWT ${jwt}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}
const login = await call('POST', '/api/user/token-auth/', { email: 'admin@lgsv.local', password: 'Lgsv-Local-2026!' });
const jwt = login.access_token ?? login.token;
const fields = async () => call('GET', `/api/database/fields/table/${schema.events.tableId}/`, null, jwt);
const byName = async (n) => (await fields()).find((f) => f.name === n);
const rename = async (from, to) => {
  const f = await byName(from);
  if (!f) throw new Error(`Champ "${from}" introuvable`);
  await call('PATCH', `/api/database/fields/${f.id}/`, { name: to }, jwt);
  console.log(`renommé "${from}" -> "${to}"`);
};

switch (scenario) {
  case 'rename-city': await rename(FM.city, 'Ville'); break;
  case 'rename-format': await rename(FM.format, 'Formats'); break;
  case 'rename-moderation': await rename(FM.moderation, 'Modération (renommé)'); break;
  case 'delete-moderation': {
    const f = await byName(FM.moderation);
    await call('DELETE', `/api/database/fields/${f.id}/`, null, jwt);
    console.log(`supprimé "${FM.moderation}" (id ${f.id}) : relancer le seed pour restaurer`);
    break;
  }
  case 'delete-title': console.log('Le champ primaire ne peut pas être supprimé dans Baserow : scénario sans objet'); break;
  case 'restore':
    for (const [from, to] of [['Ville', FM.city], ['Formats', FM.format], ['Modération (renommé)', FM.moderation]]) {
      if (await byName(from)) await rename(from, to);
    }
    break;
  default: throw new Error('Scénario inconnu');
}
