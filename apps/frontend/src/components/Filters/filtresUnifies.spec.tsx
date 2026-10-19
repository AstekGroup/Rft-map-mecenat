import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventFilterControls, EventFilters } from '@/hooks';
import type { LinkedTableRow } from '@/types/event';
import { FILTER_DEFINITIONS, getVisibleFilters, type FilterId } from '@/utils/filterDefinitions';
import { EventFiltersBar } from '@/components/Events/EventFiltersBar';
import { FilterPanel } from './FilterPanel';
import { SEARCH_PLACEHOLDER, UNAVAILABLE_LIST_MESSAGE } from './FilterContent';

const defaultFilters: EventFilters = {
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
};

const rows = (prefix: string): LinkedTableRow[] => [
  { id: `${prefix}1`, name: `${prefix} un` },
  { id: `${prefix}2`, name: `${prefix} deux` },
];

function makeControls(overrides: Partial<EventFilterControls> = {}): EventFilterControls {
  return {
    filters: defaultFilters,
    defaultShowPastEvents: false,
    onUpdateFilters: vi.fn(),
    onToggleRegion: vi.fn(),
    onToggleType: vi.fn(),
    onToggleTheme: vi.fn(),
    onTogglePartner: vi.fn(),
    onToggleAudience: vi.fn(),
    onResetFilters: vi.fn(),
    availablePartners: rows('partenaire'),
    availableThemes: rows('thème'),
    availableFormats: rows('format'),
    availablePublics: rows('public'),
    unavailableReferences: [],
    ...overrides,
  };
}

const titleOf = (id: FilterId) => FILTER_DEFINITIONS.find((d) => d.id === id)!.title;

/** Le filtre `id` est-il proposé sur l'écran « panneau de la carte » ? (un accordéon par filtre) */
function panelShows(id: FilterId): boolean {
  return screen.queryByRole('button', { name: new RegExp(`^${titleOf(id)}`) }) !== null;
}

/** Le filtre `id` est-il proposé sur l'écran « barre de la liste » ? (modalité et code postal s'affichent en ligne) */
function barShows(id: FilterId): boolean {
  if (id === 'modality') return screen.queryByRole('button', { name: 'En ligne' }) !== null;
  if (id === 'postalCode') return screen.queryByPlaceholderText('Code postal') !== null;
  return screen.queryByRole('button', { name: new RegExp(`^${titleOf(id)}`) }) !== null;
}

const ALL_IDS = FILTER_DEFINITIONS.map((d) => d.id);
/** Modalité n'est proposée que par la barre de la liste (surfaces: ['bar']). */
const PANEL_IDS = ALL_IDS.filter((id) => id !== 'modality');
const withoutModality = (ids: FilterId[]) => ids.filter((id) => id !== 'modality');

function shownOn(screenName: 'panel' | 'bar', controls: EventFilterControls): FilterId[] {
  const { unmount } = render(
    screenName === 'panel' ? <FilterPanel controls={controls} /> : <EventFiltersBar controls={controls} />,
  );
  const test = screenName === 'panel' ? panelShows : barShows;
  const ids = ALL_IDS.filter(test);
  unmount();
  return ids;
}

