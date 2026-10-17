import type { EventFilters } from '@/hooks/useEvents';
import type { Event } from '@/types/event';
import { eventIntersectsYmdRange } from '@/utils/eventDateRange';
import { countDefinedFilters } from '@/utils/filterDefinitions';

/**
 * Nombre total de filtres actifs : ceux de `FILTER_DEFINITIONS`, plus la recherche et les
 * événements passés. Ces derniers ne comptent que s'ils s'écartent de `defaultShowPastEvents`
 * (une fois l'événement terminé, les afficher est le défaut, pas un filtre).
 */
export function countActiveFilters(filters: EventFilters, defaultShowPastEvents = false): number {
  return (
    Number(Boolean(filters.search.trim())) +
    countDefinedFilters(filters) +
    Number(filters.showPastEvents !== defaultShowPastEvents)
  );
}

/** Recherche texte (casse ignorée) dans le titre, la description, la ville, l'organisateur, la région et le lieu. */
export function matchesSearch(event: Event, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [
    event.title,
    event.description,
    event.city,
    event.organizer,
    event.region,
    event.venueName,
  ].some((field) => !!field && field.toLowerCase().includes(needle));
}

/** L'événement est-il terminé avant `today` (date de fin, sinon date de début) ? */
export function isPastEvent(event: Event, today: Date): boolean {
  const end = new Date(event.endDate || event.date);
  end.setHours(23, 59, 59, 999);
  return end < today;
}

/** Applique tous les filtres à un événement. `today` : jour courant à minuit (injectable pour les tests). */
export function matchesFilters(event: Event, filters: EventFilters, today: Date): boolean {
  if (!filters.showPastEvents && isPastEvent(event, today)) return false;

  if (!matchesSearch(event, filters.search)) return false;

  if (filters.modality !== 'all' && event.modality !== filters.modality) return false;

  if (filters.dateFilter === 'during-week' && !event.isDuringWeek) return false;
  if (filters.dateFilter === 'custom' && filters.dateFrom) {
    const rangeStart = filters.dateFrom.slice(0, 10);
    const rangeEnd = (filters.dateTo || filters.dateFrom).slice(0, 10);
    if (!eventIntersectsYmdRange(event, rangeStart, rangeEnd)) return false;
  }

  if (filters.regions.length > 0 && !filters.regions.includes(event.region)) return false;

  if (filters.types.length > 0 && (!event.type || !filters.types.includes(event.type.id))) return false;

  if (filters.themes.length > 0) {
    if (!event.themes.some((theme) => theme && filters.themes.includes(theme.id))) return false;
  }

  if (filters.partners.length > 0) {
    if (!event.partners?.some((partner) => partner && filters.partners.includes(partner.id))) return false;
  }

  if (filters.audiences.length > 0) {
    if (!event.targetAudience?.some((audience) => audience && filters.audiences.includes(audience.id))) return false;
  }

  if (filters.postalCode && !event.postalCode.startsWith(filters.postalCode.trim())) return false;

  return true;
}
