import { GeocodingService } from './geocoding.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeBanResponse(
  lon: number,
  lat: number,
  context = '69, Rhône, Auvergne-Rhône-Alpes',
) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          label: 'Test',
          score: 0.9,
          postcode: '69001',
          citycode: '69123',
          city: 'Lyon',
          context,
          importance: 0.8,
        },
      },
    ],
  };
}

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    service = new GeocodingService();
    mockFetch.mockReset();
  });

  describe('getRegionFromPostalCode', () => {
    it('retourne la région pour un code postal métropolitain', () => {
      expect(service.getRegionFromPostalCode('69001')).toBe(
        'Auvergne-Rhône-Alpes',
      );
      expect(service.getRegionFromPostalCode('75008')).toBe('Île-de-France');
      expect(service.getRegionFromPostalCode('35000')).toBe('Bretagne');
    });

    it('retourne la région pour les DOM', () => {
      expect(service.getRegionFromPostalCode('97100')).toBe('Guadeloupe');
      expect(service.getRegionFromPostalCode('97400')).toBe('La Réunion');
    });

    it('retourne Inconnue pour un code postal non trouvé', () => {
      expect(service.getRegionFromPostalCode('00000')).toBe('Inconnue');
    });

    it('retourne Inconnue pour une chaîne vide', () => {
      expect(service.getRegionFromPostalCode('')).toBe('Inconnue');
    });
  });

  describe('geocodeAddress', () => {
    it("appelle l'API BAN et retourne le résultat", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeBanResponse(4.8357, 45.764),
      });

      const result = await service.geocodeAddress(
        '1 rue de la Paix',
        '69001',
        'Lyon',
      );
      expect(result).not.toBeNull();
      expect(result!.longitude).toBeCloseTo(4.8357);
      expect(result!.latitude).toBeCloseTo(45.764);
      expect(result!.region).toBe('Auvergne-Rhône-Alpes');
    });

    it('retourne le résultat depuis le cache au 2ème appel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeBanResponse(4.8357, 45.764),
      });

      await service.geocodeAddress('1 rue test', '69001', 'Lyon');
      await service.geocodeAddress('1 rue test', '69001', 'Lyon');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retourne null si la réponse est vide', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'FeatureCollection', features: [] }),
      });
      // Second call (fallback sans adresse) also empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'FeatureCollection', features: [] }),
      });

      const result = await service.geocodeAddress(
        'adresse introuvable',
        '99999',
        'Ville',
      );
      expect(result).toBeNull();
    });

    it("retourne null en cas d'erreur HTTP", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await service.geocodeAddress('rue test', '69001', 'Lyon');
      expect(result).toBeNull();
    });

    it("retourne null en cas d'erreur réseau", async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.geocodeAddress('rue test', '69001', 'Lyon');
      expect(result).toBeNull();
    });

    it('retourne null si adresse et ville sont vides', async () => {
      const result = await service.geocodeAddress('', '', '');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('batchGeocode', () => {
    it('retourne une map avec les résultats pour chaque id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () =>
          makeBanResponse(2.3522, 48.8566, '75, Paris, Île-de-France'),
      });

      const items = [
        {
          id: 'evt1',
          address: '1 rue de Rivoli',
          postalCode: '75001',
          city: 'Paris',
        },
        {
          id: 'evt2',
          address: '2 rue de Rivoli',
          postalCode: '75001',
          city: 'Paris',
        },
      ];

      const results = await service.batchGeocode(items);
      expect(results.size).toBe(2);
      expect(results.get('evt1')).not.toBeNull();
      expect(results.get('evt2')).not.toBeNull();
    });

    it('retourne une map vide pour un tableau vide', async () => {
      const results = await service.batchGeocode([]);
      expect(results.size).toBe(0);
    });
  });

  describe('cache des échecs et du repli', () => {
    const emptyBan = {
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [] }),
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    it("retrouve le repli sans nouvel appel (enregistré sous la clé d'origine)", async () => {
      mockFetch.mockResolvedValueOnce(emptyBan);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeBanResponse(4.8357, 45.764),
      });

      const first = await service.geocodeAddress(
        'rue inconnue',
        '69001',
        'Lyon',
      );
      expect(first).not.toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const second = await service.geocodeAddress(
        'rue inconnue',
        '69001',
        'Lyon',
      );
      expect(second).toEqual(first);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('ne retente pas une adresse introuvable avant 24 h, puis la retente', async () => {
      jest.useFakeTimers({ now: new Date('2026-05-20T10:00:00Z') });
      mockFetch.mockResolvedValue(emptyBan);

      await service.geocodeAddress('rue introuvable', '99999', 'Ville');
      const callsAfterFirst = mockFetch.mock.calls.length;
      expect(callsAfterFirst).toBe(2); // adresse complète + repli

      jest.setSystemTime(new Date('2026-05-21T09:00:00Z'));
      await service.geocodeAddress('rue introuvable', '99999', 'Ville');
      expect(mockFetch).toHaveBeenCalledTimes(callsAfterFirst);

      jest.setSystemTime(new Date('2026-05-21T10:00:01Z'));
      await service.geocodeAddress('rue introuvable', '99999', 'Ville');
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });

    it("ne retente une erreur HTTP ou réseau qu'après 1 h", async () => {
      jest.useFakeTimers({ now: new Date('2026-05-20T10:00:00Z') });
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      await service.geocodeAddress('rue test', '69001', 'Lyon');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.setSystemTime(new Date('2026-05-20T10:59:00Z'));
      await service.geocodeAddress('rue test', '69001', 'Lyon');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.setSystemTime(new Date('2026-05-20T11:00:01Z'));
      await service.geocodeAddress('rue test', '69001', 'Lyon');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('normalise la clé (casse et espaces)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeBanResponse(4.8357, 45.764),
      });

      await service.geocodeAddress('1  Rue   Test', '69001', 'LYON');
      await service.geocodeAddress(' 1 rue test ', '69001', 'lyon');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("ne fait qu'un appel pour deux événements à la même adresse dans un lot", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => makeBanResponse(4.8357, 45.764),
      });

      const results = await service.batchGeocode([
        { id: 'a', address: '1 rue test', postalCode: '69001', city: 'Lyon' },
        { id: 'b', address: '1 rue test', postalCode: '69001', city: 'Lyon' },
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(results.get('a')).toEqual(results.get('b'));
    });
  });

  describe('cache management', () => {
    it('getCacheSize retourne 0 initialement', () => {
      expect(service.getCacheSize()).toBe(0);
    });

    it('getCacheSize augmente après un géocodage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeBanResponse(2.3522, 48.8566),
      });

      await service.geocodeAddress('1 avenue test', '75001', 'Paris');
      expect(service.getCacheSize()).toBe(1);
    });

    it('clearCache vide le cache', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeBanResponse(2.3522, 48.8566),
      });

      await service.geocodeAddress('1 avenue test', '75001', 'Paris');
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });
  });
});
