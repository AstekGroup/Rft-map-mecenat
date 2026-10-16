import type { EventFilters } from '@/hooks/useEvents';
import { isDateFilterActive } from '@/utils/eventDateRange';

export function countActiveFilters(filters: EventFilters): number {
  return (
    Number(Boolean(filters.search.trim())) +
    Number(Boolean(filters.postalCode.trim())) +
    filters.regions.length +
    filters.types.length +
    filters.audiences.length +
    filters.partners.length +
    filters.themes.length +
    Number(isDateFilterActive(filters.dateFilter, filters.dateFrom)) +
    Number(filters.modality !== 'all') +
    Number(filters.showPastEvents)
  );
}