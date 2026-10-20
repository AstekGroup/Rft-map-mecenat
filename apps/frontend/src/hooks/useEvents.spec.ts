import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { useEvents } from './useEvents';
import { ConfigContext, buildHelpers } from './useConfig';
import * as api from '@/services/api';
import type { AppConfig, Event, LinkedTableRow } from '@/types/event';

vi.mock('@/services/api');

const mockType: LinkedTableRow = {
  id: 'atelier-cuisine',
  name: 'Atelier Cuisine',
};

const mockType2: LinkedTableRow = {
  id: 'conference',
  name: 'Conference',
};

const eventWithAudience = makeEvent({ id: 'a', targetAudience: [{ id: 'public1', name: 'Public 1' }] });

function makeEvent(overrides: Partial<Event> = {}): Event {
  const defaults: Partial<Event> = {
    id: 'rec1',
    title: 'Atelier Cuisine',
    description: 'Description',
    date: '2035-06-03',
    time: '14:00',
    address: '1 rue Test',
    city: 'Paris',
    region: 'Île-de-France',
    department: 'Paris',
    postalCode: '75001',
    latitude: 48.8566,
    longitude: 2.3522,
    type: mockType,
    themes: [{ id: 'autre', name: 'Autres' }],
    organizer: 'Org Test',
    isDuringWeek: true,
    isHighlighted: false,
    modality: 'presentiel',
    targetAudience: [{ id: 'tout-public', name:'tout-public'}],
    isFree: true,
  };
  return { ...defaults, ...overrides } as Event;
}

