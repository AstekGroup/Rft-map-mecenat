import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventFilterControls, EventFilters } from '@/hooks';
import { RESET_FILTERS_LABEL } from '@/utils/labels';
import { ActiveFilterTags } from './ActiveFilterTags';

// Le composant ne lit que deux helpers de config (libellés de modalité et de période).
vi.mock('@/hooks', () => ({
  useConfig: () => ({
    helpers: {
      getEnumLabel: (_category: string, id: string) => id,
      getDateFilterModes: () => [],
    },
  }),
}));

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

function makeControls(overrides: Partial<EventFilters> = {}): EventFilterControls {
  return {
    filters: { ...defaultFilters, ...overrides },
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
  } as EventFilterControls;
}

describe('ActiveFilterTags', () => {
  it('ne rend rien quand aucun filtre n’est actif', () => {
    const { container } = render(<ActiveFilterTags controls={makeControls()} />);

    expect(container.textContent).toBe('');
    expect(screen.queryByRole('button', { name: RESET_FILTERS_LABEL })).toBeNull();
  });

  it('affiche une pastille retirable par filtre actif et « Réinitialiser » réinitialise', async () => {
    const controls = makeControls({ search: 'vélo', regions: ['Bretagne'] });
    render(<ActiveFilterTags controls={controls} />);

    expect(
      screen.getByRole('button', { name: 'Retirer le filtre Recherche : « vélo »' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirer le filtre Bretagne' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: RESET_FILTERS_LABEL }));
    expect(controls.onResetFilters).toHaveBeenCalledTimes(1);
  });

  it('retire le bon filtre depuis la croix de sa pastille', async () => {
    const controls = makeControls({ search: 'vélo', regions: ['Bretagne'] });
    render(<ActiveFilterTags controls={controls} />);

    await userEvent.click(screen.getByRole('button', { name: 'Retirer le filtre Recherche : « vélo »' }));
    expect(controls.onUpdateFilters).toHaveBeenCalledWith({ search: '' });

    await userEvent.click(screen.getByRole('button', { name: 'Retirer le filtre Bretagne' }));
    expect(controls.onToggleRegion).toHaveBeenCalledWith('Bretagne');
  });

  it('masque « Réinitialiser » quand showClearAll est faux, mais garde les pastilles', () => {
    const controls = makeControls({ search: 'vélo' });
    render(<ActiveFilterTags controls={controls} showClearAll={false} />);

    expect(screen.queryByRole('button', { name: RESET_FILTERS_LABEL })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Retirer le filtre Recherche : « vélo »' }),
    ).toBeInTheDocument();
  });
});
