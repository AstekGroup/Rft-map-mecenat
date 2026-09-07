import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { AppConfig } from '@make-map/types';

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private config: AppConfig | null = null;

  constructor(private readonly envConfig: ConfigService) {}

  onModuleInit() {
    this.loadConfig();
  }

  private resolveConfigPath(): string {
    const envPath = this.envConfig.get<string>('APP_CONFIG_PATH');
    if (envPath && existsSync(envPath)) return envPath;

    const candidates = [
      resolve(process.cwd(), 'app.config.json'),
      resolve(process.cwd(), '../app.config.json'),
      resolve(process.cwd(), '../../app.config.json'),
      resolve(__dirname, '../../../app.config.json'),
      resolve(__dirname, '../../app.config.json'),
    ];

    for (const p of candidates) {
      if (existsSync(p)) return p;
    }

    return candidates[0];
  }

  private loadConfig(): void {
    const resolvedPath = this.resolveConfigPath();

    if (!existsSync(resolvedPath)) {
      this.logger.warn(
        `Fichier de config introuvable: ${resolvedPath}. Utilisation des valeurs par défaut.`,
      );
      return;
    }

    try {
      const raw = readFileSync(resolvedPath, 'utf-8');
      this.config = JSON.parse(raw) as AppConfig;
      this.logger.log(
        `Configuration chargée depuis ${resolvedPath} (profil: ${this.config.profile})`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors du chargement de la config: ${error.message}`,
      );
    }
  }

  get(): AppConfig | null {
    return this.config;
  }

  get safe(): AppConfig {
    if (!this.config) {
      throw new Error('AppConfig non chargée. Vérifiez APP_CONFIG_PATH.');
    }
    return this.config;
  }

  baserowField(field: string): string {
    return this.safe.baserow.fieldMapping[field] || field;
  }

  get baserowMapping(): AppConfig['baserow'] {
    return this.safe.baserow;
  }

  get baserowMappingHints() {
    return this.safe.baserow.mappingHints || {};
  }

  get theme() {
    return this.safe.theme;
  }

  get eventDates() {
    return this.safe.app.eventDates;
  }
}
