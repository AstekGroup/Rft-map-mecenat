/**
 * Service API - Appels HTTP vers le backend NestJS.
 * 
 * Le frontend ne connaît plus Airtable ni le géocodage.
 * Tout passe par le backend qui sécurise le token et le cache.
 */

import {Event, EventsGeoJSON, GeoJSONEvent, AppConfig, LinkedTableRow} from '@/types/event';

// En prod : VITE_API_URL vide = chemins relatifs (/api/events), proxiés par Caddy
// En dev  : VITE_API_URL = http://localhost:3000
const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Récupère la configuration globale depuis le backend.
 */
export async function fetchConfig(): Promise<AppConfig> {
  const response = await fetch(`${API_BASE}/api/config`);
  if (!response.ok) {
    throw new Error(`Erreur API config: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Récupère tous les événements depuis le backend.
 */
export async function fetchEvents(devMode = false): Promise<Event[]> {
  const params = devMode ? '?devMode=true' : '';
  const response = await fetch(`${API_BASE}/api/events${params}`);
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère tous les partenaires depuis le backend.
 */
export async function fetchPartners(): Promise<LinkedTableRow[]> {
  const response = await fetch(`${API_BASE}/api/events/partners`);
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère toues les thématiques depuis le backend.
 */
export async function fetchThemes(): Promise<LinkedTableRow[]> {
  const response = await fetch(`${API_BASE}/api/events/themes`);
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère un événement par son ID depuis le backend.
 */
export async function fetchEventById(id: string): Promise<Event> {
  const response = await fetch(`${API_BASE}/api/events/${id}`);
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convertit un tableau d'événements en GeoJSON FeatureCollection.
 * Exclut les événements sans coordonnées valides (distanciels, non géocodés).
 */
export function eventsToGeoJSON(events: Event[]): EventsGeoJSON {
  return {
    type: 'FeatureCollection',
    features: events
      .filter(event => event.latitude !== 0 && event.longitude !== 0)
      .map((event): GeoJSONEvent => ({
        type: 'Feature',
        properties: event,
        geometry: {
          type: 'Point',
          coordinates: [event.longitude, event.latitude],
        },
      })),
  };
}
