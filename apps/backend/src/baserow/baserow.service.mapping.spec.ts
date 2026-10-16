import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig, BaserowFieldMapping } from '@make-map/types';
import { BaserowService } from './baserow.service';
import type { BaserowRecord } from './baserow.types';
import type { GeocodingService } from '../geocoding/geocoding.service';
import type { AppConfigService } from '../config/config.service';
import { buildTestConfig } from '../../test/test-config';

/**
 * Le service ne connaît aucun nom de colonne : tout vient de la config. Ces tests donnent à la
 * carte un vocabulaire sans rapport avec celui de la config par défaut pour le prouver.
 */
type MultipleFormats = { id: string; title: string; formats: string[] };
type Private = {
  transformRecord(
    record: BaserowRecord,
    partners: Map<string, unknown>,
    themes: Map<string, unknown>,
    formats: Map<string, unknown>,
    publics: Map<string, unknown>,
    issues?: { multipleFormats: MultipleFormats[] },
  ): Record<string, unknown>;
  reportMultipleFormats(affected: MultipleFormats[]): void;
  fetchLinkedTableMap(tableName: string): Promise<Map<string, unknown>>;
};

function buildService(config: AppConfig, env: Record<string, string> = {}) {
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
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  const geocoding = {
    getRegionFromPostalCode: () => 'Région de test',
  } as unknown as GeocodingService;
  return new BaserowService(
    configService,
    geocoding,
    appConfig,
  ) as unknown as Private;
}

function transform(service: Private, record: BaserowRecord) {
  const empty = new Map<string, never>();
  return service.transformRecord(record, empty, empty, empty, empty);
}

