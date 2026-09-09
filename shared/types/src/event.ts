
export type EventModality = 'presentiel' | 'distanciel';

export interface LinkedTableRow {
  id: string;
  name: string;
  logoUrl?: string;
  pictoName?: string;
  colorHexa?: string;
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
  type: LinkedTableRow;
  themes: LinkedTableRow[];
  organizer: string;
  organizerContact?: string;
  registrationUrl?: string;
  isDuringWeek: boolean;
  modality: EventModality;
  imageUrl?: string;
  venueName?: string;
  accessibilityInfo?: string;
  videoConferenceUrl?: string;
  targetAudience: LinkedTableRow[];
  contactEmail?: string;
  contactPhone?: string;
  organizerWebsite?: string;
  capacity?: number;
  registeredCount?: number;
  partners?: LinkedTableRow[];
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
