import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  BaserowFieldMapping,
  Event,
  LinkedTableRow,
} from '@make-map/types';
import type {
  BaserowAttachment,
  BaserowRecord,
  BaserowResponse,
  BaserowLinkedTableRecord,
  BaserowSelect,
} from './baserow.types';
import {
  mapModality,
  isFreeTariff,
  mapReferenceRecord,
  extractImageUrl,
  computeIsDuringWeek,
  parseDateTime,
  buildOrganizerContact,
  buildAccessibilityInfo,
  mapLinkedRow,
} from './baserow-mapping.util';
import {
  checkEventColumns,
  checkReferenceColumns,
  type ReferenceTableColumns,
} from './baserow-schema.util';
import { GeocodingService } from '../geocoding/geocoding.service';
import { AppConfigService } from '../config/config.service';

/** Événement liant plusieurs formats (un seul est retenu). */
interface MultipleFormatsIssue {
  id: string;
  title: string;
  formats: string[];
}

/** Écarts relevés pendant la transformation, journalisés une fois pour l'ensemble des événements. */
interface TransformIssues {
  multipleFormats: MultipleFormatsIssue[];
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Variables d'environnement (sans le suffixe `_ID`) des tables de référence. */
const REFERENCE_TABLES = [
  'BASEROW_PARTNERS_TABLE',
  'BASEROW_THEMATIQUES_TABLE',
  'BASEROW_FORMATS_TABLE',
  'BASEROW_PUBLICS_TABLE',
] as const;

@Injectable()
export class BaserowService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BaserowService.name);
  /** Avertissements déjà émis (un seul message par cause, pas un par ligne). */
  private readonly warned = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly geocodingService: GeocodingService,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Contrôle du schéma au démarrage, sans bloquer le démarrage : Baserow injoignable ou colonne
   * absente donnent des messages précis dans les logs, jamais un arrêt ni un 500.
   */
  onApplicationBootstrap(): void {
    void this.checkSchema();
  }

  /**
   * Compare les colonnes réelles de Baserow (lues sur une ligne de chaque table) à la config.
   * Journalise chaque écart et renvoie la liste des messages (vide si tout est en ordre).
   * Une table sans ligne ne peut pas être contrôlée : elle est signalée, pas ignorée.
   */
  async checkSchema(): Promise<string[]> {
    const issues: string[] = [];
    try {
      const baserow = this.appConfig.get()?.baserow;
      const apiToken = this.configService.get<string>('BASEROW_API_TOKEN');
      const apiUrl = this.configService.get<string>('BASEROW_API_URL');
      const eventTableId = this.configService.get<string>(
        'BASEROW_EVENT_TABLE_ID',
      );
      if (!baserow || !apiToken || !apiUrl || !eventTableId) {
        this.logger.warn(
          'Contrôle du schéma Baserow impossible : config ou variables BASEROW_API_URL / BASEROW_API_TOKEN / BASEROW_EVENT_TABLE_ID manquantes.',
        );
        return issues;
      }

      const eventColumns = await this.fetchSampleColumns(
        apiUrl,
        apiToken,
        eventTableId,
      );
      if (eventColumns) {
        issues.push(...checkEventColumns(eventColumns, baserow.fieldMapping));
      } else {
        this.logger.warn(
          'Table des événements vide : colonnes non contrôlables (le contrôle sera fait au premier chargement des événements).',
        );
      }

      const referenceTables: ReferenceTableColumns[] = [];
      for (const envName of REFERENCE_TABLES) {
        const tableId = this.configService.get<string>(`${envName}_ID`);
        if (!tableId) {
          this.logger.warn(
            `Variable ${envName}_ID absente : table de référence non contrôlée (aucun élément ne sera chargé).`,
          );
          continue;
        }
        try {
          const columns = await this.fetchSampleColumns(
            apiUrl,
            apiToken,
            tableId,
          );
          if (columns) {
            referenceTables.push({ label: envName, columns });
          } else {
            this.logger.warn(
              `Table de référence ${envName} vide : colonnes non contrôlables.`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Contrôle du schéma impossible pour la table ${envName} : ${errorMessage(error)}`,
          );
        }
      }
      issues.push(
        ...checkReferenceColumns(
          referenceTables,
          baserow.mapping.referenceFields,
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Contrôle du schéma Baserow impossible : ${errorMessage(error)}`,
      );
      return issues;
    }

    if (issues.length === 0) {
      this.logger.log(
        'Contrôle du schéma Baserow : toutes les colonnes de la config sont présentes.',
      );
    }
    for (const issue of issues) this.logger.error(issue);
    return issues;
  }

  /** Noms des colonnes d'une table, lus sur sa première ligne ; `null` si la table est vide. */
  private async fetchSampleColumns(
    apiUrl: string,
    apiToken: string,
    tableId: string,
  ): Promise<string[] | null> {
    const url = new URL(`${apiUrl}/api/database/rows/table/${tableId}/`);
    url.searchParams.set('user_field_names', 'true');
    url.searchParams.set('size', '1');
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Token ${apiToken}` },
    });
    if (!response.ok) {
      throw new Error(
        `Baserow a répondu ${response.status} ${response.statusText} pour la table ${tableId}`,
      );
    }
    const data = (await response.json()) as BaserowResponse<BaserowRecord>;
    if (!data.results || data.results.length === 0) return null;
    return Object.keys(data.results[0]);
  }

  /**
   * Même contrôle à chaque chargement des événements : une colonne renommée pendant que le
   * serveur tourne est signalée au prochain rafraîchissement du cache (une seule fois par écart).
   */
  private checkRecordColumns(record: BaserowRecord): void {
    const fieldMapping = this.appConfig.get()?.baserow?.fieldMapping;
    if (!fieldMapping) return;
    for (const message of checkEventColumns(
      Object.keys(record),
      fieldMapping,
    )) {
      this.errorOnce(`columns:${message}`, message);
    }
  }

  /**
   * Récupère et transforme tous les événements depuis Baserow.
   * Inclut le géocodage des adresses.
   */
  async fetchEvents(devMode = false): Promise<Event[]> {
    this.logger.log(
      `Chargement des événements depuis Baserow (mode ${devMode ? 'dev' : 'production'})...`,
    );

    // 1. Récupérer les partenaires
    const partnersMap = await this.fetchLinkedTableMap(
      'BASEROW_PARTNERS_TABLE',
    );

    // 2. Récupérer les thématiques
    const themesMap = await this.fetchLinkedTableMap(
      'BASEROW_THEMATIQUES_TABLE',
    );

    // 3. Récupérer les formats
    const formatsMap = await this.fetchLinkedTableMap('BASEROW_FORMATS_TABLE');

    // 4. Récupérer l'audience (public cible)'
    const publicsMap = await this.fetchLinkedTableMap('BASEROW_PUBLICS_TABLE');

    // 5. Récupérer les enregistrements bruts
    const records = await this.fetchRecords(devMode);
    this.logger.log(
      `${records.length} enregistrements récupérés depuis Baserow`,
    );
    if (records.length > 0) this.checkRecordColumns(records[0]);

    // 6. Transformer sans géocodage
    const issues: TransformIssues = { multipleFormats: [] };
    const partialEvents = records.map((r) =>
      this.transformRecord(
        r,
        partnersMap,
        themesMap,
        formatsMap,
        publicsMap,
        issues,
      ),
    );
    this.reportMultipleFormats(issues.multipleFormats);

    // 7. Préparer le batch geocoding (seulement pour les événements présentiels)
    const itemsToGeocode = partialEvents
      .filter((e) => e.modality === 'presentiel' && (e.address || e.city))
      .map((e) => ({
        id: e.id,
        address: e.address,
        postalCode: e.postalCode,
        city: e.city,
      }));

    this.logger.log(`Géocodage de ${itemsToGeocode.length} adresses...`);

    // 8. Géocoder en batch
    const geocodingResults =
      await this.geocodingService.batchGeocode(itemsToGeocode);

    // 9. Fusionner les résultats
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
   * Récupère les éléments des tables depuis Baserow.
   */
  async fetchLinkedTableRow(tableName: string): Promise<LinkedTableRow[]> {
    const map = await this.fetchLinkedTableMap(tableName);
    // Ordre des lignes dans Baserow (celui de l'API sans tri : ordre manuel de la table, puis
    // identifiant), jamais l'ordre alphabétique : les organisateurs maîtrisent l'ordre
    // d'affichage des options (ex. « Autres » en dernier) en déplaçant les lignes dans Baserow.
    return Array.from(map.values());
  }

  /**
   * Récupère les partenaires et les retourne sous forme de Map (id -> Partner).
   */
  private async fetchLinkedTableMap(
    tableName: string,
  ): Promise<Map<string, LinkedTableRow>> {
    const apiToken = this.configService.get<string>('BASEROW_API_TOKEN');
    const apiUrl = this.configService.get<string>('BASEROW_API_URL');
    const linkedTableId = this.configService.get<string>(tableName + '_ID');

    if (!apiToken || !apiUrl || !linkedTableId) {
      this.logger.warn(
        `Configuration manquante pour la table ${tableName}. Aucun élément ne sera chargé`,
      );
      return new Map();
    }

    try {
      const linkedTableMap = new Map<string, LinkedTableRow>();
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        const url = new URL(
          `${apiUrl}/api/database/rows/table/${linkedTableId}/`,
        );
        url.searchParams.set('user_field_names', 'true');
        url.searchParams.set('size', '200');
        url.searchParams.set('page', String(page));

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Token ${apiToken}` },
        });

        if (!response.ok) {
          throw new Error(
            `Erreur Baserow pour la table ${tableName}: ${response.status} ${response.statusText}`,
          );
        }

        const data =
          (await response.json()) as BaserowResponse<BaserowLinkedTableRecord>;

        const referenceFields =
          this.appConfig.safe.baserow.mapping.referenceFields;
        if (
          data.results.length > 0 &&
          !(referenceFields.name in data.results[0])
        ) {
          this.warnOnce(
            `reference-name:${tableName}`,
            `Colonne « ${referenceFields.name} » (baserow.mapping.referenceFields.name) introuvable dans la table ${tableName} : les libellés seront vides. Vérifier le nom de la colonne dans Baserow et dans la config.`,
          );
        }

        for (const record of data.results) {
          linkedTableMap.set(
            String(record.id),
            mapReferenceRecord(record, referenceFields),
          );
        }

        if (data.next) {
          page++;
        } else {
          hasNext = false;
        }
      }

      this.logger.log(
        `${linkedTableMap.size} éléments récupérés à partir de la table ${tableName}`,
      );
      return linkedTableMap;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération des éléments à partir de la table ${tableName}: ${error.message}`,
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
    const tableId = this.configService.get<string>('BASEROW_EVENT_TABLE_ID');
    const moderationFieldId = this.configService.get<string>(
      'BASEROW_MODERATION_FIELD_ID',
    );

    if (!apiToken || !apiUrl || !tableId) {
      throw new Error(
        'Configuration Baserow manquante. Vérifiez BASEROW_API_TOKEN, BASEROW_API_URL et BASEROW_EVENT_TABLE_ID.',
      );
    }

    // Fail-closed : sans champ de modération, on ne publie rien plutôt que
    // de rendre publics des événements non modérés.
    if (!devMode && !moderationFieldId) {
      const message =
        'BASEROW_MODERATION_FIELD_ID manquant : publication refusée (modération non vérifiable).';
      this.logger.error(message);
      throw new Error(message);
    }

    // Idem sans valeur « visible » dans la config : aucune valeur par défaut.
    const moderationVisibleValue =
      this.appConfig.get()?.baserow?.moderationVisibleValue;
    if (!devMode && !moderationVisibleValue) {
      const message =
        'baserow.moderationVisibleValue absent de la config : publication refusée (valeur de modération visible inconnue).';
      this.logger.error(message);
      throw new Error(message);
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
          moderationVisibleValue as string,
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
        if (errorBody.includes('ERROR_FILTER_FIELD_NOT_FOUND')) {
          const message = `Champ de modération introuvable dans Baserow (BASEROW_MODERATION_FIELD_ID=${moderationFieldId}) : vérifier que le champ n'a pas été supprimé ou recréé.`;
          this.logger.error(message);
          throw new Error(message);
        }
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

  /**
   * Avertit (un seul message pour tous les événements concernés) que des événements portent
   * plusieurs formats : l'application n'en garde qu'un, le premier lié dans Baserow. Le message
   * n'est répété que si la liste des événements concernés change.
   */
  private reportMultipleFormats(affected: MultipleFormatsIssue[]): void {
    if (affected.length === 0) return;
    const examples = affected
      .slice(0, 3)
      .map((e) => `« ${e.title || 'sans titre'} » (id ${e.id} : ${e.formats.join(', ')})`)
      .join(' ; ');
    const more = affected.length > 3 ? ` et ${affected.length - 3} autre(s)` : '';
    this.warnOnce(
      `multiple-formats:${affected.map((e) => e.id).join(',')}`,
      `${affected.length} événement(s) ont plusieurs formats ; seul le premier lié dans Baserow est retenu (un événement n'a qu'un format). Rendre la colonne de format à choix unique ou ne lier qu'un format. Exemples : ${examples}${more}.`,
    );
  }

  /** Journalise un avertissement une seule fois (clé = cause). */
  private warnOnce(key: string, message: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.logger.warn(message);
  }

  /** Comme `warnOnce`, au niveau erreur (donnée dégradée : colonne absente). */
  private errorOnce(key: string, message: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.logger.error(message);
  }

  /**
   * Lit la colonne associée à un rôle dans l'enregistrement. Le nom de la colonne vient
   * uniquement de `baserow.fieldMapping` : rôle absent de la config = valeur vide + avertissement.
   */
  private readField<T = unknown>(
    record: BaserowRecord,
    role: keyof BaserowFieldMapping,
  ): T | undefined {
    const column = this.appConfig.safe.baserow.fieldMapping?.[role];
    if (!column) {
      this.warnOnce(
        `role:${role}`,
        `baserow.fieldMapping.${role} absent de la config : le champ est ignoré (valeur vide).`,
      );
      return undefined;
    }
    return record[column] as T | undefined;
  }

  /** Nom de la colonne d'un rôle (pour les champs de liaison, lus par `mapLinkedRow`). */
  private columnOf(role: keyof BaserowFieldMapping): string {
    const column = this.appConfig.safe.baserow.fieldMapping?.[role];
    if (!column) {
      this.warnOnce(
        `role:${role}`,
        `baserow.fieldMapping.${role} absent de la config : le champ est ignoré (valeur vide).`,
      );
      return '';
    }
    return column;
  }

  /**
   * Transforme un enregistrement Baserow en Event (sans géocodage).
   */
  private transformRecord(
    record: BaserowRecord,
    partnersMap: Map<string, LinkedTableRow>,
    thematiquesMap: Map<string, LinkedTableRow>,
    formatsMap: Map<string, LinkedTableRow>,
    publicsMap: Map<string, LinkedTableRow>,
    issues?: TransformIssues,
  ): Event {
    const read = <T = unknown>(role: keyof BaserowFieldMapping) =>
      this.readField<T>(record, role);
    const text = (role: keyof BaserowFieldMapping) =>
      (read<string>(role) || '').trim();
    const { modality: modalityMap, tariffFreeValue } =
      this.appConfig.safe.baserow.mapping;

    const startDateRaw = read<string>('startDate');
    const startDateTime = parseDateTime(startDateRaw);
    const endDateRaw = read<string>('endDate');
    const endDateTime = parseDateTime(endDateRaw);

    const modality = mapModality(
      read<BaserowSelect>('modality'),
      modalityMap,
      (value) =>
        this.warnOnce(
          `modality:${value}`,
          `Valeur « ${value} » de la liste de choix de modalité absente de baserow.mapping.modality : traitée comme présentiel.`,
        ),
    );

    // Un événement n'a qu'un seul format : le premier lié dans Baserow. Les autres sont signalés.
    const formats = mapLinkedRow(record, this.columnOf('format'), formatsMap);
    if (formats.length > 1) {
      issues?.multipleFormats.push({
        id: String(record.id),
        title: text('title'),
        formats: formats.map((f) => f.name),
      });
    }
    const targetAudience = mapLinkedRow(
      record,
      this.columnOf('audience'),
      publicsMap,
    );
    const themes = mapLinkedRow(record, this.columnOf('theme'), thematiquesMap);
    const partners = mapLinkedRow(
      record,
      this.columnOf('partnerField'),
      partnersMap,
    );

    const imageUrl = extractImageUrl(read<BaserowAttachment[]>('image'));
    const { weekStart, weekEnd } = this.appConfig.eventDates;
    const isDuringWeek = computeIsDuringWeek(
      startDateRaw,
      endDateRaw,
      weekStart,
      weekEnd,
    );
    const organizerContact = buildOrganizerContact(
      read<string>('organizerFirstName'),
      read<string>('organizerLastName'),
    );
    const accessibilityInfo = buildAccessibilityInfo(
      read<BaserowSelect[]>('accessModalities'),
    );
    const postalCode = text('postalCode');
    const fallbackRegion =
      this.geocodingService.getRegionFromPostalCode(postalCode);

    const price = read('price');

    return {
      id: String(record.id),
      title: read<string>('title') || 'Événement sans titre',
      description: read<string>('description') || '',
      date: startDateTime.date,
      time: startDateTime.time,
      endDate: endDateTime.date || undefined,
      endTime: endDateTime.time || undefined,
      address: text('address'),
      city: text('city'),
      region: fallbackRegion,
      department: '',
      postalCode,
      latitude: 0,
      longitude: 0,
      type: formats[0],
      themes,
      organizer: read<string>('organizer') || '',
      organizerContact,
      registrationUrl: read<string>('registrationUrl') || undefined,
      isDuringWeek,
      modality,
      imageUrl,
      venueName: read<string>('venueName') || undefined,
      accessibilityInfo,
      videoConferenceUrl: read<string>('videoConferenceUrl') || undefined,
      targetAudience,
      contactEmail:
        read<string>('contactEmail') ||
        read<string>('contactEmailFallback') ||
        undefined,
      contactPhone: read<string>('contactPhone') || undefined,
      organizerWebsite: read<string>('organizerWebsite') || undefined,
      capacity: read<number>('capacity') || undefined,
      registeredCount: undefined,
      partners: partners.length > 0 ? partners : undefined,
      isFree: isFreeTariff(
        read<BaserowSelect>('tariff'),
        price,
        tariffFreeValue,
      ),
      price: (price as number | undefined) || undefined,
    };
  }
}
