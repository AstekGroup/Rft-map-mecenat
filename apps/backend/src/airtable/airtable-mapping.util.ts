/**
 * Utilitaires de mapping entre les valeurs Airtable et les types internes (La Grande Semaine Végétale).
 */

import type {
  EventType,
  EventFormat,
  TargetAudience,
  EventModality,
} from '@make-map/types';
import type { AirtableAttachment } from './airtable.types';

// ============================================================
// Mapping Format Airtable -> EventFormat + EventType
// ============================================================

interface FormatMapping {
  format: EventFormat;
  type: EventType;
}

const FORMAT_MAP: Record<string, FormatMapping> = {
  'Atelier Cuisine': { format: 'atelier', type: 'atelier' },
  'Dégustation': { format: 'degustation', type: 'degustation' },
  'Conférence / Débat': { format: 'conference', type: 'conference' },
  'Visite de ferme / Jardin': { format: 'visite', type: 'visite' },
  'Marché / Fête locale': { format: 'marche', type: 'marche' },
  'Repas partagé': { format: 'repas', type: 'autre' },
  'Atelier': { format: 'atelier', type: 'atelier' },
  'Conférence': { format: 'conference', type: 'conference' },
  'Marché': { format: 'marche', type: 'marche' },
  'Visite': { format: 'visite', type: 'visite' },
};

export function mapFormat(airtableFormat: string | undefined): FormatMapping {
  if (!airtableFormat) return { format: 'autre', type: 'autre' };

  const exact = FORMAT_MAP[airtableFormat];
  if (exact) return exact;

  const lower = airtableFormat.toLowerCase();
  
  // Fuzzy matching pour faciliter la transition
  if (lower.includes('cuisine') || lower.includes('atelier')) return { format: 'atelier', type: 'atelier' };
  if (lower.includes('degustation') || lower.includes('dégustation')) return { format: 'degustation', type: 'degustation' };
  if (lower.includes('conf') || lower.includes('débat') || lower.includes('debat')) return { format: 'conference', type: 'conference' };
  if (lower.includes('ferme') || lower.includes('jardin') || lower.includes('visite')) return { format: 'visite', type: 'visite' };
  if (lower.includes('marché') || lower.includes('marche') || lower.includes('fête')) return { format: 'marche', type: 'marche' };
  if (lower.includes('repas')) return { format: 'repas', type: 'autre' };

  return { format: 'autre', type: 'autre' };
}

// ============================================================
// Mapping Public Airtable -> TargetAudience[]
// ============================================================

const AUDIENCE_MAP: Record<string, TargetAudience> = {
  'Tout public': 'tout-public',
  'Jeunes (15-25 ans)': 'jeunes',
  'Jeunes': 'jeunes',
  'Seniors': 'seniors',
  'Familles': 'familles',
  'Scolaire': 'scolaire',
  'Ecoliers / Etudiants': 'scolaire',
  'Écoliers / Étudiants': 'scolaire',
  'Professionnels': 'professionnels',
};

export function mapTargetAudience(
  airtablePublic: string[] | undefined,
): TargetAudience[] {
  if (!airtablePublic || airtablePublic.length === 0) return ['tout-public'];

  const mapped = airtablePublic
    .map((p) => {
      const exact = AUDIENCE_MAP[p];
      if (exact) return exact;

      const lower = p.toLowerCase();
      if (lower.includes('tout public')) return 'tout-public';
      if (lower.includes('jeune')) return 'jeunes';
      if (lower.includes('senior')) return 'seniors';
      if (lower.includes('famille')) return 'familles';
      if (
        lower.includes('colier') ||
        lower.includes('tudiant') ||
        lower.includes('scolaire')
      )
        return 'scolaire';
      if (lower.includes('pro')) return 'professionnels';

      return null;
    })
    .filter((a): a is TargetAudience => a !== null);

  return mapped.length > 0 ? mapped : ['tout-public'];
}

// ============================================================
// Mapping Modalité
// ============================================================

const MODALITY_MAP: Record<string, EventModality> = {
  Présentiel: 'presentiel',
  Distanciel: 'distanciel',
  'En ligne': 'distanciel',
  Hybride: 'presentiel',
};

export function mapModality(
  airtableType: string | undefined,
): EventModality {
  if (!airtableType) return 'presentiel';

  const exact = MODALITY_MAP[airtableType];
  if (exact) return exact;

  const lower = airtableType.toLowerCase();
  if (
    lower.includes('distanciel') ||
    lower.includes('en ligne') ||
    lower.includes('visio')
  ) {
    return 'distanciel';
  }

  return 'presentiel';
}

// ============================================================
// Image extraction
// ============================================================

export function extractImageUrl(
  attachments: AirtableAttachment[] | undefined,
): string | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  const first = attachments[0];
  return first.thumbnails?.large?.url || first.url;
}

// ============================================================
// isDuringWeek
// ============================================================

const WEEK_START = new Date('2026-05-18T00:00:00.000Z');
const WEEK_END = new Date('2026-05-24T23:59:59.999Z');

export function computeIsDuringWeek(dateString: string | undefined): boolean {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    return date >= WEEK_START && date <= WEEK_END;
  } catch {
    return false;
  }
}

// ============================================================
// DateTime parsing
// ============================================================

export function parseAirtableDateTime(
  dateTimeString: string | undefined,
): { date: string; time: string } {
  if (!dateTimeString) return { date: '', time: '' };

  try {
    const dt = new Date(dateTimeString);
    if (isNaN(dt.getTime())) return { date: '', time: '' };

    const date = dt.toLocaleDateString('fr-CA'); // YYYY-MM-DD
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
  accessModalities: string[] | undefined,
): string | undefined {
  if (!accessModalities || accessModalities.length === 0) return undefined;
  return accessModalities.join(', ');
}
