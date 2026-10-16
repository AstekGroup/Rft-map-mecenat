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
    colorHexa: firstSelectValue(color),
  };
}

function firstSelectValue(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const first = value[0] as Partial<BaserowSelect> | undefined;
  return first?.value;
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
    first.thumbnails?.card?.url || first.thumbnails?.small?.url || first.url
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
  const eventEnd = parsedEnd && parsedEnd >= eventStart ? parsedEnd : eventStart;
  return eventStart <= periodEnd && eventEnd >= periodStart;
}

// ============================================================
// DateTime parsing
// ============================================================

export function parseDateTime(dateTimeString: string | undefined): {
  date: string;
  time: string;
} {
  if (!dateTimeString) return { date: '', time: '' };

  try {
    const dt = new Date(dateTimeString);
    if (isNaN(dt.getTime())) return { date: '', time: '' };

    const date = dt.toLocaleDateString('fr-CA');
    const time = dt.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });

    return { date, time };
  } catch {
    return { date: '', time: '' };
  }
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
