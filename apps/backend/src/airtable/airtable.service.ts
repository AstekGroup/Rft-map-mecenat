import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Event, Partner } from '@make-map/types';
import type {
  AirtableRecord,
  AirtableResponse,
  AirtablePartnerRecord,
} from './airtable.types';
import {
  mapFormat,
  mapTargetAudience,
  mapModality,
  mapThemes,
  extractImageUrl,
  computeIsDuringWeek,
  parseAirtableDateTime,
  buildOrganizerContact,
  buildAccessibilityInfo,
} from './airtable-mapping.util';
import { GeocodingService } from '../geocoding/geocoding.service';

// Seule valeur qui autorise l'affichage sur la cartographie
const MODERATION_VISIBLE = 'Accepté';

@Injectable()
export class AirtableService {
  private readonly logger = new Logger(AirtableService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly geocodingService: GeocodingService,
  ) {}

  /**
   * Récupère et transforme tous les événements depuis Airtable.
   * Inclut le géocodage des adresses.
   */
  async fetchEvents(devMode = false): Promise<Event[]> {
    this.logger.log(
      `Chargement des événements depuis Airtable (mode ${devMode ? 'dev' : 'production'})...`,
    );

    // 1. Récupérer les partenaires
    const partnersMap = await this.fetchPartnersMap();

    // 2. Récupérer les enregistrements bruts
    const records = await this.fetchRecords(devMode);
    this.logger.log(`${records.length} enregistrements récupérés depuis Airtable`);

    // 3. Transformer sans géocodage
    const partialEvents = records.map((r) =>
      this.transformRecord(r, partnersMap),
    );

    // 4. Préparer le batch geocoding (seulement pour les événements présentiels)
    const itemsToGeocode = partialEvents
      .filter((e) => e.modality === 'presentiel' && (e.address || e.city))
      .map((e) => ({
        id: e.id,
        address: e.address,
        postalCode: e.postalCode,
        city: e.city,
      }));

    this.logger.log(`Géocodage de ${itemsToGeocode.length} adresses...`);

    // 5. Géocoder en batch
    const geocodingResults =
      await this.geocodingService.batchGeocode(itemsToGeocode);

    // 6. Fusionner les résultats
    const events: Event[] = partialEvents.map((event) => {
      const geo = geocodingResults.get(event.id);
      if (geo) {
        return {
          ...event,
          latitude: geo.latitude,
          longitude: geo.longitude,
          region: (geo.region && geo.region !== 'Inconnue') ? geo.region : event.region,
          department: (geo.department && geo.department !== 'Inconnu') ? geo.department : event.department,
        };
      }
      return event;
    });

    this.logger.log(
      `${events.length} événements prêts (${events.filter((e) => e.latitude !== 0).length} géocodés)`,
    );

    return events;
  }

