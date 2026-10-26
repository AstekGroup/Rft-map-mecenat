import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventFilterControls, EventFilters } from '@/hooks';
import { Sidebar } from './Sidebar';

vi.mock('@/hooks', () => ({
  useConfig: () => ({
    helpers: { getText: () => 'Carte test', getEventName: () => 'Carte test' },
  }),
}));
vi.mock('@/components/Map', () => ({}));
vi.mock('@/components/Filters/FilterPanel', () => ({ FilterPanel: () => <div>panneau de filtres</div> }));
vi.mock('./EventCard', () => ({ EventCard: () => <div>carte événement</div> }));

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
  highlightOnly: false,
};

function renderSidebar(filters: EventFilters = defaultFilters) {
  const controls = {
    filters,
    defaultShowPastEvents: false,
    onUpdateFilters: vi.fn(),
    onResetFilters: vi.fn(),
  } as unknown as EventFilterControls;

  return render(
    <Sidebar
      events={[]}
      controls={controls}
      selectedEvent={null}
      onSelectEvent={vi.fn()}
      hoveredEvent={null}
      onHoverEvent={vi.fn()}
      stats={{ total: 0, filtered: 0, duringWeek: 0 }}
    />,
  );
}

describe('Sidebar : onglet de réouverture', () => {
  it('replie le panneau et propose un onglet « Filtres & liste » sans pastille quand aucun filtre n’est actif', async () => {
    renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Fermer le panneau latéral' }));

    const onglet = screen.getByRole('button', { name: 'Ouvrir le panneau Filtres et liste' });
    expect(onglet).toHaveTextContent('Filtres & liste');
    expect(screen.queryByTestId('sidebar-tab-badge')).toBeNull();
  });

  it('affiche le nombre de filtres actifs dans la pastille de l’onglet', async () => {
    renderSidebar({ ...defaultFilters, regions: ['Bretagne', 'Normandie'], postalCode: '29200' });

    await userEvent.click(screen.getByRole('button', { name: 'Fermer le panneau latéral' }));

    expect(screen.getByTestId('sidebar-tab-badge')).toHaveTextContent('3');
    expect(
      screen.getByRole('button', { name: 'Ouvrir le panneau Filtres et liste (3 filtres actifs)' }),
    ).toBeInTheDocument();
  });

  it('rouvre le panneau au clic sur l’onglet', async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer le panneau latéral' }));

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir le panneau Filtres et liste' }));

    expect(screen.getByRole('button', { name: 'Fermer le panneau latéral' })).toBeInTheDocument();
  });
});
