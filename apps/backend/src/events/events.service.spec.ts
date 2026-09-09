import { EventsService } from './events.service';
import { BaserowService } from '../baserow/baserow.service';
import type { Event, LinkedTableRow } from '@make-map/types';

const mockEvent: Event = {
  id: 'rec123',
  title: 'Conférence IA',
  description: "Une conférence sur l'IA",
  date: '2026-05-20',
  time: '14:00',
  address: '1 rue de la Paix',
  city: 'Paris',
  region: 'Île-de-France',
  department: 'Paris',
  postalCode: '75001',
  latitude: 48.8566,
  longitude: 2.3522,
  type: { id: 'conference', name: 'conference' },
  themes: [{ id: 'autre', name: 'Autres' }],
  organizer: 'Association Test',
  isDuringWeek: true,
  modality: 'presentiel',
  targetAudience: [{ id: 'tout-public', name: 'tout-public' }],
  isFree: true,
};

const mockPartner: LinkedTableRow = {
  id: 'part1',
  name: 'Partenaire Test',
  logoUrl: 'https://test.com/logo.png',
};

describe('EventsService', () => {
  let service: EventsService;
  let baserowService: jest.Mocked<BaserowService>;

  beforeEach(() => {
    baserowService = {
      fetchEvents: jest.fn(),
      fetchLinkedTableRow: jest.fn(),
    } as unknown as jest.Mocked<BaserowService>;

    service = new EventsService(baserowService);
  });

  describe('findAll', () => {
    it('appelle BaserowService au premier appel (cache miss)', async () => {
      baserowService.fetchEvents.mockResolvedValueOnce([mockEvent]);

      const result = await service.findAll();
      expect(baserowService.fetchEvents).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockEvent]);
    });

    it('utilise le cache au 2ème appel (cache hit)', async () => {
      baserowService.fetchEvents.mockResolvedValueOnce([mockEvent]);

      await service.findAll();
      await service.findAll();

      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(1);
    });

    it('utilise des caches séparés pour prod et devMode', async () => {
      baserowService.fetchEvents.mockResolvedValue([mockEvent]);

      await service.findAll(false);
      await service.findAll(true);

      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);
      expect(baserowService.fetchEvents).toHaveBeenCalledWith(false);
      expect(baserowService.fetchEvents).toHaveBeenCalledWith(true);
    });

    it('recharge les données après invalidation du cache', async () => {
      baserowService.fetchEvents.mockResolvedValue([mockEvent]);

      await service.findAll();
      service.invalidateCache();
      await service.findAll();

      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAllPartners', () => {
    it('appelle BaserowService au premier appel (cache miss)', async () => {
      baserowService.fetchLinkedTableRow.mockResolvedValueOnce([mockPartner]);

      const result = await service.findAllPartners();
      expect(baserowService.fetchLinkedTableRow).toHaveBeenCalled();
      expect(result).toEqual([mockPartner]);
    });

    it('utilise le cache au 2ème appel (cache hit)', async () => {
      baserowService.fetchLinkedTableRow.mockResolvedValueOnce([mockPartner]);

      await service.findAllPartners();
      await service.findAllPartners();

      expect(baserowService.fetchLinkedTableRow).toHaveBeenCalledTimes(1);
    });

    it('recharge les données après invalidation du cache', async () => {
      baserowService.fetchLinkedTableRow.mockResolvedValue([mockPartner]);

      await service.findAllPartners();
      service.invalidateCache();
      await service.findAllPartners();

      expect(baserowService.fetchLinkedTableRow).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it("retourne l'événement si l'id existe", async () => {
      baserowService.fetchEvents.mockResolvedValueOnce([mockEvent]);

      const result = await service.findOne('rec123');
      expect(result).toEqual(mockEvent);
    });

    it("retourne null si l'id n'existe pas", async () => {
      baserowService.fetchEvents.mockResolvedValueOnce([mockEvent]);

      const result = await service.findOne('rec_inexistant');
      expect(result).toBeNull();
    });
  });

  describe('invalidateCache', () => {
    it('vide les caches prod, dev et partners', async () => {
      baserowService.fetchEvents.mockResolvedValue([mockEvent]);
      baserowService.fetchLinkedTableRow.mockResolvedValue([mockPartner]);

      await service.findAll(false);
      await service.findAllPartners();
      service.invalidateCache();

      await service.findAll(false);
      await service.findAllPartners();

      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);
      expect(baserowService.fetchLinkedTableRow).toHaveBeenCalledTimes(2);
    });
  });
});
