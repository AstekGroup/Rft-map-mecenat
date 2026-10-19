import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { BaserowService } from './baserow.service';
import { ReferenceTableError } from './baserow.errors';
import type { GeocodingService } from '../geocoding/geocoding.service';
import type { AppConfigService } from '../config/config.service';
import { buildTestConfig } from '../../test/test-config';

type PrivateReferences = {
  fetchLinkedTableMap(table: string): Promise<Map<string, unknown>>;
  loadReferenceMap(table: string): Promise<Map<string, unknown>>;
};

const env: Record<string, string | undefined> = {
  BASEROW_API_URL: 'http://baserow.test',
  BASEROW_API_TOKEN: 'token',
  BASEROW_FORMATS_TABLE_ID: '10',
  BASEROW_PARTNERS_TABLE_ID: '11',
};

function buildService() {
  const config = buildTestConfig();
  const service = new BaserowService(
    { get: (key: string) => env[key] } as unknown as ConfigService,
    {} as unknown as GeocodingService,
    { get: () => config, safe: config } as unknown as AppConfigService,
  );
  return {
    service,
    internal: service as unknown as PrivateReferences,
  };
}

function okResponse(results: unknown[]) {
  return {
    ok: true,
    json: () => Promise.resolve({ results, next: null }),
  };
}

describe('BaserowService : table de référence en erreur ≠ table vide', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('une table vide donne une liste vide, sans erreur ni dégradation', async () => {
    fetchMock.mockResolvedValueOnce(okResponse([]));
    const { service } = buildService();

    await expect(
      service.fetchLinkedTableRow('BASEROW_FORMATS_TABLE'),
    ).resolves.toEqual([]);
    expect(service.degradedReferences()).toEqual([]);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("une table en erreur HTTP lève ReferenceTableError, journalise une erreur et marque l'API dégradée", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    const { service } = buildService();

    await expect(
      service.fetchLinkedTableRow('BASEROW_FORMATS_TABLE'),
    ).rejects.toBeInstanceOf(ReferenceTableError);
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('BASEROW_FORMATS_TABLE'),
    );
    expect(service.degradedReferences()).toEqual(['BASEROW_FORMATS_TABLE']);
    expect(service.getReferenceStatus()[0]).toMatchObject({
      table: 'BASEROW_FORMATS_TABLE',
      ok: false,
    });
  });

  it('une erreur réseau est traitée comme une erreur de table', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const { service } = buildService();

    await expect(
      service.fetchLinkedTableRow('BASEROW_PARTNERS_TABLE'),
    ).rejects.toThrow(ReferenceTableError);
    expect(service.degradedReferences()).toEqual(['BASEROW_PARTNERS_TABLE']);
  });

  it('le détail technique est dans l’erreur, pas perdu', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const { service } = buildService();

    await expect(
      service.fetchLinkedTableRow('BASEROW_PARTNERS_TABLE'),
    ).rejects.toMatchObject({
      table: 'BASEROW_PARTNERS_TABLE',
      message: expect.stringContaining('ECONNREFUSED'),
    });
  });

  it('la dégradation disparaît après une relecture réussie', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'KO' })
      .mockResolvedValueOnce(okResponse([{ id: 1, Nom: 'Atelier' }]));
    const { service } = buildService();

    await expect(
      service.fetchLinkedTableRow('BASEROW_FORMATS_TABLE'),
    ).rejects.toThrow(ReferenceTableError);
    expect(service.degradedReferences()).toEqual(['BASEROW_FORMATS_TABLE']);

    await service.fetchLinkedTableRow('BASEROW_FORMATS_TABLE');
    expect(service.degradedReferences()).toEqual([]);
  });

  it('chaque table a son propre état', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'KO' });
    const { service } = buildService();

    await service.fetchLinkedTableRow('BASEROW_FORMATS_TABLE');
    await expect(
      service.fetchLinkedTableRow('BASEROW_PARTNERS_TABLE'),
    ).rejects.toThrow(ReferenceTableError);

    expect(service.degradedReferences()).toEqual(['BASEROW_PARTNERS_TABLE']);
    expect(service.getReferenceStatus()).toHaveLength(2);
  });

  it('le chargement des événements continue avec une Map vide (erreur déjà journalisée)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'KO',
    });
    const { service, internal } = buildService();

    const map = await internal.loadReferenceMap('BASEROW_FORMATS_TABLE');

    expect(map.size).toBe(0);
    expect(errorLog).toHaveBeenCalled();
    expect(service.degradedReferences()).toEqual(['BASEROW_FORMATS_TABLE']);
  });
});

describe('BaserowService : pastilles de couleur des référentiels', () => {
  const originalFetch = global.fetch;
  let warnLog: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnLog = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('signale en un seul message les pastilles inconnues de la palette, sans bloquer la table', async () => {
    const { service } = buildService();
    const { name, color } = buildTestConfig().baserow.mapping.referenceFields;
    global.fetch = jest.fn().mockResolvedValue(
      okResponse([
        { id: 1, [name]: 'A', [color]: { id: 1, value: 'X', color: 'neon' } },
        { id: 2, [name]: 'B', [color]: { id: 2, value: 'Y', color: 'neon' } },
        { id: 3, [name]: 'C', [color]: { id: 3, value: 'Z', color: 'blue' } },
      ]),
    ) as unknown as typeof fetch;

    const rows = await service.fetchLinkedTableRow('BASEROW_FORMATS_TABLE');

    expect(rows).toHaveLength(3);
    const colorWarnings = warnLog.mock.calls.filter(([message]) =>
      String(message).includes('pastille'),
    );
    expect(colorWarnings).toHaveLength(1);
    expect(String(colorWarnings[0][0])).toContain('neon');
    expect(String(colorWarnings[0][0])).not.toContain('blue');
  });
});
