import type { EventModality } from './event';

export interface AppConfigTheme {
  colors: Record<string, string>;
  fonts: {
    heading: string;
    body: string;
    googleFontsUrl?: string;
  };
  /** Rayons de bordure : une variable CSS `--radius-<clé>` par entrée. */
  borderRadius?: Record<string, string>;
}

/** Titres et noms propres à l'événement (le wording générique de l'interface reste dans le code). */
export interface AppConfigTexts {
  meta: Record<string, string>;
  home: Record<string, string>;
}

export interface AppConfigDateFilterMode {
  mode: string;
  label: string;
}

export interface AppConfigFilters {
  dateFilterModes: AppConfigDateFilterMode[];
}

/**
 * Rôle d'une colonne de la table des événements → nom exact de la colonne dans Baserow.
 * Toutes les clés sont obligatoires : le code ne connaît que les rôles, jamais les noms.
 */
export interface BaserowFieldMapping {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  /** Colonne de liaison vers la table des formats. */
  format: string;
  /** Liste de choix « modalité » (valeurs traduites par `baserow.mapping.modality`). */
  modality: string;
  /** Colonne de liaison vers la table des publics. */
  audience: string;
  /** Colonne de liaison vers la table des thématiques. */
  theme: string;
  image: string;
  address: string;
  postalCode: string;
  city: string;
  organizer: string;
  organizerFirstName: string;
  organizerLastName: string;
  registrationUrl: string;
  venueName: string;
  accessModalities: string;
  videoConferenceUrl: string;
  contactEmail: string;
  /** Colonne lue quand `contactEmail` est vide. */
  contactEmailFallback: string;
  contactPhone: string;
  organizerWebsite: string;
  capacity: string;
  price: string;
  /** Liste de choix « tarif » (valeur « gratuit » : `baserow.mapping.tariffFreeValue`). */
  tariff: string;
  /** Colonne de liaison vers la table des partenaires. */
  partnerField: string;
  /** Champ de modération (le filtre côté backend passe par `BASEROW_MODERATION_FIELD_ID`). */
  moderation: string;
}

/** Colonnes communes aux tables de référence (formats, publics, thématiques, partenaires). */
export interface BaserowReferenceFields {
  name: string;
  logo: string;
  picto: string;
  color: string;
}

/** Valeurs de listes de choix et colonnes des tables de référence, propres à la carte. */
export interface BaserowMapping {
  referenceFields: BaserowReferenceFields;
  /** Valeur de la liste « modalité » de Baserow → modalité de l'application. */
  modality: Record<string, EventModality>;
  /** Valeur de la liste « tarif » qui signifie « gratuit ». */
  tariffFreeValue: string;
}

export interface AppConfig {
  profile: string;
  app: {
    name: string;
    shortName: string;
    description: string;
    eventDates: { weekStart: string; weekEnd: string };
    url?: string;
    locale?: string;
  };
  theme: AppConfigTheme;
  texts: AppConfigTexts;
  filters: AppConfigFilters;
  baserow: {
    /** Valeur du champ de modération qui rend un événement public. */
    moderationVisibleValue: string;
    fieldMapping: BaserowFieldMapping;
    mapping: BaserowMapping;
  };
}
