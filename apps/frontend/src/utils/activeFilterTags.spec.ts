import { describe, expect, it, vi } from 'vitest';
import type { EventFilterControls, EventFilters } from '@/hooks/useEvents';
import type { ConfigHelpers } from '@/hooks/useConfig';
import { getActiveFilterTags } from './activeFilterTags';

const baseFilters: EventFilters = {
  search: '',
  dateFilter: 'all',
  dateFrom: '',
  dateTo: '',
  regions: [],
  types: [],
  themes: [],
  partners: [],
  audiences: [],
  postalCode: '',
  modality: 'all',
  showPastEvents: false,
  highlightOnly: false,
};

const helpers = {
  getEnumLabel: (_category: string, id: string) => (id === 'distanciel' ? 'À distance' : id),
  getRegionGroups: () => ({ metropole: [], domtom: [] }),
  getEventName: () => 'Carte test',
  getEditionBadge: () => '',
  getDateFilterModes: () => [{ mode: 'during-week', label: 'Pendant l’événement' }],
} as ConfigHelpers;

function makeControls(overrides: Partial<EventFilters>, extra: Partial<EventFilterControls> = {}): EventFilterControls {
  return {
    filters: { ...baseFilters, ...overrides },
    defaultShowPastEvents: false,
    onUpdateFilters: vi.fn(),
    onToggleRegion: vi.fn(),
    onToggleType: vi.fn(),
    onToggleTheme: vi.fn(),
    onTogglePartner: vi.fn(),
    onToggleAudience: vi.fn(),
    onResetFilters: vi.fn(),
    availablePartners: [],
    availableThemes: [],
    availableFormats: [],
    availablePublics: [],
    hasHighlightedEvents: false,
    unavailableReferences: [],
    ...extra,
  } as EventFilterControls;
}

describe('getActiveFilterTags', () => {
  it('retourne une pastille supprimable pour la recherche, la modalité et la région', () => {
    const controls = makeControls({
      search: 'atelier vélo',
      modality: 'distanciel',
      regions: ['Bretagne'],
    });
    const tags = getActiveFilterTags(controls, helpers);

    expect(tags.map((t) => t.key)).toEqual(['modality', 'search', 'region-Bretagne']);
    expect(tags.find((t) => t.key === 'search')?.label).toBe('Recherche : « atelier vélo »');
    expect(tags.find((t) => t.key === 'modality')?.label).toBe('À distance');

    tags.find((t) => t.key === 'search')?.onRemove();
    expect(controls.onUpdateFilters).toHaveBeenCalledWith({ search: '' });
    tags.find((t) => t.key === 'modality')?.onRemove();
    expect(controls.onUpdateFilters).toHaveBeenCalledWith({ modality: 'all' });
    tags.find((t) => t.key === 'region-Bretagne')?.onRemove();
    expect(controls.onToggleRegion).toHaveBeenCalledWith('Bretagne');
  });

  it("n'ajoute la pastille événements passés qu'en cas d'écart avec le défaut", () => {
    expect(getActiveFilterTags(makeControls({ showPastEvents: false }), helpers)).toHaveLength(0);

    const controls = makeControls({ showPastEvents: true }, { defaultShowPastEvents: false });
    const tags = getActiveFilterTags(controls, helpers);
    expect(tags).toHaveLength(1);
    expect(tags[0]).toMatchObject({ key: 'pastEvents', label: 'Événements passés' });
    tags[0].onRemove();
    expect(controls.onUpdateFilters).toHaveBeenCalledWith({ showPastEvents: false });
  });
});
