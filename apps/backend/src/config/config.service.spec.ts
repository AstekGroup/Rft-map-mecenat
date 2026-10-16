import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config.service';
import { buildTestConfig } from '../../test/test-config';

describe('AppConfigService', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'app-config-'));
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  function serviceFor(envPath: string | undefined): AppConfigService {
    const env = { get: (key: string) => (key === 'APP_CONFIG_PATH' ? envPath : undefined) };
    return new AppConfigService(env as unknown as ConfigService);
  }

  function write(content: unknown, name = 'app.config.json'): string {
    const path = join(dir, name);
    writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content), 'utf-8');
    return path;
  }

  describe('gabarits', () => {
    it('sert une config dont les gabarits sont résolus', () => {
      const config = buildTestConfig();
      config.app.name = 'Les Journées du Test';
      config.texts.home.mainTitle = '{{app.name}}';
      const service = serviceFor(write(config));

      service.onModuleInit();

      expect(service.safe.texts.home.mainTitle).toBe('Les Journées du Test');
    });
  });

  describe('validation au démarrage', () => {
    it('charge une config valide', () => {
      const service = serviceFor(write(buildTestConfig()));
      service.onModuleInit();
      expect(service.get()?.profile).toBe('test');
    });

    it('refuse de démarrer avec une config invalide, en listant toutes les erreurs', () => {
      const config = buildTestConfig() as unknown as Record<string, any>;
      config.app.eventDates.weekStart = 'bientôt';
      delete config.baserow.fieldMapping.city;
      const service = serviceFor(write(config));

      expect(() => service.onModuleInit()).toThrow(/Configuration invalide/);
      expect(() => service.onModuleInit()).toThrow(/app\.eventDates\.weekStart/);
      expect(() => service.onModuleInit()).toThrow(/baserow\.fieldMapping\.city/);
      expect(service.get()).toBeNull();
    });

    it('journalise chaque erreur avant de refuser', () => {
      const error = jest.spyOn(Logger.prototype, 'error');
      const config = buildTestConfig() as unknown as Record<string, any>;
      delete config.baserow.mapping.tariffFreeValue;
      const service = serviceFor(write(config));

      expect(() => service.onModuleInit()).toThrow();
      expect(error.mock.calls.some((c) => String(c[0]).includes('tariffFreeValue'))).toBe(true);
    });

    it('journalise les avertissements sans refuser de démarrer', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');
      const config = buildTestConfig() as unknown as Record<string, any>;
      config.baserow.fieldMapping.ancienneCle = 'Colonne';
      const service = serviceFor(write(config));

      service.onModuleInit();

      expect(service.get()).not.toBeNull();
      expect(warn.mock.calls.some((c) => String(c[0]).includes('ancienneCle'))).toBe(true);
    });

    it('refuse un fichier qui n\'est pas du JSON', () => {
      const service = serviceFor(write('{ pas du json'));
      expect(() => service.onModuleInit()).toThrow(/illisible/);
    });
  });

  describe('APP_CONFIG_PATH', () => {
    it('refuse un chemin qui ne désigne aucun fichier (pas de repli silencieux sur la config par défaut)', () => {
      const service = serviceFor(join(dir, 'inexistant.json'));
      expect(() => service.onModuleInit()).toThrow(/APP_CONFIG_PATH.*inexistant\.json/);
    });
  });
});
