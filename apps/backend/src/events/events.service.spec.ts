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
  isHighlighted: false,
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
      degradedReferences: jest.fn().mockReturnValue([]),
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

    describe('référentiel en erreur', () => {
      const t0 = new Date('2026-05-20T10:00:00Z').getTime();
      let now: jest.SpyInstance<number, []>;

      beforeEach(() => {
        now = jest.spyOn(Date, 'now').mockReturnValue(t0);
      });

      afterEach(() => {
        now.mockRestore();
      });

      it('ne fige pas 5 minutes un chargement dégradé (relu après 30 s)', async () => {
        baserowService.degradedReferences.mockReturnValue([
          'BASEROW_FORMATS_TABLE',
        ]);
        baserowService.fetchEvents.mockResolvedValue([mockEvent]);

        await service.findAll();
        now.mockReturnValue(t0 + 20_000);
        await service.findAll();
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(1);

        now.mockReturnValue(t0 + 31_000);
        await service.findAll();
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);
      });

      it('garde le cache normal de 5 minutes quand tout est en ordre', async () => {
        baserowService.fetchEvents.mockResolvedValue([mockEvent]);

        await service.findAll();
        now.mockReturnValue(t0 + 4 * 60_000);
        await service.findAll();
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(1);

        now.mockReturnValue(t0 + 5 * 60_000 + 1_000);
        await service.findAll();
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('rafraîchissement en arrière-plan', () => {
    const otherEvent: Event = { ...mockEvent, id: 'rec456' };

    function deferred<T>() {
      let resolve!: (value: T) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    /** Laisse les promesses en attente se résoudre. */
    const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

    afterEach(() => {
      service.onModuleDestroy();
      jest.useRealTimers();
    });

    it('regroupe 10 appels simultanés en un seul chargement', async () => {
      const load = deferred<Event[]>();
      baserowService.fetchEvents.mockReturnValue(load.promise);

      const calls = Array.from({ length: 10 }, () => service.findAll());
      load.resolve([mockEvent]);
      const results = await Promise.all(calls);

      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(1);
      results.forEach((r) => expect(r).toEqual([mockEvent]));
    });

    it('regroupe aussi les appels simultanés en mode devMode, séparément de la production', async () => {
      const prod = deferred<Event[]>();
      const dev = deferred<Event[]>();
      baserowService.fetchEvents.mockImplementation((devMode?: boolean) =>
        devMode ? dev.promise : prod.promise,
      );

      const calls = [
        service.findAll(false),
        service.findAll(false),
        service.findAll(true),
        service.findAll(true),
      ];
      prod.resolve([mockEvent]);
      dev.resolve([otherEvent]);
      await Promise.all(calls);

      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);
    });

    it("sert l'ancienne liste pendant le rafraîchissement, puis la nouvelle", async () => {
      const t0 = new Date('2026-05-20T10:00:00Z').getTime();
      const now = jest.spyOn(Date, 'now').mockReturnValue(t0);
      try {
        baserowService.fetchEvents.mockResolvedValueOnce([mockEvent]);
        await service.findAll();

        const refresh = deferred<Event[]>();
        baserowService.fetchEvents.mockReturnValueOnce(refresh.promise);
        now.mockReturnValue(t0 + 5 * 60_000 + 1_000);

        // Cache expiré : réponse immédiate avec l'ancienne liste, sans attendre Baserow.
        const stale = await service.findAll();
        expect(stale).toEqual([mockEvent]);
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);

        // Un autre visiteur pendant le rafraîchissement : toujours un seul chargement.
        expect(await service.findAll()).toEqual([mockEvent]);
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);

        refresh.resolve([otherEvent]);
        await flush();
        expect(await service.findAll()).toEqual([otherEvent]);
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);
      } finally {
        now.mockRestore();
      }
    });

    it("garde l'ancienne liste si le rafraîchissement échoue (et attend 30 s avant de réessayer)", async () => {
      const t0 = new Date('2026-05-20T10:00:00Z').getTime();
      const now = jest.spyOn(Date, 'now').mockReturnValue(t0);
      try {
        baserowService.fetchEvents.mockResolvedValueOnce([mockEvent]);
        await service.findAll();

        baserowService.fetchEvents.mockRejectedValueOnce(
          new Error('Baserow injoignable'),
        );
        now.mockReturnValue(t0 + 5 * 60_000 + 1_000);
        expect(await service.findAll()).toEqual([mockEvent]);
        await flush();
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);

        // Encore dans les 30 s : pas de nouvelle tentative, liste conservée.
        now.mockReturnValue(t0 + 5 * 60_000 + 20_000);
        expect(await service.findAll()).toEqual([mockEvent]);
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);

        // Après 30 s : on réessaie.
        baserowService.fetchEvents.mockResolvedValueOnce([otherEvent]);
        now.mockReturnValue(t0 + 5 * 60_000 + 40_000);
        await service.findAll();
        expect(baserowService.fetchEvents).toHaveBeenCalledTimes(3);
      } finally {
        now.mockRestore();
      }
    });

    it("ne sert plus une liste périmée depuis plus d'une heure (Baserow en panne)", async () => {
      const t0 = new Date('2026-05-20T10:00:00Z').getTime();
      const now = jest.spyOn(Date, 'now').mockReturnValue(t0);
      try {
        baserowService.fetchEvents.mockResolvedValueOnce([mockEvent]);
        await service.findAll();

        baserowService.fetchEvents.mockRejectedValue(new Error('Baserow KO'));
        // Panne pendant plus d'une heure : une tentative toutes les 30 s échoue.
        for (let minutes = 6; minutes <= 59; minutes += 1) {
          now.mockReturnValue(t0 + minutes * 60_000);
          expect(await service.findAll()).toEqual([mockEvent]);
          await flush();
        }

        now.mockReturnValue(t0 + 61 * 60_000);
        await expect(service.findAll()).rejects.toThrow('Baserow KO');
      } finally {
        now.mockRestore();
      }
    });

    it("sans aucune liste en cache, l'erreur remonte comme avant", async () => {
      baserowService.fetchEvents.mockRejectedValueOnce(new Error('KO'));
      await expect(service.findAll()).rejects.toThrow('KO');

      // Rien n'est resté bloqué : l'appel suivant retente.
      baserowService.fetchEvents.mockResolvedValueOnce([mockEvent]);
      await expect(service.findAll()).resolves.toEqual([mockEvent]);
    });

    it('précharge au démarrage puis rafraîchit quand le cache expire (minuteur)', async () => {
      jest.useFakeTimers({ now: new Date('2026-05-20T10:00:00Z') });
      baserowService.fetchEvents.mockResolvedValue([mockEvent]);

      service.onApplicationBootstrap();
      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(1);
      expect(baserowService.fetchEvents).toHaveBeenCalledWith(false);

      // Cache encore valide : le minuteur ne recharge pas.
      await jest.advanceTimersByTimeAsync(4 * 60_000);
      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(1);

      // TTL de 5 min dépassé : le minuteur recharge, sans visiteur.
      await jest.advanceTimersByTimeAsync(90_000);
      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(2);
    });

    it('arrête le minuteur à la destruction du module', async () => {
      jest.useFakeTimers({ now: new Date('2026-05-20T10:00:00Z') });
      baserowService.fetchEvents.mockResolvedValue([mockEvent]);

      service.onApplicationBootstrap();
      service.onModuleDestroy();
      expect(jest.getTimerCount()).toBe(0);

      await jest.advanceTimersByTimeAsync(20 * 60_000);
      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(1);
    });

    it('un préchargement qui échoue ne fait pas planter le démarrage', async () => {
      jest.useFakeTimers({ now: new Date('2026-05-20T10:00:00Z') });
      baserowService.fetchEvents.mockRejectedValue(new Error('Baserow KO'));

      expect(() => service.onApplicationBootstrap()).not.toThrow();
      await jest.advanceTimersByTimeAsync(0);
      expect(baserowService.fetchEvents).toHaveBeenCalledTimes(1);
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
