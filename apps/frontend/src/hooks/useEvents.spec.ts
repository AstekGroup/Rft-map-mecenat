import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEvents } from './useEvents';
import * as api from '@/services/api';
import type { Event, LinkedTableRow } from '@/types/event';

vi.mock('@/services/api');

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
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
    type: 'atelier-cuisine',
    themes: [{ id: 'autre', name: 'Autres' }],
    organizer: 'Org Test',
    isDuringWeek: true,
    modality: 'presentiel',
    format: 'atelier-cuisine',
    targetAudience: ['tout-public'],
    isFree: true,
    ...overrides,
  };
}

const mockPartner: LinkedTableRow = {
  id: 'part1',
  name: 'Partenaire Test',
  logoUrl: 'https://test.com/logo.png',
};

describe('useEvents', () => {
  beforeEach(() => {
    vi.mocked(api.fetchEvents).mockResolvedValue([]);
    vi.mocked(api.fetchPartners).mockResolvedValue([]);
    vi.mocked(api.eventsToGeoJSON).mockReturnValue({ type: 'FeatureCollection', features: [] });
  });

  it('charge les événements et partenaires au montage', async () => {
    const events = [makeEvent()];
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

  it('gère les erreurs de chargement', async () => {
    vi.mocked(api.fetchEvents).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Network error');
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

    it('filtre par recherche textuelle (ville)', async () => {
      const events = [
        makeEvent({ id: 'a', city: 'Paris' }),
        makeEvent({ id: 'b', city: 'Lyon' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ search: 'Lyon' });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].city).toBe('Lyon');
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

    it('filtre pendant la semaine (during-week)', async () => {
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

    it('filtre par weekend de septembre (weekend-sept)', async () => {
      const events = [
        makeEvent({ id: 'a', date: '2026-09-26' }),
        makeEvent({ id: 'b', date: '2026-09-28' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ dateFilter: 'weekend-sept' });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('a');
    });

    it('filtre par weekend d’octobre (weekend-oct)', async () => {
      const events = [
        makeEvent({ id: 'a', date: '2026-10-04' }),
        makeEvent({ id: 'b', date: '2026-10-06' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateFilters({ dateFilter: 'weekend-oct' });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('a');
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
        makeEvent({ id: 'a', type: 'atelier-cuisine' }),
        makeEvent({ id: 'b', type: 'conference' }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.toggleType('conference');
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].type).toBe('conference');
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
  });

  describe('stats', () => {
    it('calcule les stats totales et filtrées', async () => {
      const events = [
        makeEvent({ id: 'a', type: 'atelier-cuisine', isDuringWeek: true }),
        makeEvent({ id: 'b', type: 'conference', isDuringWeek: false }),
        makeEvent({ id: 'c', type: 'atelier-cuisine', isDuringWeek: true }),
      ];
      vi.mocked(api.fetchEvents).mockResolvedValueOnce(events);

      const { result } = renderHook(() => useEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

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