describe('filtres unifiés (panneau de la carte et barre de la liste)', () => {
  it('proposent les mêmes filtres quand tous les référentiels sont remplis, à Modalité près', () => {
    const controls = makeControls();
    const panel = shownOn('panel', controls);
    const bar = shownOn('bar', controls);

    expect(panel).toEqual(PANEL_IDS);
    expect(bar).toEqual(ALL_IDS);
    expect(withoutModality(bar)).toEqual(panel);
  });

  it("le panneau n'affiche pas Modalité, la barre l'affiche", () => {
    const controls = makeControls();
    expect(shownOn('panel', controls)).not.toContain('modality');
    expect(shownOn('bar', controls)).toContain('modality');
  });

  it("le panneau n'affiche pas Modalité même quand elle est déjà utilisée (la carte ne la propose pas)", () => {
    const controls = makeControls({ filters: { ...defaultFilters, modality: 'distanciel' } });
    expect(shownOn('panel', controls)).not.toContain('modality');
    expect(shownOn('bar', controls)).toContain('modality');
  });

  it('masquent les mêmes filtres quand un référentiel Baserow est vide, sans lier un filtre à un autre', () => {
    // Thématiques remplies, formats vides : la barre masquait à tort les thématiques.
    const controls = makeControls({ availableFormats: [], availablePartners: [] });
    const panel = shownOn('panel', controls);
    const bar = shownOn('bar', controls);

    expect(panel).toContain('themes');
    expect(panel).not.toContain('format');
    expect(panel).not.toContain('partners');
    expect(withoutModality(bar)).toEqual(panel);
  });

  it('masquent les mêmes filtres pour la modalité « en ligne » (code postal et région sans objet)', () => {
    const controls = makeControls({ filters: { ...defaultFilters, modality: 'distanciel' } });
    const panel = shownOn('panel', controls);
    const bar = shownOn('bar', controls);

    expect(panel).not.toContain('postalCode');
    expect(panel).not.toContain('region');
    expect(withoutModality(bar)).toEqual(panel);
  });

  it('gardent visible un filtre déjà utilisé même quand la modalité le rend sans objet', () => {
    const controls = makeControls({
      filters: { ...defaultFilters, modality: 'distanciel', regions: ['Bretagne'] },
    });
    const panel = shownOn('panel', controls);
    const bar = shownOn('bar', controls);

    expect(panel).toContain('region');
    expect(panel).not.toContain('postalCode');
    expect(withoutModality(bar)).toEqual(panel);
  });

  it('gardent affiché, sur les deux écrans, un filtre dont le référentiel est en erreur (≠ vide)', () => {
    const controls = makeControls({
      availableFormats: [],
      availablePartners: [],
      unavailableReferences: ['formats'],
    });
    const panel = shownOn('panel', controls);
    const bar = shownOn('bar', controls);

    expect(panel).toContain('format'); // en erreur : visible avec un message
    expect(panel).not.toContain('partners'); // vide : masqué
    expect(withoutModality(bar)).toEqual(panel);
  });

  it.each([
    ['panel', (c: EventFilterControls) => <FilterPanel controls={c} />],
    ['bar', (c: EventFilterControls) => <EventFiltersBar controls={c} />],
  ] as const)(
    'expliquent que la liste est indisponible (%s) au lieu de n’afficher aucune option',
    async (_name, build) => {
      const controls = makeControls({ availableFormats: [], unavailableReferences: ['formats'] });
      render(build(controls));

      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${titleOf('format')}`) }));

      expect(screen.getByText(UNAVAILABLE_LIST_MESSAGE)).toBeInTheDocument();
    },
  );

  it('ont le même champ de recherche', () => {
    const controls = makeControls();
    const panel = render(<FilterPanel controls={controls} />);
    expect(panel.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
    panel.unmount();

    const bar = render(<EventFiltersBar controls={controls} />);
    expect(bar.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
  });
});

describe('getVisibleFilters', () => {
  const full = {
    partners: rows('p'),
    formats: rows('f'),
    themes: rows('t'),
    publics: rows('a'),
  };

  it('garde l\'ordre de FILTER_DEFINITIONS et tous les filtres de la barre si tout est rempli', () => {
    expect(getVisibleFilters(defaultFilters, full, 'bar').map((d) => d.id)).toEqual(ALL_IDS);
  });

  it('retire Modalité du panneau et la garde dans la barre (surfaces)', () => {
    expect(getVisibleFilters(defaultFilters, full, 'panel').map((d) => d.id)).toEqual(PANEL_IDS);
    expect(getVisibleFilters(defaultFilters, full, 'bar').map((d) => d.id)).toContain('modality');
  });

  it('retire un filtre dont le référentiel est vide', () => {
    const ids = getVisibleFilters(defaultFilters, { ...full, publics: [] }, 'panel').map((d) => d.id);
    expect(ids).not.toContain('audiences');
    expect(ids).toContain('themes');
  });

  it('garde un filtre dont le référentiel est vide parce qu’il est en erreur', () => {
    const ids = getVisibleFilters(defaultFilters, { ...full, publics: [] }, 'panel', ['publics']).map((d) => d.id);
    expect(ids).toContain('audiences');
  });
});
