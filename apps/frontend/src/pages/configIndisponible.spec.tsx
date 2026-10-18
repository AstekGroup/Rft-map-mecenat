import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfigContext, buildHelpers, type ConfigContextValue } from '@/hooks/useConfig';
import type { AppConfig } from '@/types/event';
import { MapPage } from './MapPage';
import { EventsListPage } from './EventsListPage';

/** Cas dégradé : `/api/config` indisponible sur la carte et la liste (même état d'erreur que l'accueil). */

vi.mock('@/hooks', () => ({
  useEvents: () => ({
    allEvents: [],
    events: [],
    geojson: { type: 'FeatureCollection', features: [] },
    loading: false,
    error: null,
    controls: {
      filters: { search: '', modality: 'all' },
      onUpdateFilters: vi.fn(),
      onResetFilters: vi.fn(),
    },
    stats: { filtered: 0, total: 0 },
  }),
}));
// MapLibre n'est pas exécutable dans jsdom : les écrans enfants sont remplacés par des repères.
vi.mock('@/components/Map', () => ({
  MapView: () => <div data-testid="map-view" />,
}));
vi.mock('@/components/Map/SearchOverlay', () => ({
  SearchOverlay: () => <div data-testid="search-overlay" />,
}));
vi.mock('@/components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));
vi.mock('@/components/Events', () => ({
  EventListView: () => <div data-testid="event-list" />,
  EventFiltersBar: () => <div data-testid="event-filters" />,
}));

const config = {
  profile: 'test',
  app: {
    name: 'Événement de test',
    shortName: 'EDT',
    description: '',
    eventDates: { weekStart: '2027-03-01', weekEnd: '2027-03-07' },
  },
  texts: {},
} as unknown as AppConfig;

function renderWithConfig(ui: React.ReactNode, value: Partial<ConfigContextValue>) {
  const cfg = value.config === undefined ? config : value.config;
  return render(
    <ConfigContext.Provider
      value={{ config: cfg, loading: false, error: null, helpers: buildHelpers(cfg), ...value }}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </ConfigContext.Provider>,
  );
}

describe.each([
  { label: 'MapPage', page: <MapPage />, content: ['map-view', 'sidebar', 'search-overlay'] },
  { label: 'EventsListPage', page: <EventsListPage />, content: ['event-list', 'event-filters'] },
])('$label : /api/config indisponible', ({ page, content }) => {
  it("affiche un état d'erreur avec « Réessayer », sans le contenu de la page", () => {
    renderWithConfig(page, { config: null, error: new Error('Erreur API config: 500') });

    expect(screen.getByRole('alert')).toHaveTextContent('La carte est momentanément indisponible');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    for (const testId of content) expect(screen.queryByTestId(testId)).toBeNull();
    // Ni message technique brut ni clé de texte.
    expect(document.body.textContent).not.toContain('Erreur API config');
  });

  it('traite une config absente sans erreur posée comme une erreur (pas de page vide)', () => {
    renderWithConfig(page, { config: null });

    expect(screen.getByRole('alert')).toBeTruthy();
    for (const testId of content) expect(screen.queryByTestId(testId)).toBeNull();
  });

  it('affiche un chargement, et non une erreur, tant que la config se charge', () => {
    renderWithConfig(page, { config: null, loading: true });

    expect(screen.queryByRole('alert')).toBeNull();
    for (const testId of content) expect(screen.queryByTestId(testId)).toBeNull();
  });

  it('affiche la page quand la config est chargée', () => {
    renderWithConfig(page, {});

    expect(screen.queryByRole('alert')).toBeNull();
    for (const testId of content) expect(screen.getByTestId(testId)).toBeTruthy();
  });
});
