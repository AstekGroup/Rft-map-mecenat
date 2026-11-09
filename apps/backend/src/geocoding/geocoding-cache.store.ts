import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/** Résultat d'un géocodage réussi (structure partagée avec `GeocodingService`). */
export interface CachedGeocode {
  latitude: number;
  longitude: number;
  region: string;
  department: string;
  cityCode: string;
}

/** Nature d'un échec : adresse inconnue de la BAN, ou erreur HTTP / réseau passagère. */
export type GeocodeFailure = 'not_found' | 'error';

/** Une entrée du cache : soit un résultat, soit un échec avec sa date de nouvelle tentative. */
export interface GeocodingCacheEntry {
  result?: CachedGeocode;
  failure?: GeocodeFailure;
  /** Date du géocodage (ms depuis epoch). */
  geocodedAt: number;
  /** Échec uniquement : pas de nouvelle tentative avant cette date (ms depuis epoch). */
  retryAfter?: number;
  /** Dernière fois qu'un événement a demandé cette adresse (sert à purger les orphelins). */
  lastUsedAt: number;
}

interface CacheFile {
  version: number;
  entries: Record<string, GeocodingCacheEntry>;
}

export const GEOCODING_CACHE_VERSION = 1;
/** Une entrée qu'aucun événement n'a demandée depuis ce délai est supprimée à l'écriture. */
export const ORPHAN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Sans nouveau géocodage, on réécrit tout de même au plus une fois par jour (dates d'usage). */
const TOUCH_FLUSH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Cache de géocodage en mémoire, persisté dans un fichier JSON quand un chemin est fourni.
 * Sans chemin (ou si le fichier est inutilisable) il fonctionne en mémoire seule : un problème
 * de disque ne doit jamais empêcher la carte de répondre.
 */
export class GeocodingCacheStore {
  private readonly logger = new Logger(GeocodingCacheStore.name);
  private readonly entries = new Map<string, GeocodingCacheEntry>();
  private dirty = false;
  private touched = false;
  private lastFlushAt = 0;
  private writeWarned = false;
  private flushing: Promise<void> = Promise.resolve();

  constructor(private readonly filePath?: string) {}

  /** Charge le fichier. Absent : cache vide. Illisible : mis de côté, cache vide. */
  load(): void {
    if (!this.filePath) {
      this.logger.log(
        'Cache de géocodage en mémoire seule (GEOCODING_CACHE_PATH non défini) : il est perdu à chaque redémarrage.',
      );
      return;
    }

    let raw: string;
    try {
      raw = fs.readFileSync(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.log(
          `Aucun cache de géocodage à ${this.filePath} : il sera créé au premier géocodage.`,
        );
      } else {
        this.quarantine(`lecture impossible (${String(error)})`);
      }
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<CacheFile>;
      if (
        parsed.version !== GEOCODING_CACHE_VERSION ||
        !parsed.entries ||
        typeof parsed.entries !== 'object'
      ) {
        this.quarantine(
          `format inconnu (version ${String(parsed.version)}, attendue ${GEOCODING_CACHE_VERSION})`,
        );
        return;
      }
      for (const [key, entry] of Object.entries(parsed.entries)) {
        if (this.isValidEntry(entry)) this.entries.set(key, entry);
      }
      this.lastFlushAt = Date.now();
      this.logger.log(
        `Cache de géocodage chargé : ${this.entries.size} adresses (${this.filePath}).`,
      );
    } catch (error) {
      this.quarantine(`JSON invalide (${String(error)})`);
    }
  }

  get(key: string): GeocodingCacheEntry | undefined {
    const entry = this.entries.get(key);
    if (entry) {
      entry.lastUsedAt = Date.now();
      this.touched = true;
    }
    return entry;
  }

  set(key: string, entry: GeocodingCacheEntry): void {
    this.entries.set(key, entry);
    this.dirty = true;
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.dirty = true;
  }

  /**
   * Écrit le fichier si quelque chose a changé : une seule écriture par lot, atomique
   * (fichier temporaire puis `rename`). Ne lève jamais : un échec est journalisé une fois.
   */
  flush(): Promise<void> {
    this.flushing = this.flushing.then(() => this.doFlush());
    return this.flushing;
  }

  private async doFlush(): Promise<void> {
    if (!this.filePath) return;
    const now = Date.now();
    const touchedDue =
      this.touched && now - this.lastFlushAt >= TOUCH_FLUSH_INTERVAL_MS;
    if (!this.dirty && !touchedDue) return;

    this.purgeOrphans(now);

    const content: CacheFile = {
      version: GEOCODING_CACHE_VERSION,
      entries: Object.fromEntries(this.entries),
    };
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    try {
      await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.promises.writeFile(tmpPath, JSON.stringify(content), 'utf8');
      await fs.promises.rename(tmpPath, this.filePath);
      this.dirty = false;
      this.touched = false;
      this.lastFlushAt = now;
      this.writeWarned = false;
    } catch (error) {
      await fs.promises.rm(tmpPath, { force: true }).catch(() => undefined);
      if (!this.writeWarned) {
        this.writeWarned = true;
        this.logger.warn(
          `Écriture du cache de géocodage impossible (${this.filePath}) : ${String(error)}. Le cache continue en mémoire.`,
        );
      }
    }
  }

  private purgeOrphans(now: number): void {
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (now - entry.lastUsedAt > ORPHAN_MAX_AGE_MS) {
        this.entries.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(
        `${removed} adresse(s) inutilisée(s) depuis 30 jours retirée(s) du cache de géocodage.`,
      );
    }
  }

  /** Met le fichier inutilisable de côté pour ne pas l'écraser, puis repart d'un cache vide. */
  private quarantine(reason: string): void {
    if (!this.filePath) return;
    const target = `${this.filePath}.corrompu-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    try {
      fs.renameSync(this.filePath, target);
      this.logger.warn(
        `Cache de géocodage inutilisable (${reason}) : mis de côté dans ${target}, cache vide.`,
      );
    } catch (error) {
      this.logger.warn(
        `Cache de géocodage inutilisable (${reason}) et impossible à mettre de côté (${String(error)}) : cache vide.`,
      );
    }
  }

  private isValidEntry(entry: unknown): entry is GeocodingCacheEntry {
    if (!entry || typeof entry !== 'object') return false;
    const e = entry as Partial<GeocodingCacheEntry>;
    if (typeof e.geocodedAt !== 'number' || typeof e.lastUsedAt !== 'number') {
      return false;
    }
    if (e.result) {
      return (
        typeof e.result.latitude === 'number' &&
        typeof e.result.longitude === 'number'
      );
    }
    return e.failure === 'not_found' || e.failure === 'error';
  }
}
