import type {
  BaserowFieldMapping,
  BaserowReferenceFields,
  EventModality,
} from '@make-map/types';

export interface ConfigValidationResult {
  /** Problèmes bloquants : la carte ne peut pas fonctionner correctement avec cette config. */
  errors: string[];
  /** Problèmes non bloquants (clé inconnue ignorée, doublon probable…). */
  warnings: string[];
}

/**
 * Rôles de colonnes attendus dans `baserow.fieldMapping`. Typé en `Record<keyof …, true>` :
 * ajouter un rôle à `BaserowFieldMapping` sans l'ajouter ici ne compile pas.
 */
const FIELD_MAPPING_ROLES: Record<keyof BaserowFieldMapping, true> = {
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  format: true,
  modality: true,
  audience: true,
  theme: true,
  image: true,
  address: true,
  postalCode: true,
  city: true,
  organizer: true,
  organizerFirstName: true,
  organizerLastName: true,
  registrationUrl: true,
  venueName: true,
  accessModalities: true,
  videoConferenceUrl: true,
  contactEmail: true,
  contactEmailFallback: true,
  contactPhone: true,
  organizerWebsite: true,
  capacity: true,
  price: true,
  tariff: true,
  partnerField: true,
  moderation: true,
};

const REFERENCE_FIELD_ROLES: Record<keyof BaserowReferenceFields, true> = {
  name: true,
  logo: true,
  picto: true,
  color: true,
};

const MODALITIES: Record<EventModality, true> = {
  presentiel: true,
  distanciel: true,
};

export const FIELD_MAPPING_KEYS = Object.keys(
  FIELD_MAPPING_ROLES,
) as (keyof BaserowFieldMapping)[];
export const REFERENCE_FIELD_KEYS = Object.keys(
  REFERENCE_FIELD_ROLES,
) as (keyof BaserowReferenceFields)[];

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function has(object: object, key: string): boolean {
  return Object.hasOwn(object, key);
}

function isFilled(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    DATE_FORMAT.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().startsWith(value)
  );
}

function show(value: unknown): string {
  return JSON.stringify(value) ?? 'undefined';
}

/**
 * Valide une config de carte déjà lue (et dont les gabarits sont résolus).
 * Ne lève jamais : renvoie tous les problèmes d'un coup, avec le chemin de la clé fautive,
 * pour qu'une seule lecture des logs suffise à tout corriger.
 */
export function validateAppConfig(config: unknown): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isDict(config)) {
    return {
      errors: ['La config doit être un objet JSON (reçu autre chose).'],
      warnings,
    };
  }

  validateApp(config.app, errors, warnings);
  validateTheme(config.theme, errors);
  validateTexts(config.texts, errors);
  validateFilters(config.filters, errors);
  validateBaserow(config.baserow, errors, warnings);

  if (!isFilled(config.profile)) {
    warnings.push(
      'profile : absent ou vide (identifiant de la carte, utilisé dans les logs).',
    );
  }

  return { errors, warnings };
}

function validateApp(app: unknown, errors: string[], warnings: string[]): void {
  if (!isDict(app)) {
    errors.push(
      "app : section absente (nom, nom court et dates de l'événement).",
    );
    return;
  }
  for (const key of ['name', 'shortName']) {
    if (!isFilled(app[key])) {
      errors.push(`app.${key} : absent ou vide (reçu : ${show(app[key])}).`);
    }
  }
  for (const key of ['description', 'url', 'locale']) {
    if (app[key] !== undefined && typeof app[key] !== 'string') {
      warnings.push(
        `app.${key} : doit être une chaîne (reçu : ${show(app[key])}).`,
      );
    }
  }

  const dates = app.eventDates;
  if (!isDict(dates)) {
    errors.push(
      'app.eventDates : absent (weekStart et weekEnd, au format AAAA-MM-JJ).',
    );
    return;
  }
  for (const key of ['weekStart', 'weekEnd']) {
    if (!isValidDate(dates[key])) {
      errors.push(
        `app.eventDates.${key} : doit être une date réelle au format AAAA-MM-JJ (reçu : ${show(dates[key])}).`,
      );
    }
  }
  if (
    isValidDate(dates.weekStart) &&
    isValidDate(dates.weekEnd) &&
    dates.weekEnd < dates.weekStart
  ) {
    errors.push(
      `app.eventDates : weekEnd (${dates.weekEnd}) est avant weekStart (${dates.weekStart}).`,
    );
  }
}

function validateTheme(theme: unknown, errors: string[]): void {
  if (!isDict(theme)) {
    errors.push('theme : section absente (couleurs et polices).');
    return;
  }

  if (!isDict(theme.colors)) {
    errors.push('theme.colors : absent (au moins `primary`).');
  } else {
    if (!isFilled(theme.colors.primary)) {
      errors.push('theme.colors.primary : couleur absente.');
    }
    for (const [name, value] of Object.entries(theme.colors)) {
      if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
        errors.push(
          `theme.colors.${name} : couleur hexadécimale attendue, au format #RRGGBB (reçu : ${show(value)}).`,
        );
      }
    }
  }

  if (!isDict(theme.fonts)) {
    errors.push('theme.fonts : absent (heading et body).');
  } else {
    for (const key of ['heading', 'body']) {
      if (!isFilled(theme.fonts[key])) {
        errors.push(`theme.fonts.${key} : police absente ou vide.`);
      }
    }
    if (
      theme.fonts.googleFontsUrl !== undefined &&
      !isFilled(theme.fonts.googleFontsUrl)
    ) {
      errors.push(
        'theme.fonts.googleFontsUrl : doit être une URL non vide si elle est présente.',
      );
    }
  }

  if (theme.borderRadius !== undefined) {
    if (!isDict(theme.borderRadius)) {
      errors.push(
        'theme.borderRadius : doit être un objet { nom: "valeur CSS" }.',
      );
    } else {
      for (const [name, value] of Object.entries(theme.borderRadius)) {
        if (!isFilled(value)) {
          errors.push(
            `theme.borderRadius.${name} : valeur CSS attendue (reçu : ${show(value)}).`,
          );
        }
      }
    }
  }
}

