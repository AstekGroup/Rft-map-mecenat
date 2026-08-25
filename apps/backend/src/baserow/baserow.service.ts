import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Event, Partner } from '@make-map/types';
import type {
  BaserowRecord,
  BaserowResponse,
  BaserowPartnerRecord,
} from './baserow.types';
import {
  mapFormat,
  mapTargetAudience,
  mapModality,
  mapThemes,
  extractImageUrl,
  computeIsDuringWeek,
  parseDateTime,
  buildOrganizerContact,
  buildAccessibilityInfo,
} from './baserow-mapping.util';
import { GeocodingService } from '../geocoding/geocoding.service';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class BaserowService {
  private readonly logger = new Logger(BaserowService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly geocodingService: GeocodingService,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Récupère et transforme tous les événements depuis Baserow.
   * Inclut le géocodage des adresses.
   */
  async fetchEvents(devMode = false): Promise<Event[]> {
    this.logger.log(
      `Chargement des événements depuis Baserow (mode ${devMode ? 'dev' : 'production'})...`,
    );

    // 1. Récupérer les partenaires
    const partnersMap = await this.fetchPartnersMap();

    // 2. Récupérer les enregistrements bruts
    const records = await this.fetchRecords(devMode);
    this.logger.log(
      `${records.length} enregistrements récupérés depuis Baserow`,
    );

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
          region:
            geo.region && geo.region !== 'Inconnue' ? geo.region : event.region,
          department:
            geo.department && geo.department !== 'Inconnu'
              ? geo.department
              : event.department,
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
   * Récupère tous les partenaires depuis Baserow.
   */
  async fetchPartners(): Promise<Partner[]> {
    const map = await this.fetchPartnersMap();
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Récupère les partenaires et les retourne sous forme de Map (id -> Partner).
   */
  private async fetchPartnersMap(): Promise<Map<string, Partner>> {
    const apiToken = this.configService.get<string>('BASEROW_API_TOKEN');
    const apiUrl = this.configService.get<string>('BASEROW_API_URL');
    const partnersTableId = this.configService.get<string>(
      'BASEROW_PARTNERS_TABLE_ID',
    );

    if (!apiToken || !apiUrl || !partnersTableId) {
      this.logger.warn(
        'Configuration des partenaires manquante (BASEROW_PARTNERS_TABLE_ID). Aucun partenaire ne sera chargé.',
      );
      return new Map();
    }

    try {
      const partnersMap = new Map<string, Partner>();
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        const url = new URL(
          `${apiUrl}/api/database/rows/table/${partnersTableId}/`,
        );
        url.searchParams.set('user_field_names', 'true');
        url.searchParams.set('size', '200');
        url.searchParams.set('page', String(page));

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Token ${apiToken}` },
        });

        if (!response.ok) {
          throw new Error(
            `Erreur Baserow Partners: ${response.status} ${response.statusText}`,
          );
        }

        const data =
          (await response.json()) as BaserowResponse<BaserowPartnerRecord>;

        for (const record of data.results) {
          partnersMap.set(String(record.id), {
            id: String(record.id),
            name: record.Nom,
            logoUrl: extractImageUrl(record.Logo),
          });
        }

        if (data.next) {
          page++;
        } else {
          hasNext = false;
        }
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
   * Récupère tous les enregistrements depuis Baserow avec pagination.
   */
  private async fetchRecords(devMode: boolean): Promise<BaserowRecord[]> {
    const apiToken = this.configService.get<string>('BASEROW_API_TOKEN');
    const apiUrl = this.configService.get<string>('BASEROW_API_URL');
    const tableId = this.configService.get<string>('BASEROW_TABLE_ID');
    const moderationFieldId = this.configService.get<string>(
      'BASEROW_MODERATION_FIELD_ID',
    );

    if (!apiToken || !apiUrl || !tableId) {
      throw new Error(
        'Configuration Baserow manquante. Vérifiez BASEROW_API_TOKEN, BASEROW_API_URL et BASEROW_TABLE_ID.',
      );
    }

    const records: BaserowRecord[] = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const url = new URL(`${apiUrl}/api/database/rows/table/${tableId}/`);
      url.searchParams.set('user_field_names', 'true');
      url.searchParams.set('size', '200');
      url.searchParams.set('page', String(page));

      if (!devMode && moderationFieldId) {
        url.searchParams.set(
          `filter__field_${moderationFieldId}__contains_word`,
          this.appConfig.get()?.baserow.moderationVisibleValue || 'Accepté',
        );
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Token ${apiToken}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Erreur Baserow API: ${response.status} ${errorBody}`,
        );
        throw new Error(
          `Erreur Baserow: ${response.status} ${response.statusText}`,
        );
      }

      const data: BaserowResponse<BaserowRecord> = await response.json();
      records.push(...data.results);

      if (data.next) {
        page++;
      } else {
        hasNext = false;
      }
    }

    return records;
  }


  private get fm(): Record<string, string> {
    return this.appConfig.get()?.baserow.fieldMapping || {};
  }

  private get mm() {
    return this.appConfig.get()?.baserow.mapping;
  }

  /**
   * Transforme un enregistrement Baserow en Event (sans géocodage).
   */
  private transformRecord(
    record: BaserowRecord,
    partnersMap: Map<string, Partner>,
  ): Event {
    const fm = this.fm;

    const startDateTime = parseDateTime(
      record[fm.startDate || "Date de début de l'événement"],
    );
    const endDateTime = parseDateTime(
      record[fm.endDate || "Date de fin de l'événement"],
    );

    const formatMap = this.mm?.format as
      | Record<string, { format: string; type: string }>
      | undefined;
    const modalityMap = this.mm?.modality as Record<string, string> | undefined;
    const audienceMap = this.mm?.audience as Record<string, string> | undefined;
    const themeMap = this.mm?.theme as Record<string, string> | undefined;

    const { format, type } = mapFormat(
      record[fm.format || 'Format'],
      formatMap as any,
    );
    const modality = mapModality(
      record[fm.modality || "Type de l'événement"],
      modalityMap as any,
      this.appConfig.get()?.baserow.mappingHints?.modality as any,
    );
    const targetAudience = mapTargetAudience(
      record[fm.audience || 'Public'],
      audienceMap as any,
      this.appConfig.get()?.baserow.mappingHints?.audience as any,
    );
    const themes = mapThemes(
      record[fm.theme || 'Thématique'],
      themeMap as any,
      this.appConfig.get()?.baserow.mappingHints?.theme as any,
    );

    const imageUrl = extractImageUrl(
      record[fm.image || "Visuel de l'évènement"],
    );
    const { weekStart, weekEnd } = this.appConfig.eventDates;
    const isDuringWeek = computeIsDuringWeek(
      record[fm.startDate || "Date de début de l'événement"],
      weekStart,
      weekEnd,
    );
    const organizerContact = buildOrganizerContact(
      record[fm.organizerFirstName || "Prénom de l'animateur"],
      record[fm.organizerLastName || "Nom de l'animateur"],
    );
    const accessibilityInfo = buildAccessibilityInfo(
      record[fm.accessModalities || "Modalités spécifiques d'accès au lieu"],
    );
    const postalCode = (
      record[fm.postalCode || 'Code postal du lieu'] || ''
    ).trim();
    const fallbackRegion =
      this.geocodingService.getRegionFromPostalCode(postalCode);

    const partners: Partner[] = (record[fm.partnerField || 'Partenaires'] || [])
      .map((linkedRow: any) => partnersMap.get(String(linkedRow.id)))
      .filter((p): p is Partner => !!p);

    return {
      id: String(record.id),
      title: record[fm.title || "Nom de l'événement"] || 'Événement sans titre',
      description: record[fm.description || 'Description'] || '',
      date: startDateTime.date,
      time: startDateTime.time,
      endDate: endDateTime.date || undefined,
      endTime: endDateTime.time || undefined,
      address: (record[fm.address || 'Adresse du lieu'] || '').trim(),
      city: (record[fm.city || 'Ville du lieu'] || '').trim(),
      region: fallbackRegion,
      department: '',
      postalCode,
      latitude: 0,
      longitude: 0,
      type,
      themes,
      organizer:
        record[fm.organizer || 'Nom de la structure organisatrice'] || '',
      organizerContact,
      registrationUrl:
        record[fm.registrationUrl || "Lien d'inscription à l'événement"] ||
        undefined,
      isDuringWeek,
      modality,
      imageUrl,
      venueName: record[fm.venueName || 'Lieu'] || undefined,
      accessibilityInfo,
      videoConferenceUrl:
        record[fm.videoConferenceUrl || 'Lien de la visio'] || undefined,
      format,
      targetAudience,
      contactEmail:
        record[fm.contactEmail || 'Email contact événement'] ||
        record[fm.contactEmailFallback || "E-mail de l'animateur"] ||
        undefined,
      contactPhone:
        record[fm.contactPhone || 'Téléphone inscription'] || undefined,
      organizerWebsite:
        record[fm.organizerWebsite || 'Site web de la structure'] || undefined,
      capacity:
        record[fm.capacity || "Capacité d'accueil de l'événement"] || undefined,
      registeredCount: undefined,
      partners: partners.length > 0 ? partners : undefined,
      isFree:
        record[fm.tariff || 'Tarif']?.value === 'Gratuit' ||
        !record[fm.price || 'Montant'],
      price: record[fm.price || 'Montant'] || undefined,
    };
  }
}
