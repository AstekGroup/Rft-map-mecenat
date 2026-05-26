import { EventsService } from './events.service';
import { AirtableService } from '../airtable/airtable.service';
import type { Event, Partner } from '@make-map/types';

const mockEvent: Event = {
  id: 'rec123',
  title: 'Conférence IA',
  description: 'Une conférence sur l\'IA',
  date: '2026-05-20',
  time: '14:00',
  address: '1 rue de la Paix',
  city: 'Paris',
  region: 'Île-de-France',
  department: 'Paris',
  postalCode: '75001',
  latitude: 48.8566,
  longitude: 2.3522,
  type: 'conference',
  themes: ['autre'],
  organizer: 'Association Test',
  isDuringWeek: true,
  modality: 'presentiel',
  format: 'conference',
  targetAudience: ['tout-public'],
  isFree: true,
};

const mockPartner: Partner = {
  id: 'part1',
  name: 'Partenaire Test',
  logoUrl: 'https://test.com/logo.png',
};

describe('EventsService', () => {
  let service: EventsService;
  let airtableService: jest.Mocked<AirtableService>;

  beforeEach(() => {
    airtableService = {
      fetchEvents: jest.fn(),
      fetchPartners: jest.fn(),
    } as unknown as jest.Mocked<AirtableService>;

    service = new EventsService(airtableService);
  });

  describe('findAll', () => {
    it('appelle AirtableService au premier appel (cache miss)', async () => {
      airtableService.fetchEvents.mockResolvedValueOnce([mockEvent]);

      const result = await service.findAll();
      expect(airtableService.fetchEvents).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockEvent]);
    });

    it('utilise le cache au 2ème appel (cache hit)', async () => {
      airtableService.fetchEvents.mockResolvedValueOnce([mockEvent]);

      await service.findAll();
      await service.findAll();

      expect(airtableService.fetchEvents).toHaveBeenCalledTimes(1);
    });

    it('utilise des caches séparés pour prod et devMode', async () => {
      airtableService.fetchEvents.mockResolvedValue([mockEvent]);

      await service.findAll(false);
      await service.findAll(true);

      expect(airtableService.fetchEvents).toHaveBeenCalledTimes(2);
      expect(airtableService.fetchEvents).toHaveBeenCalledWith(false);
      expect(airtableService.fetchEvents).toHaveBeenCalledWith(true);
    });

    it('recharge les données après invalidation du cache', async () => {
      airtableService.fetchEvents.mockResolvedValue([mockEvent]);

      await service.findAll();
      service.invalidateCache();
      await service.findAll();

      expect(airtableService.fetchEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAllPartners', () => {
    it('appelle AirtableService au premier appel (cache miss)', async () => {
      airtableService.fetchPartners.mockResolvedValueOnce([mockPartner]);

      const result = await service.findAllPartners();
      expect(airtableService.fetchPartners).toHaveBeenCalled();
      expect(result).toEqual([mockPartner]);
    });

    it('utilise le cache au 2ème appel (cache hit)', async () => {
      airtableService.fetchPartners.mockResolvedValueOnce([mockPartner]);

      await service.findAllPartners();
      await service.findAllPartners();

      expect(airtableService.fetchPartners).toHaveBeenCalledTimes(1);
    });

    it('recharge les données après invalidation du cache', async () => {
      airtableService.fetchPartners.mockResolvedValue([mockPartner]);

      await service.findAllPartners();
      service.invalidateCache();
      await service.findAllPartners();

      expect(airtableService.fetchPartners).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('retourne l\'événement si l\'id existe', async () => {
      airtableService.fetchEvents.mockResolvedValueOnce([mockEvent]);

      const result = await service.findOne('rec123');
      expect(result).toEqual(mockEvent);
    });

    it('retourne null si l\'id n\'existe pas', async () => {
      airtableService.fetchEvents.mockResolvedValueOnce([mockEvent]);

      const result = await service.findOne('rec_inexistant');
      expect(result).toBeNull();
    });
  });

  describe('invalidateCache', () => {
    it('vide les caches prod, dev et partners', async () => {
      airtableService.fetchEvents.mockResolvedValue([mockEvent]);
      airtableService.fetchPartners.mockResolvedValue([mockPartner]);

      await service.findAll(false);
      await service.findAllPartners();
      service.invalidateCache();

      await service.findAll(false);
      await service.findAllPartners();

      expect(airtableService.fetchEvents).toHaveBeenCalledTimes(2);
      expect(airtableService.fetchPartners).toHaveBeenCalledTimes(2);
    });
  });
});
