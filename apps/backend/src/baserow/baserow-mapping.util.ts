import type {
  TargetAudience,
  EventModality,
  LinkedTableRow,
} from '@make-map/types';
import type {
  BaserowAttachment,
  BaserowSelect,
  BaserowRecord,
} from './baserow.types';

// ============================================================
// Default mapping maps (surchargeables via AppConfig)
// ============================================================

const DEFAULT_AUDIENCE_MAP: Record<string, TargetAudience> = {
  'Tout public': 'tout-public',
  Familles: 'familles-enfants',
  'Famille / enfants': 'familles-enfants',
  Scolaire: 'scolaires',
  'Ecoliers / Etudiants': 'scolaires',
  'Écoliers / Étudiants': 'scolaires',
  Professionnels: 'professionnels',
  "Salariés d'une entreprise": 'salaries-entreprise',
  Salariés: 'salaries-entreprise',
};

const DEFAULT_AUDIENCE_HINTS: Record<string, TargetAudience> = {
  'tout public': 'tout-public',
  famille: 'familles-enfants',
  enfant: 'familles-enfants',
  colier: 'scolaires',
  tudiant: 'scolaires',
  scolaire: 'scolaires',
  salari: 'salaries-entreprise',
  entreprise: 'salaries-entreprise',
  pro: 'professionnels',
};

const DEFAULT_MODALITY_MAP: Record<string, EventModality> = {
  Présentiel: 'presentiel',
  Distanciel: 'distanciel',
  'En ligne': 'distanciel',
  Hybride: 'presentiel',
};

const DEFAULT_MODALITY_HINTS: Record<string, EventModality> = {
  distanciel: 'distanciel',
  'en ligne': 'distanciel',
  visio: 'distanciel',
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
// Mapping Public
// ============================================================

export function mapTargetAudience(
  baserowPublic: BaserowSelect[] | undefined,
  audienceMap?: Record<string, TargetAudience>,
  audienceHints?: Record<string, TargetAudience>,
): TargetAudience[] {
  const map = audienceMap || DEFAULT_AUDIENCE_MAP;
  const hints = audienceHints || DEFAULT_AUDIENCE_HINTS;

  if (!baserowPublic || baserowPublic.length === 0) return ['tout-public'];

  const mapped = baserowPublic
    .map((p) => {
      const exact = map[p.value];
      if (exact) return exact;

      const lower = p.value.toLowerCase();
      for (const [keyword, audience] of Object.entries(hints)) {
        if (lower.includes(keyword)) return audience;
      }

      return null;
    })
    .filter((a): a is TargetAudience => a !== null);

  return mapped.length > 0 ? mapped : ['tout-public'];
}

// ============================================================
// Mapping Modalité
// ============================================================

export function mapModality(
  baserowType: BaserowSelect | undefined,
  modalityMap?: Record<string, EventModality>,
  modalityHints?: Record<string, EventModality>,
): EventModality {
  const map = modalityMap || DEFAULT_MODALITY_MAP;
  const hints = modalityHints || DEFAULT_MODALITY_HINTS;

  if (!baserowType) return 'presentiel';

  const exact = map[baserowType.value];
  if (exact) return exact;

  const lower = baserowType.value.toLowerCase();
  for (const [keyword, mod] of Object.entries(hints)) {
    if (lower.includes(keyword)) return mod;
  }

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

export function computeIsDuringWeek(
  dateString: string | undefined,
  weekStart?: string,
  weekEnd?: string,
): boolean {
  if (!dateString) return false;
  const start = weekStart || '2026-09-25';
  const end = weekEnd || '2026-10-04';
  try {
    const date = new Date(dateString);
    return date >= new Date(start) && date <= new Date(`${end}T23:59:59.999Z`);
  } catch {
    return false;
  }
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
