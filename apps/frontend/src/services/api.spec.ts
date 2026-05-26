import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEvents, fetchEventById, fetchPartners, eventsToGeoJSON } from './api';
import type { Event, Partner } from '@/types/event';

const mockEvent: Event = {
  id: 'rec1',
  title: 'Atelier IA',
  description: 'Description test',
  date: '2026-05-20',
  time: '14:00',
  address: '1 rue Test',
  city: 'Paris',
  region: 'Île-de-France',
  department: 'Paris',
  postalCode: '75001',
  latitude: 48.8566,
  longitude: 2.3522,
  type: 'atelier-cuisine',
  themes: ['autre'],
  organizer: 'Org Test',
  isDuringWeek: true,
  modality: 'presentiel',
  format: 'atelier-cuisine',
  targetAudience: ['tout-public'],
};

const mockPartner: Partner = {
  id: 'part1',
  name: 'Partenaire Test',
  logoUrl: 'https://test.com/logo.png',
};

describe('fetchEvents', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('retourne les événements en cas de succès', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockEvent],
    } as Response);

    const result = await fetchEvents();
    expect(result).toEqual([mockEvent]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/events'));
  });

  it('ajoute ?devMode=true si devMode est activé', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchEvents(true);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('?devMode=true'));
  });

  it('ne passe pas le paramètre devMode si false', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchEvents(false);
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).not.toContain('devMode');
  });

  it('lève une erreur si la réponse n\'est pas ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchEvents()).rejects.toThrow('Erreur API: 500');
  });
});

describe('fetchPartners', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('retourne les partenaires en cas de succès', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPartner],
    } as Response);

    const result = await fetchPartners();
    expect(result).toEqual([mockPartner]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/events/partners'));
  });

  it('lève une erreur si la réponse n\'est pas ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchPartners()).rejects.toThrow('Erreur API: 500');
  });
});

describe('fetchEventById', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('retourne l\'événement en cas de succès', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvent,
    } as Response);

    const result = await fetchEventById('rec1');
    expect(result).toEqual(mockEvent);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/events/rec1'));
  });

  it('lève une erreur si l\'événement n\'existe pas', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await expect(fetchEventById('inexistant')).rejects.toThrow('Erreur API: 404');
  });
});

describe('eventsToGeoJSON', () => {
  it('convertit les événements en FeatureCollection GeoJSON', () => {
    const result = eventsToGeoJSON([mockEvent]);
    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry.coordinates).toEqual([2.3522, 48.8566]);
  });

  it('exclut les événements avec latitude et longitude à 0', () => {
    const eventSansCoords = { ...mockEvent, latitude: 0, longitude: 0 };
    const result = eventsToGeoJSON([mockEvent, eventSansCoords]);
    expect(result.features).toHaveLength(1);
  });

  it('retourne une FeatureCollection vide si tous les événements sont à 0,0', () => {
    const event = { ...mockEvent, latitude: 0, longitude: 0 };
    const result = eventsToGeoJSON([event]);
    expect(result.features).toHaveLength(0);
  });

  it('place les coordonnées en [longitude, latitude]', () => {
    const result = eventsToGeoJSON([mockEvent]);
    const [lon, lat] = result.features[0].geometry.coordinates;
    expect(lon).toBe(mockEvent.longitude);
    expect(lat).toBe(mockEvent.latitude);
  });

  it('retourne une FeatureCollection vide pour un tableau vide', () => {
    const result = eventsToGeoJSON([]);
    expect(result.features).toHaveLength(0);
  });
});
