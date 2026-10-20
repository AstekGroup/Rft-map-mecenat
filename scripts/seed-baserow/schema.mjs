/**
 * Schéma Baserow partagé entre le seed local (dev) et l'initialisation de production.
 *
 * `ensureSchema` crée (idempotent) le workspace, la base et les 5 tables d'une carte :
 * Formats, Publics, Thématiques, Partenaires, Événements. Les noms de colonnes et les
 * options de listes issues de la config viennent de `app.config-<CARTE>.json`
 * (`baserow.fieldMapping`, `baserow.mapping`, `baserow.moderationVisibleValue`).
 *
 * Deux modes :
 *  - seed local (`strict = false`, utilisé par seed.mjs sur l'instance Docker jetable) :
 *    aligne le schéma — renomme la colonne primaire, recrée une colonne au mauvais type,
 *    aligne les pastilles des options de listes ;
 *  - initialisation de production (`strict = true`, utilisée par scripts/baserow-init/init.mjs) :
 *    **création seule**. Une colonne existante au mauvais type (ou une colonne primaire mal
 *    nommée) est une ERREUR, rien n'est modifié ni supprimé, et les options de listes d'une
 *    colonne existante ne sont jamais retouchées.
 *
 * `optionSets` porte les données de test du seed (options de listes, colonnes additionnelles) ;
 * `null` en production : seules les options issues de la config sont créées (valeur de
 * modération visible, modalités, tarif gratuit). Les autres options de modération, de tarif,
 * de picto et de couleur sont ajoutées par l'équipe dans l'interface Baserow.
 */

const log = (...a) => console.log('[baserow]', ...a);