  /**
   * Récupère tous les partenaires depuis Airtable.
   */
  async fetchPartners(): Promise<Partner[]> {
    const map = await this.fetchPartnersMap();
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Récupère les partenaires et les retourne sous forme de Map (id -> Partner).
   */
  private async fetchPartnersMap(): Promise<Map<string, Partner>> {
    const apiKey = this.configService.get<string>('AIRTABLE_API_KEY');
    const baseId = this.configService.get<string>('AIRTABLE_BASE_ID');
    const partnersTableId = this.configService.get<string>(
      'AIRTABLE_PARTNERS_TABLE_ID',
    );

    if (!apiKey || !baseId || !partnersTableId) {
      this.logger.warn(
        'Configuration des partenaires manquante (AIRTABLE_PARTNERS_TABLE_ID). Aucun partenaire ne sera chargé.',
      );
      return new Map();
    }

    try {
      const url = new URL(
        `https://api.airtable.com/v0/${baseId}/${partnersTableId}`,
      );
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        throw new Error(
          `Erreur Airtable Partners: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        records: AirtablePartnerRecord[];
      };
      const partnersMap = new Map<string, Partner>();

      for (const record of data.records) {
        partnersMap.set(record.id, {
          id: record.id,
          name: record.fields.Nom,
          logoUrl: extractImageUrl(record.fields.Logo),
        });
      }

      this.logger.log(`${partnersMap.size} partenaires récupérés`);
      return partnersMap;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération des partenaires: ${error.message}`,
      );
      return new Map();
    }
  }

  /**
   * Récupère tous les enregistrements depuis Airtable avec pagination.
   */
  private async fetchRecords(devMode: boolean): Promise<AirtableRecord[]> {
    const apiKey = this.configService.get<string>('AIRTABLE_API_KEY');
    const baseId = this.configService.get<string>('AIRTABLE_BASE_ID');
    const tableId = this.configService.get<string>('AIRTABLE_TABLE_ID');

    if (!apiKey || !baseId || !tableId) {
      throw new Error(
        'Configuration Airtable manquante. Vérifiez AIRTABLE_API_KEY, AIRTABLE_BASE_ID et AIRTABLE_TABLE_ID.',
      );
    }

    const records: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
      url.searchParams.set('pageSize', '100');

      if (offset) {
        url.searchParams.set('offset', offset);
      }

      const filterFormula = this.buildFilterFormula(devMode);
      if (filterFormula) {
        url.searchParams.set('filterByFormula', filterFormula);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Erreur Airtable API: ${response.status} ${errorBody}`);
        throw new Error(
          `Erreur Airtable: ${response.status} ${response.statusText}`,
        );
      }

      const data: AirtableResponse = await response.json();
      records.push(...data.records);
      offset = data.offset;
    } while (offset);

    return records;
  }

  /**
   * Construit la formule de filtre Airtable.
   */
  private buildFilterFormula(devMode: boolean): string | null {
    if (devMode) return null;

    return `{Modération de l'événement} = "${MODERATION_VISIBLE}"`;
  }

  /**
   * Transforme un enregistrement Airtable en Event (sans géocodage).
   */
  private transformRecord(
    record: AirtableRecord,
    partnersMap: Map<string, Partner>,
  ): Event {
    const f = record.fields;

    const startDateTime = parseAirtableDateTime(
      f["Date de début de l'événement"],
    );
    const endDateTime = parseAirtableDateTime(
      f["Date de fin de l'événement"],
    );
    const { format, type } = mapFormat(f['Format']);
    const modality = mapModality(f["Type de l'événement"]);
    const targetAudience = mapTargetAudience(f['Public']);
    const themes = mapThemes(f['Thématique']);
    const imageUrl = extractImageUrl(f["Visuel de l'événement"]);
    const isDuringWeek = computeIsDuringWeek(
      f["Date de début de l'événement"],
    );
    const organizerContact = buildOrganizerContact(
      f["Prénom de l'animateur"],
      f["Nom de l'animateur"],
    );
    const accessibilityInfo = buildAccessibilityInfo(
      f["Modalités spécifiques d'accès au lieu"],
    );
    const postalCode = (f['Code postal du lieu'] || '').trim();
    const fallbackRegion =
      this.geocodingService.getRegionFromPostalCode(postalCode);

    // Résolution des partenaires
    const partners: Partner[] = (f.Communautés || [])
      .map((id) => partnersMap.get(id))
      .filter((p): p is Partner => !!p);

    return {
      id: record.id,
      title: f["Nom de l'événement"] || 'Événement sans titre',
      description: f['Description'] || '',
      date: startDateTime.date,
      time: startDateTime.time,
      endDate: endDateTime.date || undefined,
      endTime: endDateTime.time || undefined,
      address: (f['Adresse du lieu'] || '').trim(),
      city: (f['Ville du lieu'] || '').trim(),
      region: fallbackRegion,
      department: '',
      postalCode,
      latitude: 0,
      longitude: 0,
      type,
      themes,
      organizer: f['Nom de la structure organisatrice'] || '',
      organizerContact,
      registrationUrl: f["Lien d'inscription à l'événement"] || undefined,
      isDuringWeek,
      modality,
      imageUrl,
      venueName: f['Lieu'] || undefined,
      accessibilityInfo,
      videoConferenceUrl: f['Lien de la visio'] || undefined,
      format,
      targetAudience,
      contactEmail:
        f['Email contact événement'] ||
        f["E-mail de l'animateur"] ||
        undefined,
      organizerWebsite: f['Site web de la structure'] || undefined,
      capacity: f["Capacité d'accueil de l'événement"] || undefined,
      registeredCount: undefined,
      partners: partners.length > 0 ? partners : undefined,
    };
  }
}
