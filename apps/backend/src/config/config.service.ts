import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { AppConfig } from '@make-map/types';
import { resolveConfigTemplates } from './config-template.util';
import { validateAppConfig } from './config-validation.util';

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private config: AppConfig | null = null;

  constructor(private readonly envConfig: ConfigService) {}

  onModuleInit() {
    this.loadConfig();
  }

  /**
   * Chemin de la config : `APP_CONFIG_PATH` si défini (un chemin relatif est lu depuis le
   * répertoire courant, `apps/backend` via pnpm), sinon `app.config.json` cherché autour du
   * backend. Aucun repli silencieux : une variable qui désigne un fichier absent est une erreur.
   */
  private resolveConfigPath(): string {
    const envPath = this.envConfig.get<string>('APP_CONFIG_PATH');
    if (envPath) {
      const absolute = resolve(envPath);
      if (!existsSync(absolute)) {
        throw new Error(
          `APP_CONFIG_PATH désigne un fichier introuvable : ${absolute} (un chemin relatif est lu depuis ${process.cwd()}). Corriger la variable, ou la retirer pour utiliser app.config.json.`,
        );
      }
      return absolute;
    }

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

    throw new Error(
      `Fichier de config introuvable. Chemins essayés :\n- ${candidates.join('\n- ')}\nDéfinir APP_CONFIG_PATH vers le app.config.json de la carte.`,
    );
  }

  /**
   * Lit, résout les gabarits puis valide la config. Une config illisible ou invalide fait
   * échouer le démarrage avec toutes les erreurs listées : mieux vaut s'arrêter tout de suite
   * qu'afficher une carte fausse ou répondre 500 à chaque requête.
   */
  private loadConfig(): void {
    const resolvedPath = this.resolveConfigPath();

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(resolvedPath, 'utf-8'));
    } catch (error) {
      const message = `Config illisible (${resolvedPath}) : ${error.message}`;
      this.logger.error(message);
      throw new Error(message);
    }

    const config = resolveConfigTemplates(parsed as AppConfig, (message) =>
      this.logger.warn(message),
    );

    const { errors, warnings } = validateAppConfig(config);
    for (const warning of warnings) {
      this.logger.warn(`Config ${resolvedPath} : ${warning}`);
    }
    if (errors.length > 0) {
      for (const error of errors) {
        this.logger.error(`Config ${resolvedPath} : ${error}`);
      }
      throw new Error(
        `Configuration invalide (${resolvedPath}), ${errors.length} erreur(s) :\n- ${errors.join('\n- ')}`,
      );
    }

    this.config = config;
    this.logger.log(
      `Configuration chargée depuis ${resolvedPath} (profil: ${config.profile})`,
    );
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

  get theme() {
    return this.safe.theme;
  }

  /** Dates de l'événement ; les clés peuvent manquer si la config est incomplète (vérifié par `computeIsDuringWeek`). */
  get eventDates(): { weekStart?: string; weekEnd?: string } {
    return this.safe.app?.eventDates ?? {};
  }
}