// ---------------------------------------------------------------- HTTP
/** Client API Baserow authentifié par JWT (setter via `setJwt`). */
export function makeApi(BASE) {
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
  return { api, setJwt: (t) => (jwt = t) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Attend que l'instance Baserow réponde (premier démarrage : 2 à 3 minutes). */
export async function waitReady(BASE, onWait = () => undefined) {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/api/_health/`);
      if (r.ok) return;
    } catch {
      /* pas prêt */
    }
    if (i % 5 === 0) onWait();
    await sleep(5000);
  }
  throw new Error(`Baserow injoignable sur ${BASE}`);
}

/** Crée le compte admin (première exécution) ou se connecte : renvoie { token, created }. */
export async function authenticate(api, admin) {
  const signup = await api(
    'POST',
    '/api/user/',
    { ...admin, language: 'fr', authenticate: true },
    { token: null, raw: true },
  );
  if (signup.status === 200) {
    return { token: signup.json.access_token ?? signup.json.token, created: true };
  }
  const login = await api(
    'POST',
    '/api/user/token-auth/',
    { email: admin.email, password: admin.password },
    { token: null },
  );
  return { token: login.access_token ?? login.token, created: false };
}

// ---------------------------------------------------------------- Schéma
async function ensureWorkspaceAndDb(api, workspaceName, databaseName) {
  const workspaces = await api('GET', '/api/workspaces/');
  let workspace = workspaces.find((w) => w.name === workspaceName);
  if (!workspace) {
    workspace = await api('POST', '/api/workspaces/', { name: workspaceName });
    log(`Workspace "${workspaceName}" créé`);
  }
  const apps = await api('GET', `/api/applications/workspace/${workspace.id}/`);
  let db = apps.find((a) => a.type === 'database' && a.name === databaseName);
  if (!db) {
    db = await api('POST', `/api/applications/workspace/${workspace.id}/`, {
      name: databaseName,
      type: 'database',
    });
    log(`Base "${databaseName}" créée`);
  }
  return { workspace, db };
}

async function ensureTable(api, db, name, primaryName, strict) {
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
    if (strict) {
      throw new Error(
        `Table "${name}" : colonne primaire "${primary.name}" ≠ "${primaryName}" attendu. ` +
          'Initialisation en création seule : renommer la colonne dans Baserow ou repartir d\'une instance vide.',
      );
    }
    await api('PATCH', `/api/database/fields/${primary.id}/`, { name: primaryName });
    fields = await api('GET', `/api/database/fields/table/${table.id}/`);
  }
  return { table, fields };
}

async function ensureField(api, ctx, def, strict) {
  const existing = ctx.fields.find((f) => f.name === def.name);
  if (existing && (existing.type === def.type || existing.primary)) {
    if (strict) return existing; // création seule : jamais retoucher une colonne existante
    return def.select_options && !existing.primary ? syncSelectOptions(api, ctx, existing, def.select_options) : existing;
  }
  if (existing) {
    if (strict) {
      throw new Error(
        `Colonne "${def.name}" de "${ctx.table.name}" : type ${existing.type} ≠ ${def.type} attendu. ` +
          'Initialisation en création seule : corriger la colonne dans Baserow ou repartir d\'une instance vide.',
      );
    }
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
// Mode seed uniquement : en initialisation de production, une colonne existante n'est pas retouchée.
async function syncSelectOptions(api, ctx, field, wanted) {
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

/**
 * Crée le schéma complet d'une carte et renvoie workspace, base, tables (`T`), champs des
 * événements (`f`) et champs de référence (`refFields`). Voir l'en-tête du fichier pour
 * les deux modes (seed local / initialisation de production).
 *
 * `optionSets` (seed uniquement) :
 *   referencePictos : { formats: [...], publics: [...], themes: [...] } (valeurs de pictos)
 *   referenceColors : [[nom, pastille], ...]
 *   moderation      : états de modération de test en plus de la valeur visible
 *   tariff          : options de tarif de test en plus de la valeur « gratuit »
 *   access          : options d'accessibilité de test
 *   extraEventFields: colonnes « formulaire » additionnelles (ignorées par le mapping)
 */
export async function ensureSchema(api, appConfig, { workspaceName, databaseName, strict = false, optionSets = null }) {
  const FM = appConfig.baserow.fieldMapping;
  const REF = appConfig.baserow.mapping.referenceFields;
  const MODERATION_OK = appConfig.baserow.moderationVisibleValue;
  const MODALITY_OPTIONS = Object.keys(appConfig.baserow.mapping.modality);
  const TARIFF_FREE = appConfig.baserow.mapping.tariffFreeValue;
  const test = optionSets;

  const { workspace, db } = await ensureWorkspaceAndDb(api, workspaceName, databaseName);

  // --- Tables (référentiels d'abord)
  const table = (name, primaryName) => ensureTable(api, db, name, primaryName, strict);
  const T = {};
  T.formats = await table('Formats', REF.name);
  T.publics = await table('Publics', REF.name);
  T.themes = await table('Thématiques', REF.name);
  T.partners = await table('Partenaires', REF.name);
  T.events = await table('Événements', FM.title);

  const field = (ctx, def) => ensureField(api, ctx, def, strict);
  const refFields = {};
  for (const key of ['formats', 'publics', 'themes']) {
    const pictos = test ? [...new Set(test.referencePictos[key].filter(Boolean))] : [];
    refFields[key] = {
      picto: await field(T[key], { name: REF.picto, type: 'multiple_select', select_options: opts(pictos, 'light-green') }),
      couleur: await field(T[key], {
        name: REF.color,
        type: 'single_select',
        select_options: test ? test.referenceColors.map(([value, color]) => ({ value, color })) : [],
      }),
    };
  }
  await field(T.partners, { name: REF.logo, type: 'file' });

  // --- Champs des événements (noms = fieldMapping)
  const E = T.events;
  const linkField = (name, tableId) => field(E, { name, type: 'link_row', link_row_table_id: tableId, has_related_field: false });
  const f = {};
  f.description = await field(E, { name: FM.description, type: 'long_text' });
  f.start = await field(E, { name: FM.startDate, type: 'date', date_format: 'ISO', date_include_time: true, date_time_format: '24' });
  f.end = await field(E, { name: FM.endDate, type: 'date', date_format: 'ISO', date_include_time: true, date_time_format: '24' });
  f.format = await linkField(FM.format, T.formats.table.id);
  f.modality = await field(E, { name: FM.modality, type: 'single_select', select_options: opts(MODALITY_OPTIONS) });
  f.audience = await linkField(FM.audience, T.publics.table.id);
  f.theme = await linkField(FM.theme, T.themes.table.id);
  f.partners = await linkField(FM.partnerField, T.partners.table.id);
  f.image = await field(E, { name: FM.image, type: 'file' });
  f.address = await field(E, { name: FM.address, type: 'text' });
  f.postalCode = await field(E, { name: FM.postalCode, type: 'text' });
  f.city = await field(E, { name: FM.city, type: 'text' });
  f.organizer = await field(E, { name: FM.organizer, type: 'text' });
  f.firstName = await field(E, { name: FM.organizerFirstName, type: 'text' });
  f.lastName = await field(E, { name: FM.organizerLastName, type: 'text' });
  f.registrationUrl = await field(E, { name: FM.registrationUrl, type: 'text' });
  f.venueName = await field(E, { name: FM.venueName, type: 'text' });
  f.access = await field(E, {
    name: FM.accessModalities,
    type: 'multiple_select',
    select_options: opts(test ? test.access : [], 'light-gray'),
  });
  f.visio = await field(E, { name: FM.videoConferenceUrl, type: 'text' });
  f.contactEmail = await field(E, { name: FM.contactEmail, type: 'text' });
  f.contactEmailFallback = await field(E, { name: FM.contactEmailFallback, type: 'text' });
  f.phone = await field(E, { name: FM.contactPhone, type: 'text' });
  f.website = await field(E, { name: FM.organizerWebsite, type: 'text' });
  f.capacity = await field(E, { name: FM.capacity, type: 'number', number_decimal_places: 0 });
  f.tarif = await field(E, {
    name: FM.tariff,
    type: 'single_select',
    select_options: opts([TARIFF_FREE, ...(test ? test.tariff : [])]),
  });
  f.price = await field(E, { name: FM.price, type: 'number', number_decimal_places: 2 });
  f.moderation = await field(E, {
    name: FM.moderation,
    type: 'single_select',
    select_options: opts([MODERATION_OK, ...(test ? test.moderation : [])], 'light-red'),
  });
  // Colonnes « formulaire » du jeu de test (présentes dans BaserowRecord mais non mappées)
  for (const extra of test ? test.extraEventFields : []) {
    await field(E, extra);
  }

  return { workspace, db, T, f, refFields };
}