function validateTexts(texts: unknown, errors: string[]): void {
  if (!isDict(texts)) {
    errors.push('texts : section absente (meta et home).');
    return;
  }
  for (const section of ['meta', 'home']) {
    const entries = texts[section];
    if (!isDict(entries)) {
      errors.push(`texts.${section} : section absente (objet de textes).`);
      continue;
    }
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value !== 'string') {
        errors.push(
          `texts.${section}.${key} : doit être une chaîne (reçu : ${show(value)}).`,
        );
      }
    }
  }
}

function validateFilters(filters: unknown, errors: string[]): void {
  if (!isDict(filters)) {
    errors.push('filters : section absente (dateFilterModes).');
    return;
  }
  const modes = filters.dateFilterModes;
  if (!Array.isArray(modes)) {
    errors.push(
      'filters.dateFilterModes : doit être un tableau de { mode, label }.',
    );
    return;
  }
  modes.forEach((entry, index) => {
    if (!isDict(entry) || !isFilled(entry.mode) || !isFilled(entry.label)) {
      errors.push(
        `filters.dateFilterModes[${index}] : doit contenir un \`mode\` et un \`label\` non vides.`,
      );
    }
  });
}

function validateBaserow(
  baserow: unknown,
  errors: string[],
  warnings: string[],
): void {
  if (!isDict(baserow)) {
    errors.push(
      'baserow : section absente (correspondance avec les colonnes Baserow).',
    );
    return;
  }

  if (!isFilled(baserow.moderationVisibleValue)) {
    errors.push(
      "baserow.moderationVisibleValue : valeur de modération qui rend un événement public, absente ou vide (sans elle, rien n'est publié).",
    );
  }

  validateFieldMapping(baserow.fieldMapping, errors, warnings);
  validateMapping(baserow.mapping, errors, warnings);
}

function validateFieldMapping(
  mapping: unknown,
  errors: string[],
  warnings: string[],
): void {
  if (!isDict(mapping)) {
    errors.push(
      'baserow.fieldMapping : section absente (rôle → nom de colonne Baserow).',
    );
    return;
  }

  for (const role of FIELD_MAPPING_KEYS) {
    if (!isFilled(mapping[role])) {
      errors.push(
        `baserow.fieldMapping.${role} : nom de colonne Baserow absent ou vide (reçu : ${show(mapping[role])}).`,
      );
    }
  }
  for (const key of Object.keys(mapping)) {
    if (!has(FIELD_MAPPING_ROLES, key)) {
      warnings.push(
        `baserow.fieldMapping.${key} : rôle inconnu, ignoré (rôles connus : ${FIELD_MAPPING_KEYS.join(', ')}).`,
      );
    }
  }

  const byColumn = new Map<string, string[]>();
  for (const role of FIELD_MAPPING_KEYS) {
    const column = mapping[role];
    if (!isFilled(column)) continue;
    byColumn.set(column, [...(byColumn.get(column) ?? []), role]);
  }
  for (const [column, roles] of byColumn) {
    if (roles.length > 1) {
      warnings.push(
        `baserow.fieldMapping : la colonne « ${column} » est utilisée par plusieurs rôles (${roles.join(', ')}). Vérifier qu'il ne s'agit pas d'une erreur de copie.`,
      );
    }
  }
}

function validateMapping(
  mapping: unknown,
  errors: string[],
  warnings: string[],
): void {
  if (!isDict(mapping)) {
    errors.push(
      'baserow.mapping : section absente (referenceFields, modality, tariffFreeValue).',
    );
    return;
  }

  const reference = mapping.referenceFields;
  if (!isDict(reference)) {
    errors.push(
      'baserow.mapping.referenceFields : absent (colonnes name, logo, picto, color des tables de référence).',
    );
  } else {
    for (const role of REFERENCE_FIELD_KEYS) {
      if (!isFilled(reference[role])) {
        errors.push(
          `baserow.mapping.referenceFields.${role} : nom de colonne absent ou vide (reçu : ${show(reference[role])}).`,
        );
      }
    }
    for (const key of Object.keys(reference)) {
      if (!has(REFERENCE_FIELD_ROLES, key)) {
        warnings.push(
          `baserow.mapping.referenceFields.${key} : rôle inconnu, ignoré.`,
        );
      }
    }
  }

  const modality = mapping.modality;
  if (!isDict(modality) || Object.keys(modality).length === 0) {
    errors.push(
      'baserow.mapping.modality : absent ou vide (valeur de la liste « modalité » de Baserow → "presentiel" ou "distanciel").',
    );
  } else {
    for (const [label, value] of Object.entries(modality)) {
      if (typeof value !== 'string' || !has(MODALITIES, value)) {
        errors.push(
          `baserow.mapping.modality["${label}"] : doit valoir "presentiel" ou "distanciel" (reçu : ${show(value)}).`,
        );
      }
    }
  }

  if (!isFilled(mapping.tariffFreeValue)) {
    errors.push(
      'baserow.mapping.tariffFreeValue : valeur de la liste « tarif » qui signifie gratuit, absente ou vide.',
    );
  }
}
