import type {
  BaserowFieldMapping,
  BaserowReferenceFields,
} from '@make-map/types';

/** Colonnes techniques ajoutées par l'API Baserow, jamais configurées. */
const TECHNICAL_COLUMNS = new Set(['id', 'order']);

/** Minuscules, sans accents, espaces et apostrophes normalisés : sert à repérer une colonne « presque identique ». */
export function normalizeColumnName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Colonne existante qui ressemble à celle qui manque (renommage probable), sinon `undefined`. */
export function suggestColumn(
  missing: string,
  available: readonly string[],
): string | undefined {
  const target = normalizeColumnName(missing);
  return available.find((column) => {
    const candidate = normalizeColumnName(column);
    if (candidate === target) return true;
    const [short, long] =
      candidate.length < target.length
        ? [candidate, target]
        : [target, candidate];
    return short.length >= 4 && long.includes(short);
  });
}

function quote(name: string): string {
  return `« ${name} »`;
}

function didYouMean(missing: string, available: readonly string[]): string {
  const suggestion = suggestColumn(missing, available);
  return suggestion
    ? ` Colonne proche présente dans Baserow : ${quote(suggestion)}.`
    : '';
}

/**
 * Compare les colonnes réellement présentes dans la table des événements à celles que la config
 * demande (`baserow.fieldMapping`). Renvoie un message précis par colonne absente ; liste vide si
 * tout est présent. Quand une colonne manque, ajoute la liste des colonnes non utilisées, qui
 * contient en général la colonne renommée.
 */
export function checkEventColumns(
  columns: readonly string[],
  fieldMapping: Partial<BaserowFieldMapping>,
): string[] {
  const available = columns.filter((column) => !TECHNICAL_COLUMNS.has(column));
  const present = new Set(columns);
  const used = new Set<string>();
  const messages: string[] = [];

  for (const [role, column] of Object.entries(fieldMapping)) {
    if (!column) continue;
    used.add(column);
    if (!present.has(column)) {
      messages.push(
        `Table des événements : colonne ${quote(column)} (baserow.fieldMapping.${role}) introuvable dans Baserow, le champ sera vide.${didYouMean(column, available)}`,
      );
    }
  }

  if (messages.length > 0) {
    const unused = available.filter((column) => !used.has(column));
    if (unused.length > 0) {
      messages.push(
        `Table des événements : colonnes de Baserow que la config n'utilise pas (l'une d'elles est peut-être une colonne renommée) : ${unused.map(quote).join(', ')}.`,
      );
    }
  }
  return messages;
}

export interface ReferenceTableColumns {
  /** Nom lisible de la table (variable d'environnement, par exemple). */
  label: string;
  columns: readonly string[];
}

/**
 * Contrôle les colonnes des tables de référence (`baserow.mapping.referenceFields`).
 * La colonne du nom est exigée dans chaque table ; logo, picto et couleur ne se trouvent que dans
 * certaines tables (logo des partenaires, picto et couleur des formats…) : on signale seulement
 * celles qui n'existent dans aucune table.
 */
export function checkReferenceColumns(
  tables: readonly ReferenceTableColumns[],
  referenceFields: BaserowReferenceFields,
): string[] {
  const messages: string[] = [];

  for (const table of tables) {
    if (!table.columns.includes(referenceFields.name)) {
      messages.push(
        `Table de référence ${table.label} : colonne ${quote(referenceFields.name)} (baserow.mapping.referenceFields.name) introuvable dans Baserow, les libellés seront vides.${didYouMean(referenceFields.name, table.columns)}`,
      );
    }
  }

  if (tables.length > 0) {
    for (const role of ['logo', 'picto', 'color'] as const) {
      const column = referenceFields[role];
      if (!tables.some((table) => table.columns.includes(column))) {
        const all = tables.flatMap((table) => [...table.columns]);
        messages.push(
          `Tables de référence : aucune ne contient la colonne ${quote(column)} (baserow.mapping.referenceFields.${role}), ce champ sera vide partout.${didYouMean(column, all)}`,
        );
      }
    }
  }
  return messages;
}
