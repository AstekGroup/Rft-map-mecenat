import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import {
  GeocodeFailure,
  GeocodingCacheEntry,
  GeocodingCacheStore,
} from './geocoding-cache.store';

// ============================================================
// Types
// ============================================================

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  region: string;
  department: string;
  cityCode: string;
}

interface BanFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    id: string;
    type: string;
    name: string;
    postcode: string;
    citycode: string;
    x: number;
    y: number;
    city: string;
    context: string; // "01, Ain, Auvergne-Rhône-Alpes"
    importance: number;
  };
}

interface BanResponse {
  type: 'FeatureCollection';
  features: BanFeature[];
}

interface GeocodingItem {
  id: string;
  address: string;
  postalCode: string;
  city: string;
}

// ============================================================
// Table code département -> région
// ============================================================

const DEPT_TO_REGION: Record<string, string> = {
  '01': 'Auvergne-Rhône-Alpes',
  '03': 'Auvergne-Rhône-Alpes',
  '07': 'Auvergne-Rhône-Alpes',
  '15': 'Auvergne-Rhône-Alpes',
  '26': 'Auvergne-Rhône-Alpes',
  '38': 'Auvergne-Rhône-Alpes',
  '42': 'Auvergne-Rhône-Alpes',
  '43': 'Auvergne-Rhône-Alpes',
  '63': 'Auvergne-Rhône-Alpes',
  '69': 'Auvergne-Rhône-Alpes',
  '73': 'Auvergne-Rhône-Alpes',
  '74': 'Auvergne-Rhône-Alpes',
  '21': 'Bourgogne-Franche-Comté',
  '25': 'Bourgogne-Franche-Comté',
  '39': 'Bourgogne-Franche-Comté',
  '58': 'Bourgogne-Franche-Comté',
  '70': 'Bourgogne-Franche-Comté',
  '71': 'Bourgogne-Franche-Comté',
  '89': 'Bourgogne-Franche-Comté',
  '90': 'Bourgogne-Franche-Comté',
  '22': 'Bretagne',
  '29': 'Bretagne',
  '35': 'Bretagne',
  '56': 'Bretagne',
  '18': 'Centre-Val de Loire',
  '28': 'Centre-Val de Loire',
  '36': 'Centre-Val de Loire',
  '37': 'Centre-Val de Loire',
  '41': 'Centre-Val de Loire',
  '45': 'Centre-Val de Loire',
  '2A': 'Corse',
  '2B': 'Corse',
  '20': 'Corse',
  '08': 'Grand Est',
  '10': 'Grand Est',
  '51': 'Grand Est',
  '52': 'Grand Est',
  '54': 'Grand Est',
  '55': 'Grand Est',
  '57': 'Grand Est',
  '67': 'Grand Est',
  '68': 'Grand Est',
  '88': 'Grand Est',
  '02': 'Hauts-de-France',
  '59': 'Hauts-de-France',
  '60': 'Hauts-de-France',
  '62': 'Hauts-de-France',
  '80': 'Hauts-de-France',
  '75': 'Île-de-France',
  '77': 'Île-de-France',
  '78': 'Île-de-France',
  '91': 'Île-de-France',
  '92': 'Île-de-France',
  '93': 'Île-de-France',
  '94': 'Île-de-France',
  '95': 'Île-de-France',
  '14': 'Normandie',
  '27': 'Normandie',
  '50': 'Normandie',
  '61': 'Normandie',
  '76': 'Normandie',
  '16': 'Nouvelle-Aquitaine',
  '17': 'Nouvelle-Aquitaine',
  '19': 'Nouvelle-Aquitaine',
  '23': 'Nouvelle-Aquitaine',
  '24': 'Nouvelle-Aquitaine',
  '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine',
  '47': 'Nouvelle-Aquitaine',
  '64': 'Nouvelle-Aquitaine',
  '79': 'Nouvelle-Aquitaine',
  '86': 'Nouvelle-Aquitaine',
  '87': 'Nouvelle-Aquitaine',
  '09': 'Occitanie',
  '11': 'Occitanie',
  '12': 'Occitanie',
  '30': 'Occitanie',
  '31': 'Occitanie',
  '32': 'Occitanie',
  '34': 'Occitanie',
  '46': 'Occitanie',
  '48': 'Occitanie',
  '65': 'Occitanie',
  '66': 'Occitanie',
  '81': 'Occitanie',
  '82': 'Occitanie',
  '44': 'Pays de la Loire',
  '49': 'Pays de la Loire',
  '53': 'Pays de la Loire',
  '72': 'Pays de la Loire',
  '85': 'Pays de la Loire',
  '04': "Provence-Alpes-Côte d'Azur",
  '05': "Provence-Alpes-Côte d'Azur",
  '06': "Provence-Alpes-Côte d'Azur",
  '13': "Provence-Alpes-Côte d'Azur",
  '83': "Provence-Alpes-Côte d'Azur",
  '84': "Provence-Alpes-Côte d'Azur",
  '971': 'Guadeloupe',
  '972': 'Martinique',
  '973': 'Guyane',
  '974': 'La Réunion',
  '976': 'Mayotte',
};

