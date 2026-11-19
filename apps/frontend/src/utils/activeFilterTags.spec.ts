import { describe, expect, it, vi } from 'vitest';
import type { EventFilterControls, EventFilters } from '@/hooks/useEvents';
import type { ConfigHelpers } from '@/hooks/useConfig';
import { HIGHLIGHT_LABEL } from '@/utils/highlight';
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

/** Helpers sans le mode « pendant l’événement » : pour tester le repli de libellé. */
const helpersSansModes = {
  ...helpers,
  getDateFilterModes: () => [],
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

    // Libellé inverse : le défaut montre les passés, l'utilisateur les a masqués.
    const masques = makeControls({ showPastEvents: false }, { defaultShowPastEvents: true });
    const tagMasques = getActiveFilterTags(masques, helpers)[0];
    expect(tagMasques).toMatchObject({ key: 'pastEvents', label: 'Sans les événements passés' });
    tagMasques.onRemove();
    expect(masques.onUpdateFilters).toHaveBeenCalledWith({ showPastEvents: true });
  });

  it('propose une pastille « Coup de cœur » retirable', () => {
    const controls = makeControls({ highlightOnly: true });
    const tags = getActiveFilterTags(controls, helpers);

    expect(tags.map((t) => t.key)).toEqual(['highlightOnly']);
    expect(tags[0].label).toBe(HIGHLIGHT_LABEL);
    tags[0].onRemove();
    expect(controls.onUpdateFilters).toHaveBeenCalledWith({ highlightOnly: false });
  });

  it('libelle les dates personnalisées et les réinitialise', () => {
    const controls = makeControls({ dateFilter: 'custom', dateFrom: '2026-06-10', dateTo: '2026-06-12' });
    const tags = getActiveFilterTags(controls, helpers);

    expect(tags.map((t) => t.key)).toEqual(['date']);
    expect(tags[0].label).toContain('10 juin 2026');
    expect(tags[0].label).toContain('12 juin 2026');
    tags[0].onRemove();
    expect(controls.onUpdateFilters).toHaveBeenCalledWith({ dateFilter: 'all', dateFrom: '', dateTo: '' });
  });

  it('libelle « pendant l’événement » depuis la config, avec un repli lisible si le mode est absent', () => {
    const controls = makeControls({ dateFilter: 'during-week' });

    expect(getActiveFilterTags(controls, helpers)[0].label).toBe('Pendant l’événement');

    const tags = getActiveFilterTags(controls, helpersSansModes);
    expect(tags[0].label).toBe("Période de l'événement");
    tags[0].onRemove();
    expect(controls.onUpdateFilters).toHaveBeenCalledWith({ dateFilter: 'all', dateFrom: '', dateTo: '' });
  });

  it('libelle les référentiels par leur nom et retombe sur l’identifiant si l’option a disparu', () => {
    const controls = makeControls(
      { types: ['f1', 'f2'], themes: ['t1'], partners: ['p1'], audiences: ['a1'] },
      {
        availableFormats: [{ id: 'f1', name: 'Atelier' }],
        availableThemes: [{ id: 't1', name: 'Biodiversité' }],
        availablePartners: [{ id: 'p1', name: 'Maison de la nature' }],
        availablePublics: [{ id: 'a1', name: 'Familles' }],
      },
    );
    const tags = getActiveFilterTags(controls, helpers);

    expect(tags.map((t) => t.key)).toEqual([
      'type-f1',
      'type-f2',
      'theme-t1',
      'partner-p1',
      'audience-a1',
    ]);
    // « f2 » n'est plus dans le référentiel chargé : l'identifiant reste affiché plutôt qu'un vide.
    expect(tags.map((t) => t.label)).toEqual([
      'Atelier',
      'f2',
      'Biodiversité',
      'Maison de la nature',
      'Familles',
    ]);

    tags.find((t) => t.key === 'type-f1')?.onRemove();
    expect(controls.onToggleType).toHaveBeenCalledWith('f1');
    tags.find((t) => t.key === 'theme-t1')?.onRemove();
    expect(controls.onToggleTheme).toHaveBeenCalledWith('t1');
    tags.find((t) => t.key === 'partner-p1')?.onRemove();
    expect(controls.onTogglePartner).toHaveBeenCalledWith('p1');
    tags.find((t) => t.key === 'audience-a1')?.onRemove();
    expect(controls.onToggleAudience).toHaveBeenCalledWith('a1');
  });

  it('affiche le code postal et le retire', () => {
    const controls = makeControls({ postalCode: '29200' });
    const tags = getActiveFilterTags(controls, helpers);

    expect(tags.map((t) => t.key)).toEqual(['postalCode']);
    expect(tags[0].label).toBe('CP : 29200');
    tags[0].onRemove();
    expect(controls.onUpdateFilters).toHaveBeenCalledWith({ postalCode: '' });
  });

  it('tronque les recherches longues à 28 caractères, sans toucher les courtes', () => {
    const longue = 'a'.repeat(40);
    expect(getActiveFilterTags(makeControls({ search: longue }), helpers)[0].label).toBe(
      `Recherche : « ${'a'.repeat(27)}… »`,
    );

    const exacte = 'b'.repeat(28);
    expect(getActiveFilterTags(makeControls({ search: exacte }), helpers)[0].label).toBe(
      `Recherche : « ${exacte} »`,
    );
  });

  it('garde un ordre stable et prévisible quand tous les filtres sont actifs', () => {
    const controls = makeControls(
      {
        highlightOnly: true,
        showPastEvents: true,
        modality: 'distanciel',
        search: 'vélo',
        dateFilter: 'custom',
        dateFrom: '2026-06-10',
        dateTo: '2026-06-12',
        types: ['f1'],
        themes: ['t1'],
        partners: ['p1'],
        audiences: ['a1'],
        regions: ['Bretagne'],
        postalCode: '29200',
      },
      {
        availableFormats: [{ id: 'f1', name: 'Atelier' }],
        availableThemes: [{ id: 't1', name: 'Biodiversité' }],
        availablePartners: [{ id: 'p1', name: 'Maison de la nature' }],
        availablePublics: [{ id: 'a1', name: 'Familles' }],
      },
    );

    expect(getActiveFilterTags(controls, helpers).map((t) => t.key)).toEqual([
      'highlightOnly',
      'pastEvents',
      'modality',
      'search',
      'date',
      'type-f1',
      'theme-t1',
      'partner-p1',
      'audience-a1',
      'region-Bretagne',
      'postalCode',
    ]);
  });
});
