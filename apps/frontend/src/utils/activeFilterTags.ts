import type { EventFilterControls } from '@/hooks/useEvents';
import type { ConfigHelpers } from '@/hooks/useConfig';
import { formatFrDateRangeLabel } from '@/utils/eventDateRange';
import { HIGHLIGHT_LABEL } from '@/utils/highlight';

export interface ActiveFilterTag {
  key: string;
  label: string;
  onRemove: () => void;
}

function truncate(text: string, max = 28): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/**
 * Construit la liste des pastilles de filtres actifs à partir des contrôles partagés.
 * Source unique pour la barre de la liste et la synthèse du panneau latéral.
 */
export function getActiveFilterTags(
  controls: EventFilterControls,
  helpers: ConfigHelpers,
): ActiveFilterTag[] {
  const {
    filters,
    defaultShowPastEvents,
    onUpdateFilters,
    onToggleType,
    onToggleTheme,
    onTogglePartner,
    onToggleAudience,
    onToggleRegion,
    availablePartners,
    availableThemes,
    availableFormats,
    availablePublics,
  } = controls;

  const tags: ActiveFilterTag[] = [];

  if (filters.highlightOnly) {
    tags.push({
      key: 'highlightOnly',
      label: HIGHLIGHT_LABEL,
      onRemove: () => onUpdateFilters({ highlightOnly: false }),
    });
  }

  // Seul un écart avec le défaut est un filtre : après l'événement, afficher les passés est normal.
  if (filters.showPastEvents !== defaultShowPastEvents) {
    tags.push({
      key: 'pastEvents',
      label: filters.showPastEvents ? 'Événements passés' : 'Sans les événements passés',
      onRemove: () => onUpdateFilters({ showPastEvents: defaultShowPastEvents }),
    });
  }

  if (filters.modality !== 'all') {
    tags.push({
      key: 'modality',
      label: helpers.getEnumLabel('modalities', filters.modality),
      onRemove: () => onUpdateFilters({ modality: 'all' }),
    });
  }

  const trimmedSearch = filters.search.trim();
  if (trimmedSearch) {
    tags.push({
      key: 'search',
      label: `Recherche : « ${truncate(trimmedSearch)} »`,
      onRemove: () => onUpdateFilters({ search: '' }),
    });
  }

  if (filters.dateFilter === 'custom' && filters.dateFrom) {
    tags.push({
      key: 'date',
      label: formatFrDateRangeLabel(filters.dateFrom, filters.dateTo),
      onRemove: () => onUpdateFilters({ dateFilter: 'all', dateFrom: '', dateTo: '' }),
    });
  } else if (filters.dateFilter === 'during-week') {
    const duringWeekMode = helpers.getDateFilterModes().find((m) => m.mode === 'during-week');
    tags.push({
      key: 'date',
      label: duringWeekMode?.label || "Période de l'événement",
      onRemove: () => onUpdateFilters({ dateFilter: 'all', dateFrom: '', dateTo: '' }),
    });
  }

  filters.types.forEach((typeId) => {
    const format = availableFormats.find((t) => t.id === typeId);
    tags.push({
      key: `type-${typeId}`,
      label: format?.name || typeId,
      onRemove: () => onToggleType(typeId),
    });
  });

  filters.themes.forEach((themeId) => {
    const theme = availableThemes.find((t) => t.id === themeId);
    tags.push({
      key: `theme-${themeId}`,
      label: theme?.name || themeId,
      onRemove: () => onToggleTheme(themeId),
    });
  });

  filters.partners.forEach((partnerId) => {
    const partner = availablePartners.find((p) => p.id === partnerId);
    tags.push({
      key: `partner-${partnerId}`,
      label: partner?.name || partnerId,
      onRemove: () => onTogglePartner(partnerId),
    });
  });

  filters.audiences.forEach((audienceId) => {
    const audience = availablePublics.find((p) => p.id === audienceId);
    tags.push({
      key: `audience-${audienceId}`,
      label: audience?.name || audienceId,
      onRemove: () => onToggleAudience(audienceId),
    });
  });

  filters.regions.forEach((region) => {
    tags.push({
      key: `region-${region}`,
      label: region,
      onRemove: () => onToggleRegion(region),
    });
  });

  if (filters.postalCode) {
    tags.push({
      key: 'postalCode',
      label: `CP : ${filters.postalCode}`,
      onRemove: () => onUpdateFilters({ postalCode: '' }),
    });
  }

  return tags;
}