const BAN_API_URL = 'https://api-adresse.data.gouv.fr/search/';

/** Adresse inconnue de la BAN : on ne la redemande pas avant 24 h. */
export const NOT_FOUND_RETRY_MS = 24 * 60 * 60 * 1000;
/** Erreur HTTP ou réseau (passagère) : nouvelle tentative après 1 h. */
export const ERROR_RETRY_MS = 60 * 60 * 1000;

/** Issue d'une recherche d'adresse. */
type GeocodeOutcome =
  | { kind: 'ok'; result: GeocodingResult }
  | { kind: 'failed'; failure: GeocodeFailure };

/** Compteurs d'un lot, pour le journal (mesure avant/après). */
interface BatchStats {
  cached: number;
  geocoded: number;
  failed: number;
}

@Injectable()
export class GeocodingService implements OnModuleInit {
  private readonly logger = new Logger(GeocodingService.name);
  /** Mémoire seule tant que `onModuleInit` n'a pas fourni de chemin de fichier. */
  private store = new GeocodingCacheStore();
  /** Recherches en cours, par clé : deux événements à la même adresse ne font qu'un appel. */
  private readonly inflight = new Map<string, Promise<GeocodeOutcome>>();

  /** Charge le cache persistant (`GEOCODING_CACHE_PATH`, sinon `.cache/geocoding.json`). */
  onModuleInit(): void {
    const filePath = process.env.GEOCODING_CACHE_PATH?.trim()
      ? process.env.GEOCODING_CACHE_PATH.trim()
      : path.join('.cache', 'geocoding.json');
    this.store = new GeocodingCacheStore(path.resolve(filePath));
    this.store.load();
  }

  /**
   * Dérive la région depuis un code postal
   */
  getRegionFromPostalCode(postalCode: string): string {
    const deptCode = this.getDepartmentCode(postalCode);
    return DEPT_TO_REGION[deptCode] || 'Inconnue';
  }

  /**
   * Géocode une adresse française via api-adresse.data.gouv.fr
   */
  async geocodeAddress(
    address: string,
    postalCode: string,
    city: string,
  ): Promise<GeocodingResult | null> {
    const outcome = await this.resolve(address, postalCode, city);
    await this.store.flush();
    return outcome.kind === 'ok' ? outcome.result : null;
  }

  /**
   * Clé du cache : adresse, code postal et ville, en minuscules et espaces réduits. Une adresse
   * modifiée dans Baserow donne donc une nouvelle clé, géocodée au chargement suivant.
   */
  private cacheKey(address: string, postalCode: string, city: string): string {
    return [address, postalCode, city]
      .map((part) => (part ?? '').toLowerCase().replace(/\s+/g, ' ').trim())
      .join('|');
  }

