/** Types d’événement affichés en tag / filtres (La Grande Semaine Végétale). */
export type EventType =
  | 'atelier-cuisine'
  | 'degustation'
  | 'visite-jardin'
  | 'atelier-pedagogique'
  | 'conference'
  | 'festival'
  | 'autre';

/** Ordre des cases à cocher filtres et clés de `stats.byType`. */
export const EVENT_TYPES_ALL: EventType[] = [
  'atelier-cuisine',
  'degustation',
  'visite-jardin',
  'atelier-pedagogique',
  'conference',
  'festival',
  'autre',
];

export type EventFormat = 
  | 'atelier-cuisine' 
  | 'degustation' 
  | 'visite-jardin' 
  | 'atelier-pedagogique' 
  | 'conference' 
  | 'festival'
  | 'autre';

export type TargetAudience = 
  | 'tout-public' 
  | 'familles-enfants' 
  | 'salaries-entreprise' 
  | 'professionnels' 
  | 'scolaires';

export type EventModality = 'presentiel' | 'distanciel';

export type EventTheme =
  | 'cuisine-vegetale'
  | 'sante-nutrition'
  | 'biodiversite'
  | 'agriculture'
  | 'climat-environnement'
  | 'autre';

export interface Partner {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  address: string;
  city: string;
  region: string;
  department: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  type: EventType;
  themes: EventTheme[];
  organizer: string;
  organizerContact?: string;
  registrationUrl?: string;
  isDuringWeek: boolean;
  modality: EventModality;
  imageUrl?: string;
  venueName?: string;
  accessibilityInfo?: string;
  videoConferenceUrl?: string;
  format: EventFormat;
  targetAudience: TargetAudience[];
  contactEmail?: string;
  organizerWebsite?: string;
  capacity?: number;
  registeredCount?: number;
  partners?: Partner[];
}

export interface GeoJSONEvent {
  type: 'Feature';
  properties: Event;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface EventsGeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONEvent[];
}

export interface ClusterProperties {
  cluster: boolean;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
}

export type ClusterFeature = {
  type: 'Feature';
  properties: ClusterProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  id: number;
};

export type EventFeature = GeoJSONEvent;

export type MapFeature = ClusterFeature | EventFeature;

export function isCluster(feature: MapFeature): feature is ClusterFeature {
  return 'cluster' in feature.properties && feature.properties.cluster === true;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  'atelier-cuisine': 'Atelier de cuisine',
  'degustation': 'Dégustation ou menu végétal',
  'visite-jardin': 'Visite de jardin / potager ou cueillette',
  'atelier-pedagogique': 'Atelier pédagogique ou formation',
  'conference': 'Conférence/webinaire/table-ronde',
  'festival': 'Festival',
  'autre': 'Autres',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  'atelier-cuisine': '#3BAE5D',      // green_main
  'degustation': '#F4C542',          // yellow_soft
  'visite-jardin': '#A7D7B5',        // green_light
  'atelier-pedagogique': '#1F7A3E',  // green_dark
  'conference': '#E46A5D',           // red_soft
  'festival': '#FF8C00',             // orange
  'autre': '#D9D9D9',                // grey_light
};

export const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  'atelier-cuisine': 'Atelier de cuisine',
  'degustation': 'Dégustation ou menu végétal',
  'visite-jardin': 'Visite de jardin / potager ou cueillette',
  'atelier-pedagogique': 'Atelier pédagogique ou formation',
  'conference': 'Conférence/webinaire/table-ronde',
  'festival': 'Festival',
  'autre': 'Autres',
};

export const TARGET_AUDIENCE_LABELS: Record<TargetAudience, string> = {
  'tout-public': 'Tout public',
  'familles-enfants': 'Famille / enfants',
  'salaries-entreprise': "Salariés d'une entreprise",
  'professionnels': 'Professionnels',
  'scolaires': 'Scolaires',
};

export const MODALITY_LABELS: Record<EventModality, string> = {
  'presentiel': 'En présentiel',
  'distanciel': 'En ligne',
};

export const EVENT_THEME_LABELS: Record<EventTheme, string> = {
  'cuisine-vegetale': 'Cuisine végétale',
  'sante-nutrition': 'Santé & nutrition',
  'biodiversite': 'Biodiversité',
  'agriculture': 'Agriculture',
  'climat-environnement': 'Climat & environnement',
  'autre': 'Autres',
};

export const REGIONS = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  'Provence-Alpes-Côte d\'Azur',
  'Guadeloupe',
  'Martinique',
  'Guyane',
  'La Réunion',
  'Mayotte',
] as const;

export type Region = typeof REGIONS[number];
