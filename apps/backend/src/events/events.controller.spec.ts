import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import type { Event, Partner } from '@make-map/types';

const mockEvent: Event = {
  id: 'rec123',
  title: 'Atelier IA',
  description: "Un atelier sur l'IA",
  date: '2026-05-20',
  time: '10:00',
  address: '10 rue du Test',
  city: 'Lyon',
  region: 'Auvergne-Rhône-Alpes',
  department: 'Rhône',
  postalCode: '69001',
  latitude: 45.76,
  longitude: 4.83,
  type: 'atelier-cuisine',
  themes: ['autre'],
  organizer: 'Lab IA',
  isDuringWeek: true,
  modality: 'presentiel',
  format: 'atelier-cuisine',
  targetAudience: ['tout-public'],
  isFree: true,
};

const mockPartner: Partner = {
  id: 'part1',
  name: 'Partenaire Test',
  logoUrl: 'https://test.com/logo.png',
};

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    eventsService = {
      findAll: jest.fn(),
      findAllPartners: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: eventsService }],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  describe('findAll', () => {
    it('appelle findAll sans devMode par défaut', async () => {
      eventsService.findAll.mockResolvedValueOnce([mockEvent]);

      const result = await controller.findAll();
      expect(eventsService.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockEvent]);
    });

    it('passe devMode=true quand le query param est "true"', async () => {
      eventsService.findAll.mockResolvedValueOnce([mockEvent]);

      await controller.findAll('true');
      expect(eventsService.findAll).toHaveBeenCalledWith(true);
    });

    it('passe devMode=false pour toute autre valeur', async () => {
      eventsService.findAll.mockResolvedValueOnce([mockEvent]);

      await controller.findAll('false');
      expect(eventsService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findAllPartners', () => {
    it('appelle findAllPartners du service', async () => {
      eventsService.findAllPartners.mockResolvedValueOnce([mockPartner]);

      const result = await controller.findAllPartners();
      expect(eventsService.findAllPartners).toHaveBeenCalled();
      expect(result).toEqual([mockPartner]);
    });
  });

  describe('findOne', () => {
    it("retourne l'événement si trouvé", async () => {
      eventsService.findOne.mockResolvedValueOnce(mockEvent);

      const result = await controller.findOne('rec123');
      expect(eventsService.findOne).toHaveBeenCalledWith('rec123', false);
      expect(result).toEqual(mockEvent);
    });

    it("lève NotFoundException si l'événement n'existe pas", async () => {
      eventsService.findOne.mockResolvedValueOnce(null);

      await expect(controller.findOne('rec_inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('passe devMode=true pour findOne', async () => {
      eventsService.findOne.mockResolvedValueOnce(mockEvent);

      await controller.findOne('rec123', 'true');
      expect(eventsService.findOne).toHaveBeenCalledWith('rec123', true);
    });
  });
});
