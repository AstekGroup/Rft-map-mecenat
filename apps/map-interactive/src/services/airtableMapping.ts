/**
 * Utilitaires de mapping entre les valeurs Airtable et les types internes.
 * 
 * La table Airtable utilise des labels en français (ex: "Conférence / Table-ronde / Débat")
 * alors que l'application utilise des slugs (ex: "conference").
 * Ce module fait le pont entre les deux.
 */

import { EventType, EventFormat, TargetAudience, EventModality } from '@/types/event';

// ============================================================
// Mapping Format Airtable -> EventFormat + EventType
// ============================================================

interface FormatMapping {
  format: EventFormat;
  type: EventType;
}

const FORMAT_MAP: Record<string, FormatMapping> = {
  'Conférence / Table-ronde / Débat': { format: 'conference', type: 'conference' },
  'Atelier / Café IA': { format: 'cafe-ia', type: 'cafe-ia' },
  'Formation / Sensibilisation': { format: 'formation', type: 'atelier' },
  'Jeu / Hackathon': { format: 'autre', type: 'jeu' },
  'Atelier': { format: 'atelier', type: 'atelier' },
  'Café IA': { format: 'cafe-ia', type: 'cafe-ia' },
  'Conférence': { format: 'conference', type: 'conference' },
  'Débat': { format: 'debat', type: 'conference' },
  'Formation': { format: 'formation', type: 'atelier' },
  'Visite guidée / Portes ouvertes': { format: 'visite', type: 'autre' },
  'Ciné-débat / Exposition / Festival': { format: 'cine-debat', type: 'autre' },
  'Prise en main d\'outil': { format: 'prise-en-main', type: 'atelier' },
};

/**
 * Mappe un format Airtable vers EventFormat et EventType internes
 */
export function mapFormat(airtableFormat: string | undefined): FormatMapping {
  if (!airtableFormat) return { format: 'autre', type: 'autre' };
  
  // Recherche exacte
  const exact = FORMAT_MAP[airtableFormat];
  if (exact) return exact;

  // Recherche partielle (insensible à la casse)
  const lower = airtableFormat.toLowerCase();
  for (const [key, value] of Object.entries(FORMAT_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value;
    }
  }

  // Fallback
  console.warn(`[AirtableMapping] Format inconnu: "${airtableFormat}"`);
  return { format: 'autre', type: 'autre' };
}

// ============================================================
// Mapping Public Airtable -> TargetAudience[]
// ============================================================

const AUDIENCE_MAP: Record<string, TargetAudience> = {
  'Tout public': 'tout-public',
  'Jeunes': 'jeunes',
  'Seniors': 'seniors',
  'Ecoliers / Etudiants': 'scolaire',
  'Écoliers / Étudiants': 'scolaire',
  'Personnes habitants dans des quartiers prioritaires de la ville': 'qpv',
  'Personnes porteuses d\'un handicap': 'handicap',
  'Salariés d\'une entreprise': 'salaries',
  'Adhérents d\'une structure': 'adherents',
};

/**
 * Mappe un tableau de publics Airtable vers TargetAudience[]
 */
export function mapTargetAudience(airtablePublic: string[] | undefined): TargetAudience[] {
  if (!airtablePublic || airtablePublic.length === 0) return ['tout-public'];

  const mapped = airtablePublic
    .map(p => {
      const exact = AUDIENCE_MAP[p];
      if (exact) return exact;

      // Recherche partielle
      const lower = p.toLowerCase();
      if (lower.includes('tout public')) return 'tout-public' as TargetAudience;
      if (lower.includes('jeune')) return 'jeunes' as TargetAudience;
      if (lower.includes('senior')) return 'seniors' as TargetAudience;
      if (lower.includes('colier') || lower.includes('tudiant') || lower.includes('scolaire')) return 'scolaire' as TargetAudience;
      if (lower.includes('quartier') || lower.includes('qpv')) return 'qpv' as TargetAudience;
      if (lower.includes('handicap')) return 'handicap' as TargetAudience;
      if (lower.includes('salari')) return 'salaries' as TargetAudience;
      if (lower.includes('adhérent') || lower.includes('adherent')) return 'adherents' as TargetAudience;

      console.warn(`[AirtableMapping] Public inconnu: "${p}"`);
      return null;
    })
    .filter((a): a is TargetAudience => a !== null);

  return mapped.length > 0 ? mapped : ['tout-public'];
}

// ============================================================
// Mapping Modalité (Type de l'événement Airtable -> EventModality)
// ============================================================

const MODALITY_MAP: Record<string, EventModality> = {
  'Présentiel': 'presentiel',
  'Distanciel': 'distanciel',
  'En ligne': 'distanciel',
  'Hybride': 'presentiel', // Par défaut présentiel pour les hybrides
};

/**
 * Mappe le "Type de l'événement" Airtable vers EventModality
 */
export function mapModality(airtableType: string | undefined): EventModality {
  if (!airtableType) return 'presentiel';

  const exact = MODALITY_MAP[airtableType];
  if (exact) return exact;

  const lower = airtableType.toLowerCase();
  if (lower.includes('distanciel') || lower.includes('en ligne') || lower.includes('visio')) {
    return 'distanciel';
  }

  return 'presentiel';
}

// ============================================================
// Extraction image depuis attachement Airtable
// ============================================================

export interface AirtableAttachment {
  id: string;
  width?: number;
  height?: number;
  url: string;
  filename: string;
  size: number;
  type: string;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
}

/**
 * Extrait l'URL de l'image depuis un tableau d'attachements Airtable.
 * Préfère le thumbnail large, sinon l'URL directe.
 */
export function extractImageUrl(attachments: AirtableAttachment[] | undefined): string | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  
  const first = attachments[0];
  // Préférer le thumbnail large pour de meilleures performances
  return first.thumbnails?.large?.url || first.url;
}

// ============================================================
// Calcul isDuringWeek
// ============================================================

// La grande semaine végétale : 25 septembre au 4 octobre 2026
const WEEK_START = new Date('2026-09-25T00:00:00.000Z');
const WEEK_END = new Date('2026-10-04T23:59:59.999Z');

/**
 * Vérifie si une date tombe pendant la Semaine de l'IA pour Tous (18-24 mai 2026)
 */
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
// Parsing DateTime Airtable
// ============================================================

/**
 * Parse un DateTime Airtable (ISO 8601) en date et heure séparées
 * Input: "2026-05-20T12:00:00.000Z"
 * Output: { date: "2026-05-20", time: "14:00" } (heure locale FR = UTC+2)
 */
export function parseAirtableDateTime(dateTimeString: string | undefined): { date: string; time: string } {
  if (!dateTimeString) return { date: '', time: '' };

  try {
    const dt = new Date(dateTimeString);
    if (isNaN(dt.getTime())) return { date: '', time: '' };

    // Formater en heure locale française
    const date = dt.toLocaleDateString('fr-CA'); // format YYYY-MM-DD
    const time = dt.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });

    return { date, time };
  } catch {
    return { date: '', time: '' };
  }
}

// ============================================================
// Construction du contact organisateur
// ============================================================

/**
 * Construit le nom complet de l'animateur depuis les champs séparés
 */
export function buildOrganizerContact(
  firstName: string | undefined,
  lastName: string | undefined
): string | undefined {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * Construit les informations d'accessibilité depuis le tableau de modalités
 */
export function buildAccessibilityInfo(
  accessModalities: string[] | undefined
): string | undefined {
  if (!accessModalities || accessModalities.length === 0) return undefined;
  return accessModalities.join(', ');
}
