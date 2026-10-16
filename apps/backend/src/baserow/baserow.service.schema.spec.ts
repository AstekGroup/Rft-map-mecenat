import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@make-map/types';
import { BaserowService } from './baserow.service';
import type { GeocodingService } from '../geocoding/geocoding.service';
import type { AppConfigService } from '../config/config.service';
import { buildTestConfig } from '../../test/test-config';

const ENV: Record<string, string> = {
  BASEROW_API_URL: 'http://baserow.test',
  BASEROW_API_TOKEN: 'token',
  BASEROW_EVENT_TABLE_ID: '1',
  BASEROW_PARTNERS_TABLE_ID: '2',
  BASEROW_THEMATIQUES_TABLE_ID: '3',
  BASEROW_FORMATS_TABLE_ID: '4',
  BASEROW_PUBLICS_TABLE_ID: '5',
};

function buildService(config: AppConfig, env: Record<string, string> = ENV) {
  const appConfig = {
    get: () => config,
    get safe() {
      return config;
    },
  } as unknown as AppConfigService;
  return new BaserowService(
    { get: (key: string) => env[key] } as unknown as ConfigService,
    {} as unknown as GeocodingService,
    appConfig,
  );
}

/** Une ligne par table : les clés sont les colonnes. `null` = table vide, `'erreur'` = HTTP 500. */
function mockTables(tables: Record<string, string[] | null | 'erreur'>) {
  const mock = jest.fn((url: string) => {
    const tableId = /rows\/table\/(\d+)\//.exec(url)?.[1] as string;
    const columns = tables[tableId];
    if (columns === 'erreur') {
      return Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' });
    }
    const results = columns
      ? [Object.fromEntries([['id', 1], ...columns.map((c) => [c, null])])]
      : [];
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ count: results.length, next: null, results }),
    });
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('BaserowService.checkSchema', () => {
  const originalFetch = global.fetch;
  let error: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let config: AppConfig;
  let eventColumns: string[];
  let referenceTables: Record<string, string[] | null | 'erreur'>;

  beforeEach(() => {
    config = buildTestConfig();
    const ref = config.baserow.mapping.referenceFields;
    eventColumns = Object.values(config.baserow.fieldMapping);
    referenceTables = {
      '2': [ref.name, ref.logo],
      '3': [ref.name, ref.picto, ref.color],
      '4': [ref.name, ref.picto, ref.color],
      '5': [ref.name, ref.picto, ref.color],
    };
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('ne signale rien quand le schéma correspond à la config', async () => {
    mockTables({ '1': eventColumns, ...referenceTables });

    await expect(buildService(config).checkSchema()).resolves.toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });

  it('journalise précisément une colonne renommée dans Baserow', async () => {
    const renamed = eventColumns.map((c) =>
      c === config.baserow.fieldMapping.city ? "Commune de l'event" : c,
    );
    mockTables({ '1': renamed, ...referenceTables });

    const issues = await buildService(config).checkSchema();

    expect(issues.join('\n')).toContain(`« ${config.baserow.fieldMapping.city} » (baserow.fieldMapping.city)`);
    expect(issues.join('\n')).toContain("« Commune de l'event »");
    expect(error).toHaveBeenCalled();
  });

  it('suit la config : la même colonne renommée ne pose plus de problème une fois la config adaptée', async () => {
    config.baserow.fieldMapping.city = "Commune de l'event";
    const renamed = eventColumns.map((c) => (c === 'Commune' ? "Commune de l'event" : c));
    mockTables({ '1': renamed, ...referenceTables });

    await expect(buildService(config).checkSchema()).resolves.toEqual([]);
  });

  it('signale la colonne du nom absente d\'une table de référence', async () => {
    referenceTables['4'] = ['Autre nom'];
    mockTables({ '1': eventColumns, ...referenceTables });

    const issues = await buildService(config).checkSchema();

    expect(issues.join('\n')).toContain('BASEROW_FORMATS_TABLE');
    expect(issues.join('\n')).toContain('baserow.mapping.referenceFields.name');
  });

  it('signale une table vide sans échouer', async () => {
    mockTables({ '1': null, ...referenceTables });

    await expect(buildService(config).checkSchema()).resolves.toEqual([]);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('Table des événements vide'))).toBe(true);
  });

  it('ne lève jamais quand Baserow répond en erreur ou est injoignable', async () => {
    mockTables({ '1': 'erreur', ...referenceTables });
    await expect(buildService(config).checkSchema()).resolves.toEqual([]);

    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    await expect(buildService(config).checkSchema()).resolves.toEqual([]);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('impossible'))).toBe(true);
  });

  it('signale une variable de table de référence absente et poursuit le contrôle', async () => {
    const { BASEROW_FORMATS_TABLE_ID: _omitted, ...env } = ENV;
    mockTables({ '1': eventColumns, ...referenceTables });

    await expect(buildService(config, env).checkSchema()).resolves.toEqual([]);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('BASEROW_FORMATS_TABLE_ID'))).toBe(true);
  });

  it('signale une colonne renommée pendant que le serveur tourne, une seule fois par écart', () => {
    const service = buildService(config) as unknown as {
      checkRecordColumns(record: Record<string, unknown>): void;
    };
    const record = Object.fromEntries(
      eventColumns
        .filter((c) => c !== config.baserow.fieldMapping.city)
        .map((c) => [c, null]),
    );

    service.checkRecordColumns({ id: 1, ...record });
    service.checkRecordColumns({ id: 2, ...record });

    const messages = error.mock.calls
      .map((c) => String(c[0]))
      .filter((m) => m.includes('baserow.fieldMapping.city'));
    expect(messages).toHaveLength(1);
  });

  it('refuse de contrôler sans connexion configurée, avec un avertissement', async () => {
    const fetchMock = mockTables({});

    await expect(buildService(config, {}).checkSchema()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});
