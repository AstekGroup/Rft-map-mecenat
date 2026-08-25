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
  contactPhone?: string;
  organizerWebsite?: string;
  capacity?: number;
  registeredCount?: number;
  partners?: Partner[];
  price?: number;
  isFree: boolean;
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