describe('useEvents', () => {
  beforeEach(() => {
    vi.mocked(api.fetchEvents).mockResolvedValue([]);
    vi.mocked(api.fetchPartners).mockResolvedValue([]);
    vi.mocked(api.fetchThemes).mockResolvedValue([]);
    vi.mocked(api.fetchFormats).mockResolvedValue([]);
    vi.mocked(api.fetchPublics).mockResolvedValue([]);
    vi.mocked(api.eventsToGeoJSON).mockReturnValue({ type: 'FeatureCollection', features: [] });
  });

  it('charge les événements et partenaires au montage', async () => {
    const events = [makeEvent()];
    const mockPartner: LinkedTableRow = {
      id: 'part1',
      name: 'Partenaire Test',
      logoUrl: 'https://test.com/logo.png',
    };
    const partners = [mockPartner];
    vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);
    vi.mocked(api.fetchPartners).mockResolvedValueOnce(partners);

    const { result } = renderHook(() => useEvents());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.fetchEvents).toHaveBeenCalledWith(false);
    expect(api.fetchPartners).toHaveBeenCalled();
    expect(result.current.allEvents).toEqual(events);
    expect(result.current.availablePartners).toEqual(partners);
  });

  it('expose dans controls tout ce dont les écrans de filtres ont besoin', async () => {
    const partners: LinkedTableRow[] = [{ id: 'part1', name: 'P1' }];
    const formats: LinkedTableRow[] = [mockType];
    vi.mocked(api.fetchEvents).mockResolvedValueOnce([
      makeEvent({ id: 'a', region: 'Bretagne' }),
      makeEvent({ id: 'b', region: 'Normandie' }),
    ]);
    vi.mocked(api.fetchPartners).mockResolvedValueOnce(partners);
    vi.mocked(api.fetchFormats).mockResolvedValueOnce(formats);

    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.controls.availablePartners).toEqual(partners);
    expect(result.current.controls.availableFormats).toEqual(formats);

    act(() => result.current.controls.onToggleRegion('Bretagne'));
    expect(result.current.controls.filters.regions).toEqual(['Bretagne']);
    expect(result.current.events).toHaveLength(1);

    act(() => result.current.controls.onResetFilters());
    expect(result.current.controls.filters.regions).toEqual([]);
    expect(result.current.events).toHaveLength(2);
  });

  it('gère les erreurs de chargement', async () => {
    vi.mocked(api.fetchEvents).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Network error');
  });

  describe('référentiel en erreur', () => {
    it('garde la carte et les autres filtres, et signale le référentiel indisponible', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const events = [makeEvent()];
      const themes: LinkedTableRow[] = [{ id: 't1', name: 'Thème 1' }];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);
      vi.mocked(api.fetchFormats).mockRejectedValueOnce(new Error('Erreur API: 502 Bad Gateway'));
      vi.mocked(api.fetchThemes).mockResolvedValueOnce(themes);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeNull();
      expect(result.current.allEvents).toEqual(events);
      expect(result.current.controls.availableThemes).toEqual(themes);
      expect(result.current.controls.availableFormats).toEqual([]);
      expect(result.current.controls.unavailableReferences).toEqual(['formats']);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('un référentiel simplement vide n’est pas signalé comme indisponible', async () => {
      vi.mocked(api.fetchEvents).mockResolvedValueOnce([makeEvent()]);
      vi.mocked(api.fetchFormats).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.controls.unavailableReferences).toEqual([]);
    });

    it('reste en erreur globale si les événements eux-mêmes ne se chargent pas', async () => {
      vi.mocked(api.fetchEvents).mockRejectedValueOnce(new Error('Erreur API: 500'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('filtres', () => {
    it('filtre par recherche textuelle (titre)', async () => {
      const events = [
        makeEvent({ id: 'a', title: 'Atelier Python' }),
        makeEvent({ id: 'b', title: 'Conférence IA' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ search: 'Python' });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].title).toBe('Atelier Python');
    });

    it('filtre par partenaire via togglePartner', async () => {
      const events = [
        makeEvent({ id: 'a', partners: [{ id: 'part1', name: 'P1' }] }),
        makeEvent({ id: 'b', partners: [{ id: 'part2', name: 'P2' }] }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.togglePartner('part1');
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('a');
    });

    it.each([
      ['titre', 'Zumba', { title: 'Zumba du jeudi' }],
      ['description', 'compostage', { description: 'Atelier de compostage' }],
      ['ville', 'Lyon', { city: 'Lyon' }],
      ['organisateur', 'Association Verte', { organizer: 'Association Verte' }],
      ['région', 'Bretagne', { region: 'Bretagne' }],
      ['lieu', 'Halle Tony', { venueName: 'Halle Tony Garnier' }],
    ] as const)('recherche multi-champs : trouve par %s', async (_champ, recherche, overrides) => {
      const events = [
        makeEvent({ id: 'cible', ...overrides }),
        makeEvent({ id: 'autre', title: 'Autre', description: 'Rien', city: 'Nantes', organizer: 'Org', region: 'Pays de la Loire', venueName: 'Salle' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ search: recherche });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('cible');
    });

    it('recherche multi-champs : ignore la casse et ne renvoie rien sans correspondance', async () => {
      const events = [makeEvent({ id: 'a', city: 'Lyon' })];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ search: 'lYoN' });
      });
      expect(result.current.events).toHaveLength(1);

      act(() => {
        result.current.updateFilters({ search: 'introuvable' });
      });
      expect(result.current.events).toHaveLength(0);
    });

    it('filtre par modalité', async () => {
      const events = [
        makeEvent({ id: 'a', modality: 'presentiel' }),
        makeEvent({ id: 'b', modality: 'distanciel' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ modality: 'distanciel' });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].modality).toBe('distanciel');
    });

    it("filtre pendant la période de l'événement (during-week)", async () => {
      const events = [
        makeEvent({ id: 'a', isDuringWeek: true }),
        makeEvent({ id: 'b', isDuringWeek: false }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ dateFilter: 'during-week' });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].isDuringWeek).toBe(true);
    });

    it('filtre par plage calendrier (un jour)', async () => {
      const events = [
        makeEvent({ id: 'a', date: '2035-05-10' }),
        makeEvent({ id: 'b', date: '2035-05-20' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({
          dateFilter: 'custom',
          dateFrom: '2035-05-20',
          dateTo: '',
        });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('b');
    });

    it('filtre par plage calendrier (intervalle)', async () => {
      const events = [
        makeEvent({ id: 'a', date: '2035-05-10' }),
        makeEvent({ id: 'b', date: '2035-05-18', endDate: '2035-05-19' }),
        makeEvent({ id: 'c', date: '2035-06-01' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({
          dateFilter: 'custom',
          dateFrom: '2035-05-15',
          dateTo: '2035-05-25',
        });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('b');
    });

    it('filtre par région via toggleRegion', async () => {
      const events = [
        makeEvent({ id: 'a', region: 'Île-de-France' }),
        makeEvent({ id: 'b', region: 'Bretagne' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.toggleRegion('Bretagne');
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].region).toBe('Bretagne');
    });

    it('toggleRegion déselectionne une région déjà sélectionnée', async () => {
      const events = [
        makeEvent({ id: 'a', region: 'Île-de-France' }),
        makeEvent({ id: 'b', region: 'Bretagne' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { result.current.toggleRegion('Bretagne'); });
      act(() => { result.current.toggleRegion('Bretagne'); });

      expect(result.current.events).toHaveLength(2);
    });

    it('filtre par type via toggleType', async () => {
      const events = [
        makeEvent({ id: 'a', type: mockType }),
        makeEvent({ id: 'b', type: mockType2 }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.toggleType('conference');
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].type.name).toBe('Conference');
    });

    it('filtre par code postal', async () => {
      const events = [
        makeEvent({ id: 'a', postalCode: '75001' }),
        makeEvent({ id: 'b', postalCode: '69001' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ postalCode: '75' });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].postalCode).toBe('75001');
    });

    it('resetFilters réinitialise tous les filtres', async () => {
      const events = [
        makeEvent({ id: 'a', modality: 'presentiel' }),
        makeEvent({ id: 'b', modality: 'distanciel' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { result.current.updateFilters({ modality: 'distanciel' }); });
      expect(result.current.events).toHaveLength(1);

      act(() => { result.current.resetFilters(); });
      expect(result.current.events).toHaveLength(2);
    });

    it('filtre par thématique via toggleTheme', async () => {
      const eventWithTheme = makeEvent({ id: 'a', themes: [{ id: 'theme1', name: 'Thème 1' }] });
      const eventWithoutTheme = makeEvent({ id: 'b', themes: [] });
      const events = [eventWithTheme, eventWithoutTheme];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.toggleTheme('theme1');
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('a');
      expect(result.current.events[0].themes.some(t => t.id === 'theme1')).toBe(true);
    });

    it('toggleTheme déselectionne une thématique déjà sélectionnée', async () => {
      const eventWithTheme = makeEvent({ id: 'a', themes: [{ id: 'theme1', name: 'Thème 1' }] });
      const eventWithoutTheme = makeEvent({ id: 'b', themes: [] });
      const events = [eventWithTheme, eventWithoutTheme];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { result.current.toggleTheme('theme1'); });
      expect(result.current.events).toHaveLength(1);

      act(() => { result.current.toggleTheme('theme1'); });
      expect(result.current.events).toHaveLength(2);
    });

    it('filtre par public cible via toggleAudience', async () => {

      const eventWithoutAudience = makeEvent({ id: 'b', targetAudience: [] });
      const events = [eventWithAudience, eventWithoutAudience];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.toggleAudience('public1');
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('a');
      expect(result.current.events[0].targetAudience.some(a => a.id === 'public1')).toBe(true);
    });

    it('toggleAudience déselectionne un public cible déjà sélectionné', async () => {
      const eventWithoutAudience = makeEvent({ id: 'b', targetAudience: [] });
      const events = [eventWithAudience, eventWithoutAudience];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { result.current.toggleAudience('public1'); });
      expect(result.current.events).toHaveLength(1);

      act(() => { result.current.toggleAudience('public1'); });
      expect(result.current.events).toHaveLength(2);
    });
  });

  describe('événements passés affichés automatiquement une fois l\'événement terminé', () => {
    const pastEvent = () => makeEvent({ id: 'passe', date: '2020-03-01' });
    const upcomingEvent = () => makeEvent({ id: 'avenir', date: '2035-06-03' });

    const contextFor = (weekEnd: string | undefined) => {
      const config = weekEnd
        ? ({ app: { eventDates: { weekStart: '2020-01-01', weekEnd } } } as unknown as AppConfig)
        : null;
      return { config, loading: false, error: null, helpers: buildHelpers(config) };
    };

    // Le contexte est relu à chaque rendu : un test peut le changer puis relancer le rendu.
    let context = contextFor(undefined);
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ConfigContext.Provider, { value: context }, children);

    async function load(weekEnd: string | undefined) {
      context = contextFor(weekEnd);
      vi.mocked(api.fetchEvents).mockResolvedValueOnce([pastEvent(), upcomingEvent()]);
      const hook = renderHook(() => useEvents(), { wrapper });
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
      return hook;
    }

    it("masque les passés tant que l'événement n'est pas terminé", async () => {
      const { result } = await load('2035-12-31');

      expect(result.current.controls.defaultShowPastEvents).toBe(false);
      expect(result.current.filters.showPastEvents).toBe(false);
      expect(result.current.events.map((e) => e.id)).toEqual(['avenir']);
    });

    it("affiche les passés par défaut une fois l'événement terminé", async () => {
      const { result } = await load('2020-12-31');

      expect(result.current.controls.defaultShowPastEvents).toBe(true);
      expect(result.current.filters.showPastEvents).toBe(true);
      expect(result.current.events.map((e) => e.id)).toEqual(['passe', 'avenir']);
    });

    it('garde le comportement actuel (passés masqués) quand la config ou la date de fin manque', async () => {
      const { result } = await load(undefined);

      expect(result.current.controls.defaultShowPastEvents).toBe(false);
      expect(result.current.events.map((e) => e.id)).toEqual(['avenir']);
    });

    it("respecte le choix de l'utilisateur, puis revient au défaut à la réinitialisation", async () => {
      const { result } = await load('2020-12-31');

      act(() => result.current.updateFilters({ showPastEvents: false }));
      expect(result.current.events.map((e) => e.id)).toEqual(['avenir']);

      act(() => result.current.resetFilters());
      expect(result.current.filters.showPastEvents).toBe(true);
      expect(result.current.events.map((e) => e.id)).toEqual(['passe', 'avenir']);
    });

    it("prend en compte une config qui arrive après le premier rendu", async () => {
      const { result, rerender } = await load(undefined);
      expect(result.current.events.map((e) => e.id)).toEqual(['avenir']);

      context = contextFor('2020-12-31');
      rerender();
      expect(result.current.events.map((e) => e.id)).toEqual(['passe', 'avenir']);
    });
  });

  describe('stats', () => {
    it('calcule les stats totales et filtrées', async () => {
      const events = [
        makeEvent({ id: 'a', type: mockType, isDuringWeek: true }),
        makeEvent({ id: 'b', type: mockType2, isDuringWeek: false }),
        makeEvent({ id: 'c', type: mockType, isDuringWeek: true }),
      ];

      const formats : LinkedTableRow[] = [
          {id:'atelier-cuisine',name:'Atelier Cuisine'},
          {id :'conference', name:'Conference' }
      ]

      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);
      vi.mocked(api.fetchFormats).mockResolvedValueOnce(formats);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));
      console.log('---> result.current.stats: ', result.current.stats)
      expect(result.current.stats.total).toBe(3);
      expect(result.current.stats.filtered).toBe(3);
      expect(result.current.stats.duringWeek).toBe(2);
      expect(result.current.stats.byType['atelier-cuisine']).toBe(2);
      expect(result.current.stats.byType['conference']).toBe(1);
    });
  });

  describe('devMode', () => {
    it('toggleDevMode change l\'état et recharge les données', async () => {
      vi.mocked(api.fetchEvents).mockResolvedValue([]);
      vi.mocked(api.fetchPartners).mockResolvedValue([]);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { result.current.toggleDevMode(); });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(api.fetchEvents).toHaveBeenCalledWith(true);
      expect(api.fetchPartners).toHaveBeenCalled();
    });
  });
});
