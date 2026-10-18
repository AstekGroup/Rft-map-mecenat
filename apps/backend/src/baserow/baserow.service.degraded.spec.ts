import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@make-map/types';
import { BaserowService } from './baserow.service';
import type { BaserowRecord } from './baserow.types';
import type { GeocodingService } from '../geocoding/geocoding.service';
import type { AppConfigService } from '../config/config.service';
import { buildTestConfig } from '../../test/test-config';

/**
 * Cas dégradés des données (session 6) : un événement mal renseigné dans Baserow ne doit ni
 * s'afficher cassé (« Invalid Date », intervalle incohérent), ni faire échouer le chargement des
 * autres, ni passer sous silence : un message agrégé est journalisé.
 */
type Private = {
  fetchEvents(devMode?: boolean): Promise<Array<Record<string, unknown>>>;
  fetchRecords: jest.Mock;
  loadReferenceMap: jest.Mock;
};

function buildService(config: AppConfig) {
  const appConfig = {
    get: () => config,
    get safe() {
      return config;
    },
    get eventDates() {
      return config.app.eventDates;
    },
  } as unknown as AppConfigService;
  const configService = {
    get: () => undefined,
  } as unknown as ConfigService;
  const geocoding = {
    getRegionFromPostalCode: () => 'Région de test',
    batchGeocode: jest.fn().mockResolvedValue(new Map()),
  } as unknown as GeocodingService;
  const service = new BaserowService(
    configService,
    geocoding,
    appConfig,
  ) as unknown as Private;
  service.loadReferenceMap = jest.fn().mockResolvedValue(new Map());
  return service;
}

describe('BaserowService.fetchEvents : cas dégradés', () => {
  let warn: jest.SpyInstance;
  let config: AppConfig;
  let service: Private;

  const record = (id: number, fields: Record<string, unknown>) =>
    ({ id, ...fields }) as BaserowRecord;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    config = buildTestConfig();
    service = buildService(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const messages = () => warn.mock.calls.map((c) => String(c[0]));

  it('masque les événements sans date de début et le journalise une fois, avec des exemples', async () => {
    const { title, startDate } = config.baserow.fieldMapping;
    service.fetchRecords = jest
      .fn()
      .mockResolvedValue([
        record(1, { [title]: 'Daté', [startDate]: '2026-05-06T10:00:00Z' }),
        record(2, { [title]: 'Sans date', [startDate]: null }),
        record(3, { [title]: 'Date illisible', [startDate]: 'pas une date' }),
        record(4, { [title]: 'Sans colonne de date' }),
      ]);

    const events = await service.fetchEvents();
    expect(events.map((e) => e.id)).toEqual(['1']);

    const missing = messages().filter((m) => m.includes('sans date de début'));
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain('3 événement(s)');
    expect(missing[0]).toContain(`colonne « ${startDate} »`);
    expect(missing[0]).toContain('« Sans date » (id 2)');

    // Même chargement, mêmes événements : pas de message répété.
    await service.fetchEvents();
    expect(
      messages().filter((m) => m.includes('sans date de début')),
    ).toHaveLength(1);
  });

  it('ne masque rien et ne journalise rien quand tous les événements ont une date', async () => {
    const { startDate } = config.baserow.fieldMapping;
    service.fetchRecords = jest
      .fn()
      .mockResolvedValue([
        record(1, { [startDate]: '2026-05-06T10:00:00Z' }),
        record(2, { [startDate]: '2026-05-07T10:00:00Z' }),
      ]);

    const events = await service.fetchEvents();
    expect(events).toHaveLength(2);
    expect(messages()).toEqual([]);
  });

  it('ignore une date de fin antérieure au début, garde l’événement et le journalise', async () => {
    const { title, startDate, endDate } = config.baserow.fieldMapping;
    // Cas E26 : début le 25/09 à 18h, fin le 24/09 à 09h.
    service.fetchRecords = jest.fn().mockResolvedValue([
      record(1, {
        [title]: 'Fin avant début',
        [startDate]: '2026-09-25T18:00:00Z',
        [endDate]: '2026-09-24T09:00:00Z',
      }),
      record(2, {
        [title]: 'Normal',
        [startDate]: '2026-09-25T09:00:00Z',
        [endDate]: '2026-09-25T17:00:00Z',
      }),
    ]);

    const [invalid, normal] = await service.fetchEvents();

    expect(invalid.date).toBe('2026-09-25');
    expect(invalid.endDate).toBeUndefined();
    expect(invalid.endTime).toBeUndefined();
    expect(normal.endDate).toBe('2026-09-25');
    expect(normal.endTime).toBe('19:00');

    const found = messages().filter((m) => m.includes('précède le début'));
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('1 événement(s)');
    expect(found[0]).toContain('« Fin avant début » (id 1)');
  });

  it('affiche un événement à 22h30 UTC à sa date et son heure de Paris (E27)', async () => {
    const { startDate, endDate } = config.baserow.fieldMapping;
    service.fetchRecords = jest.fn().mockResolvedValue([
      record(1, {
        [startDate]: '2026-09-21T22:30:00Z',
        [endDate]: '2026-09-22T01:00:00Z',
      }),
    ]);

    const [event] = await service.fetchEvents();

    expect(event).toMatchObject({
      date: '2026-09-22',
      time: '00:30',
      endDate: '2026-09-22',
      endTime: '03:00',
    });
  });

  it('lit la capacité en nombre, ignore 0 et signale une valeur inexploitable', async () => {
    const { title, startDate, capacity } = config.baserow.fieldMapping;
    const start = '2026-05-06T10:00:00Z';
    service.fetchRecords = jest.fn().mockResolvedValue([
      record(1, { [title]: 'Nombre', [startDate]: start, [capacity]: 40 }),
      record(2, { [title]: 'Texte', [startDate]: start, [capacity]: '25' }),
      record(3, { [title]: 'Zéro', [startDate]: start, [capacity]: 0 }),
      record(4, { [title]: 'Vide', [startDate]: start, [capacity]: null }),
      record(5, {
        [title]: 'Illimité',
        [startDate]: start,
        [capacity]: 'illimité',
      }),
      record(6, { [title]: 'Négatif', [startDate]: start, [capacity]: -5 }),
    ]);

    const events = await service.fetchEvents();

    expect(events.map((e) => e.capacity)).toEqual([
      40,
      25,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    const found = messages().filter((m) =>
      m.includes('capacité inexploitable'),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('2 événement(s)');
    expect(found[0]).toContain(`colonne « ${capacity} »`);
  });

  it('un événement sans titre ni format est servi avec un titre de repli', async () => {
    // Cas E17 : titre vide.
    const { title, startDate } = config.baserow.fieldMapping;
    service.fetchRecords = jest
      .fn()
      .mockResolvedValue([
        record(1, { [title]: '', [startDate]: '2026-05-06T10:00:00Z' }),
      ]);

    const [event] = await service.fetchEvents();

    expect(event.title).toBe('Événement sans titre');
    expect(event.type).toBeUndefined();
  });
});