describe('BaserowService : noms de colonnes et valeurs venant de la config', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lit les colonnes renommées dans la config', () => {
    const config = buildTestConfig();
    config.baserow.fieldMapping.city = "lieu de l'event";
    config.baserow.fieldMapping.title = 'Intitulé';
    const service = buildService(config);

    const event = transform(service, {
      id: 1,
      Intitulé: 'Atelier',
      "lieu de l'event": ' Nantes ',
    });

    expect(event.title).toBe('Atelier');
    expect(event.city).toBe('Nantes');
  });

  it("ignore l'ancien nom de colonne quand la config en désigne un autre (pas de repli en dur)", () => {
    const config = buildTestConfig();
    config.baserow.fieldMapping.city = 'Commune';
    const service = buildService(config);

    const event = transform(service, {
      id: 1,
      'Ville du lieu': 'Lyon',
      Commune: 'Nantes',
    });
    expect(event.city).toBe('Nantes');

    const sansCommune = transform(service, { id: 2, 'Ville du lieu': 'Lyon' });
    expect(sansCommune.city).toBe('');
  });

  it('donne une valeur vide et un avertissement unique pour un rôle absent de la config', () => {
    const config = buildTestConfig();
    delete (config.baserow.fieldMapping as Partial<BaserowFieldMapping>)
      .venueName;
    const service = buildService(config);

    const first = transform(service, { id: 1, Lieu: 'Salle' });
    transform(service, { id: 2, Lieu: 'Salle' });

    expect(first.venueName).toBeUndefined();
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(
      messages.filter((m) => m.includes('baserow.fieldMapping.venueName')),
    ).toHaveLength(1);
  });

  it('traduit la modalité avec les valeurs de la config et signale une valeur inconnue', () => {
    const config = buildTestConfig();
    config.baserow.mapping.modality = {
      'Sur place': 'presentiel',
      'À distance': 'distanciel',
    };
    const service = buildService(config);
    const modalityColumn = config.baserow.fieldMapping.modality;

    const remote = transform(service, {
      id: 1,
      [modalityColumn]: { id: 1, value: 'À distance' },
    });
    expect(remote.modality).toBe('distanciel');

    const unknown = transform(service, {
      id: 2,
      [modalityColumn]: { id: 2, value: 'Présentiel' },
    });
    expect(unknown.modality).toBe('presentiel');
    expect(
      warn.mock.calls.some((c) =>
        String(c[0]).includes('baserow.mapping.modality'),
      ),
    ).toBe(true);
  });

  describe('un seul format par événement', () => {
    const atelier = { id: '1', name: 'Atelier' };
    const conference = { id: '2', name: 'Conférence' };
    const formatsMap = new Map<string, unknown>([
      ['1', atelier],
      ['2', conference],
    ]);

    function withFormats(
      service: Private,
      config: AppConfig,
      links: number[],
      issues?: { multipleFormats: MultipleFormats[] },
    ) {
      const { format, title } = config.baserow.fieldMapping;
      return service.transformRecord(
        {
          id: 7,
          [title]: 'Soirée mixte',
          [format]: links.map((id) => ({ id, value: `format ${id}` })),
        },
        new Map(),
        new Map(),
        formatsMap,
        new Map(),
        issues,
      );
    }

    it('retient le premier format lié et signale les autres', () => {
      const config = buildTestConfig();
      const service = buildService(config);
      const issues = { multipleFormats: [] as MultipleFormats[] };

      const event = withFormats(service, config, [2, 1], issues);

      expect(event.type).toEqual(conference);
      expect(issues.multipleFormats).toEqual([
        { id: '7', title: 'Soirée mixte', formats: ['Conférence', 'Atelier'] },
      ]);
    });

    it('ne signale rien pour un seul format ou aucun format', () => {
      const config = buildTestConfig();
      const service = buildService(config);
      const issues = { multipleFormats: [] as MultipleFormats[] };

      expect(withFormats(service, config, [1], issues).type).toEqual(atelier);
      expect(withFormats(service, config, [], issues).type).toBeUndefined();
      expect(issues.multipleFormats).toEqual([]);
    });

    it("journalise un seul avertissement pour tous les événements, et ne le répète pas s'ils n'ont pas changé", () => {
      const service = buildService(buildTestConfig());
      const affected = [1, 2, 3, 4, 5].map((n) => ({
        id: String(n),
        title: `Événement ${n}`,
        formats: ['Atelier', 'Conférence'],
      }));

      service.reportMultipleFormats(affected);
      service.reportMultipleFormats(affected);

      const messages = warn.mock.calls
        .map((c) => String(c[0]))
        .filter((m) => m.includes('plusieurs formats'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('5 événement(s)');
      expect(messages[0]).toContain('Événement 1');
      expect(messages[0]).toContain('et 2 autre(s)');

      service.reportMultipleFormats([...affected, { id: '6', title: 'Autre', formats: ['A', 'B'] }]);
      expect(
        warn.mock.calls.filter((c) => String(c[0]).includes('plusieurs formats')),
      ).toHaveLength(2);
    });

    it("ne journalise rien quand aucun événement n'a plusieurs formats", () => {
      const service = buildService(buildTestConfig());
      service.reportMultipleFormats([]);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  it("marque « pendant l'événement » tout événement qui recoupe la période de la config", () => {
    const config = buildTestConfig(); // période : 2026-05-04 → 2026-05-10
    const service = buildService(config);
    const { startDate, endDate } = config.baserow.fieldMapping;
    const during = (start: string, end?: string) =>
      transform(service, {
        id: 1,
        [startDate]: start,
        ...(end ? { [endDate]: end } : {}),
      }).isDuringWeek;

    expect(during('2026-05-06T10:00:00')).toBe(true);
    // Commence avant la période, finit dedans : comptait « hors période » quand seul le début comptait.
    expect(during('2026-04-30T10:00:00', '2026-05-05T18:00:00')).toBe(true);
    // Commence dedans, finit après.
    expect(during('2026-05-09T10:00:00', '2026-05-15T18:00:00')).toBe(true);
    expect(during('2026-04-20T10:00:00', '2026-04-22T18:00:00')).toBe(false);
    expect(during('2026-05-20T10:00:00')).toBe(false);
  });

  it('reconnaît le tarif gratuit avec la valeur de la config', () => {
    const config = buildTestConfig();
    config.baserow.mapping.tariffFreeValue = 'Offert';
    const service = buildService(config);
    const { tariff, price } = config.baserow.fieldMapping;

    const free = transform(service, {
      id: 1,
      [tariff]: { id: 1, value: 'Offert' },
      [price]: 20,
    });
    const paid = transform(service, {
      id: 2,
      [tariff]: { id: 2, value: 'Gratuit' },
      [price]: 20,
    });

    expect(free.isFree).toBe(true);
    expect(paid.isFree).toBe(false);
  });

  it('lit les tables de référence avec les colonnes de la config', async () => {
    const config = buildTestConfig();
    config.baserow.mapping.referenceFields = {
      name: 'Libellé',
      logo: 'Image',
      picto: 'Icône',
      color: 'Teinte',
    };
    const service = buildService(config, {
      BASEROW_API_URL: 'http://baserow.test',
      BASEROW_API_TOKEN: 'token',
      BASEROW_FORMATS_TABLE_ID: '5',
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          next: null,
          results: [
            {
              id: 9,
              Libellé: 'Festival',
              Icône: [{ id: 1, value: 'PartyPopper' }],
              Teinte: [{ id: 2, value: '#E74C8C' }],
            },
          ],
        }),
    });
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const map = await service.fetchLinkedTableMap('BASEROW_FORMATS_TABLE');
      expect(map.get('9')).toEqual({
        id: '9',
        name: 'Festival',
        logoUrl: undefined,
        pictoName: 'PartyPopper',
        colorHexa: '#E74C8C',
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("signale (une fois) l'absence de la colonne du nom dans une table de référence", async () => {
    const config = buildTestConfig();
    const service = buildService(config, {
      BASEROW_API_URL: 'http://baserow.test',
      BASEROW_API_TOKEN: 'token',
      BASEROW_FORMATS_TABLE_ID: '5',
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ next: null, results: [{ id: 1, Intitulé: 'X' }] }),
    });
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      await service.fetchLinkedTableMap('BASEROW_FORMATS_TABLE');
      await service.fetchLinkedTableMap('BASEROW_FORMATS_TABLE');
    } finally {
      global.fetch = originalFetch;
    }
    const messages = warn.mock.calls
      .map((c) => String(c[0]))
      .filter((m) => m.includes('baserow.mapping.referenceFields.name'));
    expect(messages).toHaveLength(1);
  });
});
