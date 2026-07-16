import { Injectable, Logger } from '@nestjs/common';
import type { Event, Partner } from '@make-map/types';
import { BaserowService } from '../baserow/baserow.service';

interface CachedData {
  events: Event[];
  timestamp: number;
}

interface CachedPartners {
  partners: Partner[];
  timestamp: number;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  // Cache en mémoire avec TTL
  private cache: CachedData | null = null;
  private devCache: CachedData | null = null;
  private partnersCache: CachedPartners | null = null;
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
  async findAllPartners(): Promise<Partner[]> {
    if (
      this.partnersCache &&
      Date.now() - this.partnersCache.timestamp < this.CACHE_TTL
    ) {
      return this.partnersCache.partners;
    }

    this.logger.log(`Cache miss partners, chargement depuis Baserow...`);
    const partners = await this.baserowService.fetchPartners();
    this.partnersCache = { partners, timestamp: Date.now() };
    return partners;
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
