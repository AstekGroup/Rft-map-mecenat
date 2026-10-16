import type { EventModality, LinkedTableRow } from '@make-map/types';
import type {
  BaserowAttachment,
  BaserowSelect,
  BaserowRecord,
} from './baserow.types';

const DEFAULT_MODALITY_MAP: Record<string, EventModality> = {
  Présentiel: 'presentiel',
  Distanciel: 'distanciel',
  'En ligne': 'distanciel',
  Hybride: 'presentiel',
};

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

export function mapModality(
  baserowType: BaserowSelect | undefined,
): EventModality {
  const map = DEFAULT_MODALITY_MAP;

  if (!baserowType) return 'presentiel';

  const exact = map[baserowType.value];
  if (exact) return exact;
  return 'presentiel';
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
 * Indique si la date tombe dans la période de l'événement (`app.eventDates` de la config).
 * Aucune date par défaut : si la config ne donne pas des dates valides, on lève une erreur
 * explicite plutôt que de calculer un badge faux.
 */
export function computeIsDuringWeek(
  dateString: string | undefined,
  weekStart: string | undefined,
  weekEnd: string | undefined,
): boolean {
  const start = assertConfigDate(weekStart, 'weekStart');
  const end = assertConfigDate(weekEnd, 'weekEnd');
  if (!dateString) return false;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date >= new Date(`${start}T00:00:00.000Z`) &&
    date <= new Date(`${end}T23:59:59.999Z`)
  );
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
