/**
 * Utilitaires de mapping entre les valeurs Airtable et les types internes (La Grande Semaine Végétale).
 */

import type {
  EventType,
  EventFormat,
  TargetAudience,
  EventModality,
  EventTheme,
} from '@make-map/types';
import type { AirtableAttachment } from './airtable.types';

// ============================================================
// Mapping Thématique Airtable -> EventTheme[]
// ============================================================

const THEME_MAP: Record<string, EventTheme> = {
  'Santé mentale': 'sante-mentale',
  'Activité physique': 'activite-physique',
  'Alimentation': 'alimentation',
  'Addictions': 'addictions',
  'Maladies chroniques':
    'maladies-chroniques',
  'Vaccination': 'vaccination',
  'Dépistage': 'depistage',
  'Santé environnementale': 'sante-environnementale',
  'Risques liés au numérique': 'numerique',
  'Soins ciblés': 'soins-cibles',
  Autres: 'autre',
};

export function mapThemes(airtableThemes: string[] | undefined): EventTheme[] {
  if (!airtableThemes || airtableThemes.length === 0) return ['autre'];

  const mapped = airtableThemes
    .map((t) => {
      const exact = THEME_MAP[t];
      if (exact) return exact;

      const lower = t.toLowerCase();
      if (lower.includes('mental') || lower.includes('bien-être'))
        return 'sante-mentale';
      if (lower.includes('physique') || lower.includes('sport'))
        return 'activite-physique';
      if (lower.includes('aliment') || lower.includes('nutri'))
        return 'alimentation';
      if (lower.includes('addict')) return 'addictions';
      if (lower.includes('maladie') && lower.includes('chronique'))
        return 'maladies-chroniques';
      if (lower.includes('vaccin')) return 'vaccination';
      if (lower.includes('dépistage') || lower.includes('bilan'))
        return 'depistage';
      if (lower.includes('environ')) return 'sante-environnementale';
      if (lower.includes('numérique')) return 'numerique';
      if (lower.includes('soins') || lower.includes('bucco'))
        return 'soins-cibles';

      return 'autre';
    })
    .filter((t): t is EventTheme => t !== null);

  return [...new Set(mapped)]; // Remove duplicates
}

// ============================================================
// Mapping Format Airtable -> EventFormat + EventType
// ============================================================

interface FormatMapping {
  format: EventFormat;
  type: EventType;
}

const FORMAT_MAP: Record<string, FormatMapping> = {
  'Atelier de cuisine': { format: 'atelier-cuisine', type: 'atelier-cuisine' },
  'Dégustation ou menu végétal': { format: 'degustation', type: 'degustation' },
  'Visite de jardin / potager ou cueillette': { format: 'visite-jardin', type: 'visite-jardin' },
  'Atelier pédagogique ou formation': { format: 'atelier-pedagogique', type: 'atelier-pedagogique' },
  'Conférence/webinaire/table-ronde': { format: 'conference', type: 'conference' },
  'Festival': { format: 'festival', type: 'festival' },
  'Autres': { format: 'autre', type: 'autre' },
};

export function mapFormat(airtableFormat: string | undefined): FormatMapping {
  if (!airtableFormat) return { format: 'autre', type: 'autre' };

  const exact = FORMAT_MAP[airtableFormat];
  if (exact) return exact;

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
