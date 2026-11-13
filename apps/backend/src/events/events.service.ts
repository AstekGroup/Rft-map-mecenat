import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import type { Event, LinkedTableRow } from '@make-map/types';
import { BaserowService } from '../baserow/baserow.service';

interface CachedData {
  events: Event[];
  timestamp: number;
  /** Durée de validité (ms) : courte quand le chargement était dégradé. */
  ttl: number;
  /** Dernier chargement réussi depuis Baserow (inchangé par les échecs de rafraîchissement). */
  loadedAt: number;
}

interface CachedLinkedTable {
  values: LinkedTableRow[];
  timestamp: number;
}

@Injectable()
export class EventsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);

  // Cache en mémoire avec TTL
  private cache: CachedData | null = null;
  private devCache: CachedData | null = null;
  private partnersCache: CachedLinkedTable | null = null;
  private themesCache: CachedLinkedTable | null = null;
  private formatsCache: CachedLinkedTable | null = null;
  private publicsCache: CachedLinkedTable | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  // Quand une table de référence était en erreur, les événements ont été servis sans leurs
  // partenaires/thématiques/formats/publics : on ne fige pas ce résultat 5 minutes.
  private readonly DEGRADED_CACHE_TTL = 30 * 1000; // 30 secondes
  // Une liste périmée n'est servie que pendant le rafraîchissement ou une panne passagère de
  // Baserow, pas indéfiniment : un événement retiré de la modération ne doit pas rester public.
  // Au-delà, on ne sert plus rien (erreur, comme avant l'arrivée du cache en arrière-plan).
  private readonly MAX_STALE_AGE = 60 * 60 * 1000; // 1 heure

  /** Chargements en cours (un par mode) : les requêtes simultanées partagent le même. */
  private readonly loading = new Map<boolean, Promise<Event[]>>();
  private refreshTimer: NodeJS.Timeout | null = null;
  /** Vérification périodique : le rafraîchissement lui-même suit les TTL ci-dessus. */
  private readonly REFRESH_CHECK_INTERVAL = 30 * 1000;

  constructor(private readonly baserowService: BaserowService) {}

  /**
   * Au démarrage : charge les événements sans attendre (le port s'ouvre tout de suite) puis
   * vérifie périodiquement si le cache a expiré, pour que les visiteurs ne paient jamais
   * ni la lecture Baserow ni le géocodage. Le mode `devMode` reste à la demande.
   */
  onApplicationBootstrap(): void {
    this.refreshInBackground(false);
    this.refreshTimer = setInterval(() => {
      const cached = this.cache;
      if (!cached || Date.now() - cached.timestamp >= cached.ttl) {
        this.refreshInBackground(false);
      }
    }, this.REFRESH_CHECK_INTERVAL);
    // N'empêche pas l'arrêt du processus.
    this.refreshTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Récupère tous les événements (avec cache TTL).
   *
   * Cache expiré mais présent : la liste précédente est servie tout de suite et un
   * rafraîchissement part en arrière-plan (jamais d'attente pour le visiteur).
   * Aucun cache : le visiteur attend le chargement, partagé avec les requêtes simultanées.
   */
  async findAll(devMode = false): Promise<Event[]> {
    const cached = devMode ? this.devCache : this.cache;

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.logger.debug(
        `Cache hit (${devMode ? 'dev' : 'prod'}, âge: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`,
      );
      return cached.events;
    }

    if (cached && Date.now() - cached.loadedAt < this.MAX_STALE_AGE) {
      this.logger.debug(
        `Cache expiré (${devMode ? 'dev' : 'prod'}) : liste précédente servie, rafraîchissement en arrière-plan`,
      );
      this.refreshInBackground(devMode);
      return cached.events;
    }

    this.logger.log(`Cache miss, chargement depuis Baserow...`);
    return this.load(devMode);
  }

  /** Lance un rafraîchissement dont l'échec est journalisé (jamais d'exception non gérée). */
  private refreshInBackground(devMode: boolean): void {
    this.load(devMode).catch(() => undefined);
  }

  /**
   * Un seul chargement à la fois par mode. En cas d'échec avec une liste déjà en cache, on la
   * garde (30 s avant la prochaine tentative, pour ne pas marteler Baserow) ; sans liste,
   * l'erreur remonte comme avant.
   */
  private load(devMode: boolean): Promise<Event[]> {
    const running = this.loading.get(devMode);
    if (running) return running;

    const promise = (async () => {
      try {
        const events = await this.baserowService.fetchEvents(devMode);
        const degraded = this.baserowService.degradedReferences();
        const now = Date.now();
        this.setCache(devMode, {
          events,
          timestamp: now,
          loadedAt: now,
          ttl: degraded.length > 0 ? this.DEGRADED_CACHE_TTL : this.CACHE_TTL,
        });
        return events;
      } catch (error) {
        const cached = devMode ? this.devCache : this.cache;
        const previous =
          cached && Date.now() - cached.loadedAt < this.MAX_STALE_AGE
            ? cached
            : null;
        this.logger.error(
          `Rafraîchissement des événements impossible${previous ? ' : liste précédente conservée' : ''} : ${error instanceof Error ? error.message : String(error)}`,
        );
        if (previous) {
          this.setCache(devMode, {
            events: previous.events,
            timestamp: Date.now(),
            loadedAt: previous.loadedAt,
            ttl: this.DEGRADED_CACHE_TTL,
          });
          return previous.events;
        }
        throw error;
      }
    })();

    this.loading.set(devMode, promise);
    const clear = () => {
      if (this.loading.get(devMode) === promise) this.loading.delete(devMode);
    };
    promise.then(clear, clear);
    return promise;
  }

  private setCache(devMode: boolean, data: CachedData): void {
    if (devMode) {
      this.devCache = data;
    } else {
      this.cache = data;
    }
  }

  /**
   * Récupère tous les partenaires (avec cache TTL).
   */
  async findAllPartners(): Promise<LinkedTableRow[]> {
    if (
      this.partnersCache &&
      Date.now() - this.partnersCache.timestamp < this.CACHE_TTL
    ) {
      return this.partnersCache.values;
    }

    this.logger.log(`Cache miss partners, chargement depuis Baserow...`);
    const partners = await this.baserowService.fetchLinkedTableRow(
      'BASEROW_PARTNERS_TABLE',
    );
    this.partnersCache = { values: partners, timestamp: Date.now() };
    return partners;
  }

  /**
   * Récupère tous les thèmes (avec cache TTL).
   */
  async findAllThemes(): Promise<LinkedTableRow[]> {
    if (
      this.themesCache &&
      Date.now() - this.themesCache.timestamp < this.CACHE_TTL
    ) {
      return this.themesCache.values;
    }

    this.logger.log(`Cache miss themes, chargement depuis Baserow...`);

    const themes = await this.baserowService.fetchLinkedTableRow(
      'BASEROW_THEMATIQUES_TABLE',
    );
    this.themesCache = { values: themes, timestamp: Date.now() };
    return themes;
  }

  /**
   * Récupère tous les formats (avec cache TTL).
   */
  async findAllFormats(): Promise<LinkedTableRow[]> {
    if (
      this.formatsCache &&
      Date.now() - this.formatsCache.timestamp < this.CACHE_TTL
    ) {
      return this.formatsCache.values;
    }

    this.logger.log(`Cache miss format, chargement depuis Baserow...`);

    const formats = await this.baserowService.fetchLinkedTableRow(
      'BASEROW_FORMATS_TABLE',
    );
    this.formatsCache = { values: formats, timestamp: Date.now() };
    return formats;
  }

  /**
   * Récupère tous les publics cible (avec cache TTL).
   */
  async findAllPublics(): Promise<LinkedTableRow[]> {
    if (
      this.publicsCache &&
      Date.now() - this.publicsCache.timestamp < this.CACHE_TTL
    ) {
      return this.publicsCache.values;
    }

    this.logger.log(`Cache miss publics, chargement depuis Baserow...`);

    const publics = await this.baserowService.fetchLinkedTableRow(
      'BASEROW_PUBLICS_TABLE',
    );
    this.publicsCache = { values: publics, timestamp: Date.now() };
    return publics;
  }

  /**
   * Récupère un événement par son ID.
   */
  async findOne(id: string, devMode = false): Promise<Event | null> {
    const events = await this.findAll(devMode);
    return events.find((e) => e.id === id) || null;
  }

  /**
   * Force le rafraîchissement du cache.
   */
  invalidateCache(): void {
    this.cache = null;
    this.devCache = null;
    this.partnersCache = null;
    this.logger.log('Cache invalidé');
  }
}
