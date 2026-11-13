import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@make-map/types';
import { BaserowService } from './baserow.service';
import type { BaserowRecord } from './baserow.types';
import type { GeocodingService } from '../geocoding/geocoding.service';
import type { AppConfigService } from '../config/config.service';
import { buildTestConfig } from '../../test/test-config';
import { checkEventColumns } from './baserow-schema.util';

/**
 * « Coup de cœur » : rôle OPTIONNEL `baserow.fieldMapping.highlight` (colonne case à cocher).
 * Rôle absent = fonctionnalité inactive, sans avertissement répété ; valeur non booléenne = non coché.
 */
type Private = {
  transformRecord(
    record: BaserowRecord,
    partners: Map<string, unknown>,
    themes: Map<string, unknown>,
    formats: Map<string, unknown>,
    publics: Map<string, unknown>,
  ): Record<string, unknown>;
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
  const configService = { get: () => undefined } as unknown as ConfigService;
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

describe('BaserowService : coup de cœur (rôle optionnel fieldMapping.highlight)', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const configWithHighlight = (column = 'Favori'): AppConfig => {
    const config = buildTestConfig();
    config.baserow.fieldMapping.highlight = column;
    return config;
  };

  it('marque un événement dont la case configurée est cochée', () => {
    const service = buildService(configWithHighlight('Favori'));

    expect(transform(service, { id: 1, Favori: true }).isHighlighted).toBe(
      true,
    );
  });

  it('ne marque pas un événement dont la case est décochée', () => {
    const service = buildService(configWithHighlight('Favori'));

    expect(transform(service, { id: 1, Favori: false }).isHighlighted).toBe(
      false,
    );
  });

  it("ne marque pas l'événement quand la colonne est absente de l'enregistrement, sans lever d'erreur", () => {
    const service = buildService(configWithHighlight('Favori'));

    expect(transform(service, { id: 1 }).isHighlighted).toBe(false);
  });

  it('ne tient pour coché que le booléen true (texte, nombre ou valeur vide = non coché)', () => {
    const service = buildService(configWithHighlight('Favori'));

    for (const value of ['true', 'Oui', 1, null, '']) {
      expect(transform(service, { id: 1, Favori: value }).isHighlighted).toBe(
        false,
      );
    }
  });

  it('lit la colonne désignée par la config, pas un nom en dur', () => {
    const service = buildService(configWithHighlight('Coup de cœur maison'));

    expect(
      transform(service, { id: 1, 'Coup de cœur maison': true }).isHighlighted,
    ).toBe(true);
    expect(
      transform(service, { id: 2, 'Coup de cœur': true }).isHighlighted,
    ).toBe(false);
  });

  it('désactive la fonctionnalité quand le rôle est absent de la config, sans avertissement répété', () => {
    const config = buildTestConfig();
    delete config.baserow.fieldMapping.highlight; // rôle optionnel retiré
    const service = buildService(config);

    const first = transform(service, { id: 1, Favori: true });
    transform(service, { id: 2, Favori: true });

    expect(first.isHighlighted).toBe(false);
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.filter((m) => m.includes('highlight'))).toHaveLength(0);
  });

  it('signale par le contrôle du schéma une colonne déclarée mais absente de Baserow', () => {
    const config = configWithHighlight('Favori');

    const messages = checkEventColumns(
      Object.values(config.baserow.fieldMapping).filter(
        (column) => column !== 'Favori',
      ),
      config.baserow.fieldMapping,
    );

    expect(
      messages.some(
        (m) =>
          m.includes('Favori') && m.includes('baserow.fieldMapping.highlight'),
      ),
    ).toBe(true);
  });
});
