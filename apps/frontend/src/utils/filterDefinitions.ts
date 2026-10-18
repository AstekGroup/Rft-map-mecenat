import type { LucideIcon } from 'lucide-react';
import { BookOpen, Calendar, Globe, Handshake, Hash, MapPin, Tag, Users } from 'lucide-react';
import type { EventFilterControls, EventFilters } from '@/hooks/useEvents';
import type { LinkedTableRow } from '@/types/event';
import { isDateFilterActive } from '@/utils/eventDateRange';

/**
 * Définition unique des filtres, partagée par le panneau de la carte (`FilterPanel`) et la barre
 * de la liste (`EventFiltersBar`) : mêmes filtres, même ordre, mêmes titres, mêmes règles
 * d'affichage. Ajouter ou retirer un filtre se fait ici, pas dans les écrans.
 * Seule exception : un filtre peut être réservé à un écran via `surfaces` (la modalité n'a pas d'objet
 * sur la carte : les événements en ligne n'y ont pas de position).
 * (La recherche texte et le bouton « événements passés » sont hors liste : les deux écrans les affichent toujours.)
 */
export type FilterId =
  | 'modality'
  | 'date'
  | 'partners'
  | 'format'
  | 'themes'
  | 'audiences'
  | 'postalCode'
  | 'region';

/** Listes d'options issues de Baserow (référentiels). */
export interface FilterReferences {
  partners: LinkedTableRow[];
  formats: LinkedTableRow[];
  themes: LinkedTableRow[];
  publics: LinkedTableRow[];
}

export type ReferenceKey = keyof FilterReferences;

/** Écran qui affiche les filtres : panneau de la carte ou barre de la liste. */
export type FilterSurface = 'panel' | 'bar';

export interface FilterDefinition {
  id: FilterId;
  /** Écrans qui proposent ce filtre ; absent = les deux. */
  surfaces?: readonly FilterSurface[];
  /** Titre du groupe (wording générique de l'interface). */
  title: string;
  icon: LucideIcon;
  /** Référentiel Baserow qui fournit les options ; le filtre se masque de lui-même si ce référentiel est vide. */
  reference?: ReferenceKey;
  /** Filtre sans objet pour cette modalité (ex. code postal pour un événement en ligne) : masqué tant qu'il n'est pas utilisé. */
  hiddenForModality?: EventFilters['modality'];
  /** Nombre de valeurs sélectionnées (0 = filtre inactif). */
  activeCount: (filters: EventFilters) => number;
}

export const FILTER_DEFINITIONS: readonly FilterDefinition[] = [
  {
    id: 'modality',
    title: 'Modalité',
    surfaces: ['bar'],
    icon: Globe,
    activeCount: (f) => Number(f.modality !== 'all'),
  },
  {
    id: 'date',
    title: 'Période',
    icon: Calendar,
    activeCount: (f) => Number(isDateFilterActive(f.dateFilter, f.dateFrom)),
  },
  {
    id: 'partners',
    title: 'Partenaires',
    icon: Handshake,
    reference: 'partners',
    activeCount: (f) => f.partners.length,
  },
  {
    id: 'format',
    title: "Type d'événement",
    icon: Tag,
    reference: 'formats',
    activeCount: (f) => f.types.length,
  },
  {
    id: 'themes',
    title: 'Thématiques',
    icon: BookOpen,
    reference: 'themes',
    activeCount: (f) => f.themes.length,
  },
  {
    id: 'audiences',
    title: 'Public cible',
    icon: Users,
    reference: 'publics',
    activeCount: (f) => f.audiences.length,
  },
  {
    id: 'postalCode',
    title: 'Code postal',
    icon: Hash,
    hiddenForModality: 'distanciel',
    activeCount: (f) => Number(Boolean(f.postalCode.trim())),
  },
  {
    id: 'region',
    title: 'Région',
    icon: MapPin,
    hiddenForModality: 'distanciel',
    activeCount: (f) => f.regions.length,
  },
];

/**
 * Filtres à afficher sur un écran pour l'état courant : on retire ceux qui ne sont pas prévus pour
 * cet écran (`surfaces`), ceux dont le référentiel Baserow est vide et ceux qui n'ont pas de sens
 * pour la modalité choisie (sauf s'ils sont déjà actifs, pour qu'une sélection ne devienne jamais
 * invisible).
 *
 * Un référentiel `unavailable` (erreur de chargement) n'est PAS un référentiel vide : son filtre
 * reste affiché, avec un message (voir `FilterContent`), au lieu de disparaître sans explication.
 */
export function getVisibleFilters(
  surface: FilterSurface,
  filters: EventFilters,
  references: FilterReferences,
  unavailable: readonly ReferenceKey[] = [],
): FilterDefinition[] {
  return FILTER_DEFINITIONS.filter((definition) => {
    if (definition.surfaces && !definition.surfaces.includes(surface)) {
      return false;
    }
    if (
      definition.reference &&
      references[definition.reference].length === 0 &&
      !unavailable.includes(definition.reference)
    ) {
      return false;
    }
    if (
      definition.hiddenForModality === filters.modality &&
      definition.activeCount(filters) === 0
    ) {
      return false;
    }
    return true;
  });
}

/** Même chose à partir des `controls` que reçoivent les écrans de filtres. */
export function getVisibleFiltersFor(
  surface: FilterSurface,
  controls: EventFilterControls,
): FilterDefinition[] {
  return getVisibleFilters(
    surface,
    controls.filters,
    {
      partners: controls.availablePartners,
      formats: controls.availableFormats,
      themes: controls.availableThemes,
      publics: controls.availablePublics,
    },
    controls.unavailableReferences,
  );
}

/** Nombre de filtres actifs dans les définitions communes (hors recherche et événements passés). */
export function countDefinedFilters(filters: EventFilters): number {
  return FILTER_DEFINITIONS.reduce((total, definition) => total + definition.activeCount(filters), 0);
}
