import { useMemo } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { EventsGeoJSON, isCluster } from '@/types/event';
import { useClusters } from '@/hooks';
import { ClusterMarker } from './ClusterMarker';
import { EventMarker } from './EventMarker';

// Configuration des territoires (DOM/TOM + France métropolitaine)
export const QUICK_ACCESS_TERRITORIES = [
  {
    id: 'metropole',
    name: 'France métropolitaine',
    shortName: 'Métropole',
    center: { lat: 46.2276, lng: 2.2137 },
    zoom: 5.5,
    bounds: { west: -5.5, south: 41.0, east: 10.0, north: 51.5 },
    isMetropole: true,
  },
  {
    id: 'guadeloupe',
    name: 'Guadeloupe',
    shortName: 'Guadeloupe',
    center: { lat: 16.25, lng: -61.55 },
    zoom: 8,
    bounds: { west: -62.0, south: 15.8, east: -61.0, north: 16.6 },
    isMetropole: false,
  },
  {
    id: 'martinique',
    name: 'Martinique',
    shortName: 'Martinique',
    center: { lat: 14.64, lng: -61.02 },
    zoom: 8.5,
    bounds: { west: -61.3, south: 14.35, east: -60.8, north: 14.9 },
    isMetropole: false,
  },
  {
    id: 'guyane',
    name: 'Guyane',
    shortName: 'Guyane',
    center: { lat: 4.0, lng: -53.0 },
    zoom: 5.5,
    bounds: { west: -55.0, south: 2.0, east: -51.0, north: 6.0 },
    isMetropole: false,
  },
  {
    id: 'reunion',
    name: 'La Réunion',
    shortName: 'Réunion',
    center: { lat: -21.13, lng: 55.53 },
    zoom: 8.5,
    bounds: { west: 55.2, south: -21.4, east: 55.9, north: -20.85 },
    isMetropole: false,
  },
  {
    id: 'mayotte',
    name: 'Mayotte',
    shortName: 'Mayotte',
    center: { lat: -12.82, lng: 45.15 },
    zoom: 9,
    bounds: { west: 44.9, south: -13.05, east: 45.35, north: -12.6 },
    isMetropole: false,
  },
] as const;

type Territory = typeof QUICK_ACCESS_TERRITORIES[number];

interface DOMTOMInsetProps {
  geojson: EventsGeoJSON;
  mapStyleUrl: string;
  onEventClick?: (eventId: string) => void;
  onTerritoryClick?: (territory: Territory) => void;
}

interface TerritoryMapProps {
  territory: Territory;
  geojson: EventsGeoJSON;
  mapStyleUrl: string;
  onEventClick?: (eventId: string) => void;
  onTerritoryClick?: (territory: Territory) => void;
}

function TerritoryMap({ territory, geojson, mapStyleUrl, onEventClick, onTerritoryClick }: TerritoryMapProps) {
  // Filtrer les événements pour ce territoire
  const filteredGeojson = useMemo(() => {
    if (territory.isMetropole) {
      // France métropolitaine : tous les événements qui ne sont pas dans les DOM-TOM
      const domTomRegions = ['Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte'];
      return {
        ...geojson,
        features: geojson.features.filter(f => !domTomRegions.includes(f.properties.region)),
      };
    }
    return {
      ...geojson,
      features: geojson.features.filter(f => f.properties.region === territory.name),
    };
  }, [geojson, territory]);

  // Clustering pour ce territoire
  const { clusters } = useClusters(
    filteredGeojson,
    territory.bounds,
    territory.zoom
  );

  const eventCount = filteredGeojson.features.length;

  return (
    <div 
      className="relative bg-white rounded-lg shadow-card overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
      onClick={() => onTerritoryClick?.(territory)}
    >
      {/* Label du territoire */}
      <div className="absolute top-1 left-1 z-10 bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] font-medium text-primary leading-tight">
        {territory.shortName}
        {eventCount > 0 && (
          <span className="ml-0.5 text-primary">({eventCount})</span>
        )}
      </div>
      
      <Map
        initialViewState={{
          longitude: territory.center.lng,
          latitude: territory.center.lat,
          zoom: territory.zoom,
        }}
        mapStyle={mapStyleUrl}
        style={{ width: territory.isMetropole ? 244 : 118, height: 76 }}
        interactive={false}
        attributionControl={false}
      >
        {!territory.isMetropole && clusters.map((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          
          if (isCluster(feature)) {
            return (
              <Marker
                key={`cluster-${territory.id}-${feature.id}`}
                longitude={longitude}
                latitude={latitude}
              >
                <ClusterMarker
                  count={feature.properties.point_count}
                  onClick={() => {}}
                  size="sm"
                />
              </Marker>
            );
          }

          const event = feature.properties;
          return (
            <Marker
              key={`event-${territory.id}-${event.id}`}
              longitude={longitude}
              latitude={latitude}
            >
              <EventMarker
                type={event.type}
                isSelected={false}
                onClick={() => {
                  onEventClick?.(event.id);
                }}
                size="sm"
              />
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}

export function DOMTOMInset({ geojson, mapStyleUrl, onEventClick, onTerritoryClick }: DOMTOMInsetProps) {
  return (
    <div className="hidden md:block absolute bottom-4 right-4 z-10">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-popup p-2 border border-primary/10">
        <div className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-2 px-1">
          Accès rapide
        </div>
        {/* France métropolitaine - full width */}
        <div className="mb-1.5">
          <TerritoryMap
            territory={QUICK_ACCESS_TERRITORIES[0]}
            geojson={geojson}
            mapStyleUrl={mapStyleUrl}
            onEventClick={onEventClick}
            onTerritoryClick={onTerritoryClick}
          />
        </div>
        {/* DOM-TOM - grille 2 colonnes avec la dernière centrée */}
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_ACCESS_TERRITORIES.slice(1, 5).map((territory) => (
            <TerritoryMap
              key={territory.id}
              territory={territory}
              geojson={geojson}
              mapStyleUrl={mapStyleUrl}
              onEventClick={onEventClick}
              onTerritoryClick={onTerritoryClick}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-center">
          <TerritoryMap
            territory={QUICK_ACCESS_TERRITORIES[5]}
            geojson={geojson}
            mapStyleUrl={mapStyleUrl}
            onEventClick={onEventClick}
            onTerritoryClick={onTerritoryClick}
          />
        </div>
      </div>
    </div>
  );
}
