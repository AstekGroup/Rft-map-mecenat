import { BaserowService } from './baserow.service';
import type { ConfigService } from '@nestjs/config';
import type { GeocodingService } from '../geocoding/geocoding.service';
import type { AppConfigService } from '../config/config.service';

type PrivateFetchRecords = {
  fetchRecords(devMode: boolean): Promise<unknown[]>;
};

function buildService(
  env: Record<string, string | undefined>,
  baserowConfig: Record<string, unknown> = { moderationVisibleValue: 'Accepté' },
) {
  const configService = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  const appConfig = {
    get: () => ({ baserow: baserowConfig }),
  } as unknown as AppConfigService;
  return new BaserowService(
    configService,
    {} as unknown as GeocodingService,
    appConfig,
  ) as unknown as PrivateFetchRecords;
}

const baseEnv = {
  BASEROW_API_URL: 'http://baserow.test',
  BASEROW_API_TOKEN: 'token',
  BASEROW_EVENT_TABLE_ID: '1',
};

describe('BaserowService.fetchRecords (modération)', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('refuse de publier (fail-closed) si BASEROW_MODERATION_FIELD_ID est absent', async () => {
    const service = buildService(baseEnv);

    await expect(service.fetchRecords(false)).rejects.toThrow(
      /BASEROW_MODERATION_FIELD_ID manquant/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('autorise l\'absence du champ de modération en devMode', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [{ id: 1 }], next: null }),
    });
    const service = buildService(baseEnv);

    await expect(service.fetchRecords(true)).resolves.toHaveLength(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain('filter__field_');
  });

  it('applique le filtre de modération en mode normal', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [], next: null }),
    });
    const service = buildService({
      ...baseEnv,
      BASEROW_MODERATION_FIELD_ID: '711',
    });

    await service.fetchRecords(false);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('filter__field_711__contains_word=Accept%C3%A9');
  });

  it('refuse de publier (fail-closed) si la config ne donne pas la valeur de modération visible', async () => {
    const service = buildService(
      { ...baseEnv, BASEROW_MODERATION_FIELD_ID: '711' },
      {},
    );

    await expect(service.fetchRecords(false)).rejects.toThrow(
      /moderationVisibleValue/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lève une erreur explicite si le champ de modération a été supprimé', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () =>
        Promise.resolve(
          '{"error":"ERROR_FILTER_FIELD_NOT_FOUND","detail":"The field 711 was not found in the table."}',
        ),
    });
    const service = buildService({
      ...baseEnv,
      BASEROW_MODERATION_FIELD_ID: '711',
    });

    await expect(service.fetchRecords(false)).rejects.toThrow(
      /Champ de modération introuvable.*711/,
    );
  });
});
