import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@make-map/types';
import { AppConfigService } from './config.service';
import { BaserowService } from '../baserow/baserow.service';
import type { BaserowRecord } from '../baserow/baserow.types';
import type { GeocodingService } from '../geocoding/geocoding.service';

/**
 * « 1 code, N cartes » : le même code (service de config, validation, gabarits, transformation
 * des événements) est exécuté avec deux configs de carte réelles, la config du dépôt et la
 * fixture « seconde carte ». Rien dans le code ne doit dépendre de la carte : titres, dates et
 * thème viennent de la config.
 */
const ROOT = resolve(__dirname, '../../../../');
const MAPS = [
  { label: 'carte du dépôt', file: 'app.config.json' },
  {
    label: 'seconde carte',
    file: 'docs/audit/fixtures/app.config.second-map.json',
  },
] as const;

const absolute = (file: string) => resolve(ROOT, file);
const readRaw = (file: string) =>
  JSON.parse(readFileSync(absolute(file), 'utf-8')) as AppConfig;

/** Charge une config par le vrai service, comme le backend au démarrage. */
function loadServed(file: string): AppConfig {
  const env = {
    get: (key: string) =>
      key === 'APP_CONFIG_PATH' ? absolute(file) : undefined,
  } as unknown as ConfigService;
  const service = new AppConfigService(env);
  service.onModuleInit();
  return service.safe;
}

type Transformer = {
  transformRecord(
    record: BaserowRecord,
    partners: Map<string, unknown>,
    themes: Map<string, unknown>,
    formats: Map<string, unknown>,
    publics: Map<string, unknown>,
  ): { title: string; isDuringWeek: boolean; isHighlighted: boolean };
};

/** Transforme un événement avec le vrai `BaserowService` configuré par `config`. */
function transformWith(
  config: AppConfig,
  startDate: string,
  extra: BaserowRecord = { id: 1 },
) {
  const appConfig = {
    get: () => config,
    get safe() {
      return config;
    },
    get eventDates() {
      return config.app.eventDates;
    },
  };
  const service = new BaserowService(
    { get: () => undefined } as unknown as ConfigService,
    {
      getRegionFromPostalCode: () => 'Région de test',
    } as unknown as GeocodingService,
    appConfig as never,
  ) as unknown as Transformer;
  const fm = config.baserow.fieldMapping;
  const empty = new Map<string, never>();
  return service.transformRecord(
    { ...extra, id: 1, [fm.title]: 'Atelier', [fm.startDate]: startDate },
    empty,
    empty,
    empty,
    empty,
  );
}

describe('deux cartes, un seul code', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe.each(MAPS)('$label', ({ file }) => {
    it('est acceptée au démarrage et servie avec ses gabarits résolus', () => {
      const served = loadServed(file);
      expect(JSON.stringify(served)).not.toContain('{{');
    });

    it("reprend le nom de l'événement dans tous les titres, sans le répéter dans la config", () => {
      const raw = readRaw(file);
      const served = loadServed(file);
      const name = raw.app.name;

      // Le nom est écrit une seule fois : les autres titres passent par un gabarit.
      expect(raw.texts.meta.title).toContain('{{app.name}}');
      expect(raw.texts.home.mainTitle).toBe('{{app.name}}');
      expect(JSON.stringify(raw.texts)).not.toContain(name);

      expect(served.texts.meta.title).toContain(name);
      expect(served.texts.meta.ogTitle).toContain(name);
      expect(served.texts.home.mainTitle).toBe(name);
      expect(served.texts.home.infoTitle).toContain(name);
      const duringWeek = served.filters.dateFilterModes.find(
        (m) => m.mode === 'during-week',
      );
      expect(duringWeek?.label).toContain(name);
    });

    it('sert les dates, le thème et les polices de sa propre config', () => {
      const raw = readRaw(file);
      const served = loadServed(file);

      expect(served.app.eventDates).toEqual(raw.app.eventDates);
      expect(served.theme.colors).toEqual(raw.theme.colors);
      expect(served.theme.fonts).toEqual(raw.theme.fonts);
    });
  });

  it('ne mélange rien entre les deux cartes', () => {
    const [first, second] = MAPS.map((m) => loadServed(m.file));
    const firstJson = JSON.stringify(first);
    const secondJson = JSON.stringify(second);

    expect(first.app.name).not.toBe(second.app.name);
    expect(first.app.eventDates).not.toEqual(second.app.eventDates);
    expect(first.theme.colors.primary).not.toBe(second.theme.colors.primary);
    expect(first.theme.fonts.heading).not.toBe(second.theme.fonts.heading);

    expect(secondJson).not.toContain(first.app.name);
    expect(secondJson).not.toContain(first.app.shortName);
    expect(firstJson).not.toContain(second.app.name);
    expect(firstJson).not.toContain(second.app.shortName);
  });

  it("calcule « pendant l'événement » avec les dates de la carte servie", () => {
    const [first, second] = MAPS.map((m) => loadServed(m.file));
    // Un jour au milieu de la période de chaque carte.
    const inFirst = `${first.app.eventDates.weekStart}T10:00:00Z`;
    const inSecond = `${second.app.eventDates.weekStart}T10:00:00Z`;

    expect(transformWith(first, inFirst).isDuringWeek).toBe(true);
    expect(transformWith(first, inSecond).isDuringWeek).toBe(false);
    expect(transformWith(second, inSecond).isDuringWeek).toBe(true);
    expect(transformWith(second, inFirst).isDuringWeek).toBe(false);
  });

  it('active le coup de cœur seulement sur la carte dont la config déclare le rôle highlight', () => {
    const [first, second] = MAPS.map((m) => loadServed(m.file));
    const start = (c: AppConfig) => `${c.app.eventDates.weekStart}T10:00:00Z`;

    // Carte 1 : rôle déclaré, la colonne cochée désigne un coup de cœur.
    const column = first.baserow.fieldMapping.highlight;
    expect(column).toBeTruthy();
    expect(
      transformWith(first, start(first), { id: 1, [column as string]: true })
        .isHighlighted,
    ).toBe(true);
    expect(
      transformWith(first, start(first), { id: 1, [column as string]: false })
        .isHighlighted,
    ).toBe(false);

    // Carte 2 : rôle absent de la config, même code, sans planter : jamais de coup de cœur,
    // même si l'enregistrement contient une colonne de ce nom.
    expect(second.baserow.fieldMapping.highlight).toBeUndefined();
    expect(
      transformWith(second, start(second), { id: 1, [column as string]: true })
        .isHighlighted,
    ).toBe(false);
  });

  it('lit les colonnes de chaque carte avec le même code', () => {
    for (const { file } of MAPS) {
      const config = loadServed(file);
      const event = transformWith(
        config,
        `${config.app.eventDates.weekStart}T10:00:00Z`,
      );
      expect(event.title).toBe('Atelier');
    }
  });
});