  /**
   * Cherche une adresse : cache d'abord (résultat, ou échec encore « frais »), puis la BAN.
   * Ne lève jamais ; n'écrit pas le fichier (c'est `flush` qui le fait, une fois par lot).
   */
  private async resolve(
    address: string,
    postalCode: string,
    city: string,
    stats?: BatchStats,
  ): Promise<GeocodeOutcome> {
    const query = [address, city].filter(Boolean).join(', ');
    if (!query) return { kind: 'failed', failure: 'not_found' };

    const key = this.cacheKey(address, postalCode, city);
    const cached = this.store.get(key);
    if (cached) {
      if (cached.result) {
        if (stats) stats.cached++;
        return { kind: 'ok', result: cached.result };
      }
      if (cached.failure && (cached.retryAfter ?? 0) > Date.now()) {
        if (stats) stats.cached++;
        return { kind: 'failed', failure: cached.failure };
      }
    }

    const running = this.inflight.get(key);
    if (running) return running;

    const search = this.searchAndStore(key, address, postalCode, city, stats);
    this.inflight.set(key, search);
    try {
      return await search;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async searchAndStore(
    key: string,
    address: string,
    postalCode: string,
    city: string,
    stats?: BatchStats,
  ): Promise<GeocodeOutcome> {
    let outcome = await this.callBan(address, postalCode, city);

    // Repli : adresse inconnue, on essaie avec le seul code postal + ville. Le résultat est
    // aussi enregistré sous la clé de l'adresse d'origine (ci-dessous), donc plus d'appel inutile.
    if (
      outcome.kind === 'failed' &&
      outcome.failure === 'not_found' &&
      address
    ) {
      outcome = await this.resolve('', postalCode, city, stats);
      // `resolve` a déjà compté le repli ; ne pas compter deux fois l'adresse d'origine.
      this.storeOutcome(key, outcome);
      return outcome;
    }

    if (stats) {
      if (outcome.kind === 'ok') stats.geocoded++;
      else stats.failed++;
    }
    this.storeOutcome(key, outcome);
    return outcome;
  }

  private storeOutcome(key: string, outcome: GeocodeOutcome): void {
    const now = Date.now();
    const entry: GeocodingCacheEntry =
      outcome.kind === 'ok'
        ? { result: outcome.result, geocodedAt: now, lastUsedAt: now }
        : {
            failure: outcome.failure,
            geocodedAt: now,
            retryAfter:
              now +
              (outcome.failure === 'not_found'
                ? NOT_FOUND_RETRY_MS
                : ERROR_RETRY_MS),
            lastUsedAt: now,
          };
    this.store.set(key, entry);
  }

  /** Un appel à la BAN. « Introuvable » et « erreur » sont distingués (délais de reprise différents). */
  private async callBan(
    address: string,
    postalCode: string,
    city: string,
  ): Promise<GeocodeOutcome> {
    const query = [address, city].filter(Boolean).join(', ');
    const url = new URL(BAN_API_URL);
    url.searchParams.set('q', query);
    if (postalCode) url.searchParams.set('postcode', postalCode);
    url.searchParams.set('limit', '1');

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        this.logger.warn(`Erreur HTTP ${response.status} pour "${query}"`);
        return { kind: 'failed', failure: 'error' };
      }

      const data = (await response.json()) as BanResponse;
      if (!data.features || data.features.length === 0) {
        return { kind: 'failed', failure: 'not_found' };
      }

      const feature = data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates;
      const parts = feature.properties.context.split(',').map((s) => s.trim());

      return {
        kind: 'ok',
        result: {
          latitude,
          longitude,
          region: parts[2] || parts[1] || 'Inconnue',
          department: parts[1] || 'Inconnu',
          cityCode: feature.properties.citycode,
        },
      };
    } catch (error) {
      this.logger.warn(`Erreur réseau pour "${query}": ${error}`);
      return { kind: 'failed', failure: 'error' };
    }
  }

  /**
   * Géocode un lot d'adresses en parallèle avec throttling.
   */
  async batchGeocode(
    items: GeocodingItem[],
  ): Promise<Map<string, GeocodingResult | null>> {
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 100;
    const results = new Map<string, GeocodingResult | null>();
    const stats: BatchStats = { cached: 0, geocoded: 0, failed: 0 };
    const startedAt = Date.now();

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const callsBefore = stats.geocoded + stats.failed;
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const outcome = await this.resolve(
            item.address,
            item.postalCode,
            item.city,
            stats,
          );
          return {
            id: item.id,
            result: outcome.kind === 'ok' ? outcome.result : null,
          };
        }),
      );

      for (const { id, result } of batchResults) {
        results.set(id, result);
      }

      // Pas de pause quand tout le paquet vient du cache : elle n'a de raison d'être
      // que pour ménager la BAN.
      const calledBan = stats.geocoded + stats.failed > callsBefore;
      if (i + BATCH_SIZE < items.length && calledBan) {
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES),
        );
      }
    }

    // Une seule écriture du fichier par lot.
    await this.store.flush();

    if (items.length > 0) {
      this.logger.log(
        `Géocodage de ${items.length} adresses en ${Date.now() - startedAt} ms : ${stats.cached} en cache, ${stats.geocoded} géocodées, ${stats.failed} en échec`,
      );
    }

    return results;
  }

  /**
   * Nombre d'entrées dans le cache (résultats et échecs en attente de nouvelle tentative)
   */
  getCacheSize(): number {
    return this.store.size;
  }

  /**
   * Vide le cache (mémoire ; le fichier est réécrit au prochain géocodage)
   */
  clearCache(): void {
    this.store.clear();
  }

  private getDepartmentCode(postalCode: string): string {
    if (!postalCode) return '';
    const cp = postalCode.trim();
    if (cp.startsWith('97')) return cp.substring(0, 3);
    if (cp.startsWith('20')) return '20';
    return cp.substring(0, 2);
  }
}
