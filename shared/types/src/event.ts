/** Types d’événement affichés en tag / filtres (La Grande Semaine Végétale). */
export type EventType =
  | 'atelier'
  | 'degustation'
  | 'conference'
  | 'visite'
  | 'marche'
  | 'autre';

/** Ordre des cases à cocher filtres et clés de `stats.byType`. */
export const EVENT_TYPES_ALL: EventType[] = [
  'atelier',
  'degustation',
  'conference',
  'visite',
  'marche',
  'autre',
];

export type EventFormat = 
  | 'atelier' 
  | 'degustation' 
  | 'conference' 
  | 'visite' 
  | 'marche' 
  | 'repas'
  | 'autre';

export type TargetAudience = 
  | 'tout-public' 
  | 'jeunes' 
  | 'seniors' 
  | 'familles' 
  | 'scolaire' 
  | 'professionnels';

export type EventModality = 'presentiel' | 'distanciel';

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
  'atelier': 'Atelier Cuisine',
  'degustation': 'Dégustation',
  'conference': 'Conférence / Débat',
  'visite': 'Visite de ferme / Jardin',
  'marche': 'Marché / Fête locale',
  'autre': 'Autre',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  'atelier': '#3BAE5D',      // green_main
  'degustation': '#F4C542',  // yellow_soft
  'conference': '#1F7A3E',   // green_dark
  'visite': '#A7D7B5',       // green_light
  'marche': '#E46A5D',       // red_soft
  'autre': '#D9D9D9',        // grey_light
};

export const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  'atelier': 'Atelier Cuisine',
  'degustation': 'Dégustation',
  'conference': 'Conférence / Table-ronde',
  'visite': 'Visite de ferme / Jardin',
  'marche': 'Marché / Fête locale',
  'repas': 'Repas partagé',
  'autre': 'Autre',
};

export const TARGET_AUDIENCE_LABELS: Record<TargetAudience, string> = {
  'tout-public': 'Tout public',
  'jeunes': 'Jeunes (15-25 ans)',
  'seniors': 'Seniors',
  'familles': 'Familles',
  'scolaire': 'Scolaire',
  'professionnels': 'Professionnels',
};

export const MODALITY_LABELS: Record<EventModality, string> = {
  'presentiel': 'En présentiel',
  'distanciel': 'En ligne',
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
