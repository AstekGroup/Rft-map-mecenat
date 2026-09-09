import { Injectable, Logger } from '@nestjs/common';
import type { Event, LinkedTableRow } from '@make-map/types';
import { BaserowService } from '../baserow/baserow.service';

interface CachedData {
  events: Event[];
  timestamp: number;
}

interface CachedLinkedTable {
  values: LinkedTableRow[];
  timestamp: number;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  // Cache en mémoire avec TTL
  private cache: CachedData | null = null;
  private devCache: CachedData | null = null;
  private partnersCache: CachedLinkedTable | null = null;
  private themesCache: CachedLinkedTable | null = null;
  private formatsCache: CachedLinkedTable | null = null;
  private publicsCache: CachedLinkedTable | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly baserowService: BaserowService) {}

  /**
   * Récupère tous les événements (avec cache TTL).
   */
  async findAll(devMode = false): Promise<Event[]> {
    const cached = devMode ? this.devCache : this.cache;

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(
        `Cache hit (${devMode ? 'dev' : 'prod'}, âge: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`,
      );
      return cached.events;
    }

    this.logger.log(`Cache miss, chargement depuis Baserow...`);
    const events = await this.baserowService.fetchEvents(devMode);

    const newCache: CachedData = { events, timestamp: Date.now() };
    if (devMode) {
      this.devCache = newCache;
    } else {
      this.cache = newCache;
    }

    return events;
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
