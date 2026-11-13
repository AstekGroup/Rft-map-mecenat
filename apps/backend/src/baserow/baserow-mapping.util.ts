import type {
  BaserowReferenceFields,
  EventModality,
  LinkedTableRow,
} from '@make-map/types';
import type {
  BaserowAttachment,
  BaserowLinkedTableRecord,
  BaserowSelect,
  BaserowRecord,
} from './baserow.types';
import { BASEROW_SELECT_PALETTE } from './baserow-palette';

// ============================================================
// Mapping des tables de référence
// ============================================================

/**
 * Transforme une ligne d'une table de référence (format, public, thématique, partenaire).
 * Les noms de colonnes viennent de la config (`baserow.mapping.referenceFields`) ; une colonne
 * absente donne une valeur vide (le nom manquant est signalé par l'appelant).
 */
export function mapReferenceRecord(
  record: BaserowLinkedTableRecord,
  fields: BaserowReferenceFields,
  onUnknownColor?: (color: string) => void,
): LinkedTableRow {
  const name = record[fields.name];
  const logo = record[fields.logo];
  const picto = record[fields.picto];
  const color = record[fields.color];
  return {
    id: String(record.id),
    name: typeof name === 'string' ? name : '',
    logoUrl: extractImageUrl(
      Array.isArray(logo) ? (logo as BaserowAttachment[]) : undefined,
    ),
    pictoName: firstSelectValue(picto),
    colorHexa: readColorValue(color, onUnknownColor),
  };
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Couleur d'un référentiel, lue dans une liste de choix (simple ou multiple, première option) :
 * - option nommée par un code hexadécimal (`#E8793A`, ancien schéma) : ce code ;
 * - sinon, la pastille choisie par l'admin dans Baserow (`option.color`), traduite par
 *   `BASEROW_SELECT_PALETTE` ;
 * - pastille inconnue de la palette : `undefined` (couleur de repli côté front) et `onUnknownColor`
 *   est appelée pour que l'appelant la signale.
 */
export function readColorValue(
  value: unknown,
  onUnknownColor?: (color: string) => void,
): string | undefined {
  const option = firstSelectOption(value);
  if (!option) return undefined;
  const fromName = normalizeHexColor(option.value);
  if (fromName && HEX_COLOR.test(fromName)) return fromName;
  if (!option.color) return undefined;
  const fromPalette = BASEROW_SELECT_PALETTE[option.color];
  if (!fromPalette) onUnknownColor?.(option.color);
  return fromPalette;
}

/**
 * Tolère les espaces autour et le `#` oublié (`E8793A` devient `#E8793A`). Toute autre valeur est
 * transmise telle quelle ; c'est le frontend qui refuse un code invalide et affiche la couleur de
 * repli.
 */
export function normalizeHexColor(
  value: string | undefined,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(trimmed) ? `#${trimmed}` : trimmed;
}

function firstSelectValue(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const first = value[0] as Partial<BaserowSelect> | undefined;
  return first?.value;
}

/** Liste de choix simple (objet ou `null`) ou multiple / recherche (tableau) : première option. */
function firstSelectOption(value: unknown): Partial<BaserowSelect> | undefined {
  const first: unknown = Array.isArray(value) ? value[0] : value;
  return first && typeof first === 'object'
    ? (first as Partial<BaserowSelect>)
    : undefined;
}

// ============================================================
// Mapping LinkedRow
// ============================================================

export function mapLinkedRow(
  record: BaserowRecord,
  fieldName: string,
  linkedTableRowMap: Map<string, LinkedTableRow>,
) {
  const items: Array<{ id: number | string }> =
    (record[fieldName] as Array<{ id: number | string }>) || [];
  const mapped = items.map((linkedRow) =>
    linkedTableRowMap.get(String(linkedRow.id)),
  );
  return mapped.filter((p): p is LinkedTableRow => !!p);
}

// ============================================================
// Mapping Modalité
// ============================================================

/**
 * Traduit la valeur de la liste « modalité » de Baserow en modalité de l'application,
 * avec la table de correspondance de la config (`baserow.mapping.modality`).
 * Champ vide : présentiel. Valeur absente de la config : présentiel, et `onUnmapped` est appelée
 * pour que l'appelant la signale (jamais de repli silencieux).
 */
export function mapModality(
  baserowType: BaserowSelect | undefined,
  modalityMap: Record<string, EventModality>,
  onUnmapped?: (value: string) => void,
): EventModality {
  if (!baserowType) return 'presentiel';

  const mapped = modalityMap[baserowType.value];
  if (mapped) return mapped;

  onUnmapped?.(baserowType.value);
  return 'presentiel';
}

// ============================================================
// Tarif
// ============================================================

/**
 * Un événement est gratuit si son tarif porte la valeur « gratuit » de la config
 * (`baserow.mapping.tariffFreeValue`) ou si aucun montant n'est renseigné.
 */
export function isFreeTariff(
  tariff: BaserowSelect | undefined,
  price: unknown,
  freeValue: string,
): boolean {
  return tariff?.value === freeValue || !price;
}

// ============================================================
// Image extraction
// ============================================================

export function extractImageUrl(
  attachments: BaserowAttachment[] | undefined,
): string | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  const first = attachments[0];
  return (
    first.thumbnails?.card_cover?.url || first.thumbnails?.small?.url || first.url
  );
}

