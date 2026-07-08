/**
 * Utilitaires de mapping entre les valeurs Baserow et les types internes (La Grande Semaine Végétale).
 */

import type {
  EventType,
  EventFormat,
  TargetAudience,
  EventModality,
  EventTheme,
} from '@make-map/types';
import { BaserowAttachment, BaserowSelect } from './baserow.types';

// ============================================================
// Mapping Thématique Baserow -> EventTheme[]
// ============================================================

const THEME_MAP: Record<string, EventTheme> = {
  'Cuisine végétale': 'cuisine-vegetale',
  'Santé & nutrition': 'sante-nutrition',
  Biodiversité: 'biodiversite',
  Agriculture: 'agriculture',
  'Climat & environnement': 'climat-environnement',
  Autres: 'autre',
};

export function mapThemes(
  baserowThemes: BaserowSelect[] | undefined,
): EventTheme[] {
  if (!baserowThemes || baserowThemes.length === 0) return ['autre'];

  const mapped = baserowThemes
    .map((t) => {
      const exact = THEME_MAP[t.value];
      if (exact) return exact;

      const lower = t.value.toLowerCase();
      if (
        lower.includes('cuisine') ||
        lower.includes('végétal') ||
        lower.includes('culinaire')
      )
        return 'cuisine-vegetale';
      if (lower.includes('santé') || lower.includes('nutrition'))
        return 'sante-nutrition';
      if (lower.includes('biodiv')) return 'biodiversite';
      if (lower.includes('agri') || lower.includes('agro'))
        return 'agriculture';
      if (
        lower.includes('climat') ||
        lower.includes('environ') ||
        lower.includes('éco')
      )
        return 'climat-environnement';

      return 'autre';
    })
    .filter((t): t is EventTheme => t !== null);

  return [...new Set(mapped)]; // Remove duplicates
}

// ============================================================
// Mapping Format Baserow -> EventFormat + EventType
// ============================================================

interface FormatMapping {
  format: EventFormat;
  type: EventType;
}

const FORMAT_MAP: Record<string, FormatMapping> = {
  'Atelier de cuisine': { format: 'atelier-cuisine', type: 'atelier-cuisine' },
  'Dégustation ou menu végétal': { format: 'degustation', type: 'degustation' },
  'Visite de jardin / potager ou cueillette': {
    format: 'visite-jardin',
    type: 'visite-jardin',
  },
  'Atelier pédagogique ou formation': {
    format: 'atelier-pedagogique',
    type: 'atelier-pedagogique',
  },
  'Conférence/webinaire/table-ronde': {
    format: 'conference',
    type: 'conference',
  },
  Festival: { format: 'festival', type: 'festival' },
  Autres: { format: 'autre', type: 'autre' },
};

export function mapFormat(
  baserowFormat: BaserowSelect | undefined,
): FormatMapping {
  if (!baserowFormat) return { format: 'autre', type: 'autre' };

  const exact = FORMAT_MAP[baserowFormat.value];
  if (exact) return exact;

  return { format: 'autre', type: 'autre' };
}

// ============================================================
// Mapping Public Baserow -> TargetAudience[]
// ============================================================

const AUDIENCE_MAP: Record<string, TargetAudience> = {
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

export function mapTargetAudience(
  baserowPublic: BaserowSelect[] | undefined,
): TargetAudience[] {
  if (!baserowPublic || baserowPublic.length === 0) return ['tout-public'];

  const mapped = baserowPublic
    .map((p) => {
      const exact = AUDIENCE_MAP[p.value];
      if (exact) return exact;

      const lower = p.value.toLowerCase();
      if (lower.includes('tout public')) return 'tout-public';
      if (lower.includes('famille') || lower.includes('enfant'))
        return 'familles-enfants';
      if (
        lower.includes('colier') ||
        lower.includes('tudiant') ||
        lower.includes('scolaire')
      )
        return 'scolaires';
      if (lower.includes('salari') || lower.includes('entreprise'))
        return 'salaries-entreprise';
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
  baserowType: BaserowSelect | undefined,
): EventModality {
  if (!baserowType) return 'presentiel';

  const exact = MODALITY_MAP[baserowType.value];
  if (exact) return exact;

  const lower = baserowType.value.toLowerCase();
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

const WEEK_START = new Date('2026-09-25T00:00:00.000Z');
const WEEK_END = new Date('2026-10-04T23:59:59.999Z');

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

export function parseDateTime(dateTimeString: string | undefined): {
  date: string;
  time: string;
} {
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
