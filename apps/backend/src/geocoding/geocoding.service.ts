import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<string, GeocodingResult>();

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
    const cacheKey = `${address}|${postalCode}|${city}`.toLowerCase().trim();
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const query = [address, city].filter(Boolean).join(', ');
    if (!query) return null;

    const url = new URL(BAN_API_URL);
    url.searchParams.set('q', query);
    if (postalCode) url.searchParams.set('postcode', postalCode);
    url.searchParams.set('limit', '1');

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        this.logger.warn(`Erreur HTTP ${response.status} pour "${query}"`);
        return null;
      }

      const data: BanResponse = await response.json();
      if (!data.features || data.features.length === 0) {
        // Fallback : essayer juste avec le code postal et la ville
        if (address) {
          return this.geocodeAddress('', postalCode, city);
        }
        return null;
      }

      const feature = data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates;
      const parts = feature.properties.context.split(',').map((s) => s.trim());

      const result: GeocodingResult = {
        latitude,
        longitude,
        region: parts[2] || parts[1] || 'Inconnue',
        department: parts[1] || 'Inconnu',
        cityCode: feature.properties.citycode,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.warn(`Erreur réseau pour "${query}": ${error}`);
      return null;
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

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const result = await this.geocodeAddress(
            item.address,
            item.postalCode,
            item.city,
          );
          return { id: item.id, result };
        }),
      );

      for (const { id, result } of batchResults) {
        results.set(id, result);
      }

      if (i + BATCH_SIZE < items.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES),
        );
      }
    }

    return results;
  }

  /**
   * Nombre d'entrées dans le cache mémoire
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Vide le cache mémoire
   */
  clearCache(): void {
    this.cache.clear();
  }

  private getDepartmentCode(postalCode: string): string {
    if (!postalCode) return '';
    const cp = postalCode.trim();
    if (cp.startsWith('97')) return cp.substring(0, 3);
    if (cp.startsWith('20')) return '20';
    return cp.substring(0, 2);
  }
}