// ============================================================
// isDuringWeek
// ============================================================

const CONFIG_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

function assertConfigDate(value: string | undefined, key: string): string {
  if (
    !value ||
    !CONFIG_DATE_FORMAT.test(value) ||
    Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime())
  ) {
    throw new Error(
      `Dates de l'événement absentes ou invalides dans la config : app.eventDates.${key} doit être une date au format AAAA-MM-JJ (reçu : ${JSON.stringify(value)}).`,
    );
  }
  return value;
}

/**
 * Indique si l'événement recoupe la période de l'événement (`app.eventDates` de la config) :
 * il compte dès qu'un seul de ses jours tombe dans la période, même s'il a commencé avant ou
 * se termine après. C'est la même règle que le filtre « dates personnalisées » du frontend
 * (recoupement de deux intervalles de jours), pour que les deux modes donnent le même résultat.
 *
 * - Sans date de début valide : `false` (l'événement sans date est écarté ailleurs).
 * - Fin absente, invalide ou avant le début : l'événement est ponctuel (fin ignorée).
 * - Aucune date par défaut : si la config ne donne pas des dates valides, on lève une erreur
 *   explicite plutôt que de calculer un badge faux.
 */
export function computeIsDuringWeek(
  startDateString: string | undefined,
  endDateString: string | undefined,
  weekStart: string | undefined,
  weekEnd: string | undefined,
): boolean {
  const periodStart = assertConfigDate(weekStart, 'weekStart');
  const periodEnd = assertConfigDate(weekEnd, 'weekEnd');
  const eventStart = parseDateTime(startDateString).date;
  if (!eventStart) return false;
  const parsedEnd = parseDateTime(endDateString).date;
  const eventEnd =
    parsedEnd && parsedEnd >= eventStart ? parsedEnd : eventStart;
  return eventStart <= periodEnd && eventEnd >= periodStart;
}

// ============================================================
// DateTime parsing
// ============================================================

/**
 * Fuseau d'affichage des événements : la date et l'heure sont lues dans le même fuseau.
 * (Avant, la date suivait le fuseau du serveur et l'heure celui de Paris : un événement à
 * 22h30 UTC affichait « 21/09 00h30 » sur un serveur en UTC.)
 */
const DISPLAY_TIME_ZONE = 'Europe/Paris';

export function parseDateTime(dateTimeString: string | undefined): {
  date: string;
  time: string;
} {
  if (!dateTimeString) return { date: '', time: '' };

  try {
    const dt = new Date(dateTimeString);
    if (isNaN(dt.getTime())) return { date: '', time: '' };

    const date = dt.toLocaleDateString('fr-CA', {
      timeZone: DISPLAY_TIME_ZONE,
    });
    const time = dt.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: DISPLAY_TIME_ZONE,
    });

    return { date, time };
  } catch {
    return { date: '', time: '' };
  }
}

/**
 * Vrai si les deux dates sont valides et que la fin précède strictement le début
 * (comparaison des instants, donc aussi le même jour avec une heure de fin antérieure).
 */
export function isEndBeforeStart(
  startDateString: string | undefined,
  endDateString: string | undefined,
): boolean {
  if (!startDateString || !endDateString) return false;
  const start = new Date(startDateString).getTime();
  const end = new Date(endDateString).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return end < start;
}

/**
 * Capacité d'accueil : entier strictement positif, sinon `undefined` (« non renseignée »).
 * Accepte un nombre ou un texte numérique (colonne Baserow de type texte) ; 0, négatif,
 * décimal ou texte non numérique ne sont pas une capacité exploitable.
 */
export function parseCapacity(value: unknown): number | undefined {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\s*\d+\s*$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

// ============================================================
// Helpers
// ============================================================

export function buildOrganizerContact(
  firstName: string | undefined,
  lastName: string | undefined,
): string | undefined {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function buildAccessibilityInfo(
  accessModalities: BaserowSelect[] | undefined,
): string | undefined {
  if (!accessModalities || accessModalities.length === 0) return undefined;
  return accessModalities.map((element) => element.value).join(', ');
}
