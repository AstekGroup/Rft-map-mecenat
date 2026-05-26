import { useState, useEffect, useMemo, useCallback } from 'react';
import { Event, EventType, EventTheme, TargetAudience, EventsGeoJSON, Partner, EVENT_TYPES_ALL } from '@/types/event';
import { fetchEvents, fetchPartners, eventsToGeoJSON } from '@/services/api';
import type { DateFilterMode } from '@/utils/eventDateRange';
import { eventIntersectsYmdRange } from '@/utils/eventDateRange';

export interface EventFilters {
  search: string;
  dateFilter: DateFilterMode;
  /** YYYY-MM-DD — utilisé si `dateFilter === 'custom'`. */
  dateFrom: string;
  /** YYYY-MM-DD inclusif ; vide = même jour que `dateFrom`. */
  dateTo: string;
  regions: string[];
  types: EventType[];
  themes: EventTheme[];
  partners: string[]; // Partner IDs
  audiences: TargetAudience[];
  postalCode: string;
  modality: 'all' | 'presentiel' | 'distanciel';
  showPastEvents: boolean;
}

const initialFilters: EventFilters = {
  search: '',
  dateFilter: 'all',
  dateFrom: '',
  dateTo: '',
  regions: [],
  types: [],
  themes: [],
  partners: [],
  audiences: [],
  postalCode: '',
  modality: 'all',
  showPastEvents: false,
};

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [availablePartners, setAvailablePartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [devMode, setDevMode] = useState(false);

  // Charger les données depuis le backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Charger événements et partenaires en parallèle
        const [eventsData, partnersData] = await Promise.all([
          fetchEvents(devMode),
          fetchPartners()
        ]);
        
        setEvents(eventsData);
        setAvailablePartners(partnersData);
      } catch (err) {
        console.error('[useEvents] Erreur lors du chargement:', err);
        setError(err instanceof Error ? err : new Error('Erreur lors du chargement des données'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [devMode]);

  // Date du jour (sans heures) pour le filtre des événements passés
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filtrer les événements
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Filtre événements passés (par défaut on masque les passés)
      if (!filters.showPastEvents) {
        const eventEndDate = new Date(event.endDate || event.date);
        eventEndDate.setHours(23, 59, 59, 999);
        if (eventEndDate < today) return false;
      }

      // Filtre recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.city.toLowerCase().includes(searchLower) ||
          event.organizer.toLowerCase().includes(searchLower) ||
          event.region.toLowerCase().includes(searchLower) ||
          (event.venueName && event.venueName.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Filtre modalité
      if (filters.modality !== 'all' && event.modality !== filters.modality) return false;

      // Filtre date
      if (filters.dateFilter === 'during-week' && !event.isDuringWeek) return false;
      if (filters.dateFilter === 'weekend-sept') {
        if (!eventIntersectsYmdRange(event, '2026-09-26', '2026-09-27')) return false;
      }
      if (filters.dateFilter === 'weekend-oct') {
        if (!eventIntersectsYmdRange(event, '2026-10-04', '2026-10-05')) return false;
      }
      if (filters.dateFilter === 'custom' && filters.dateFrom) {
        const rangeStart = filters.dateFrom.slice(0, 10);
        const rangeEnd = (filters.dateTo || filters.dateFrom).slice(0, 10);
        if (!eventIntersectsYmdRange(event, rangeStart, rangeEnd)) return false;
      }

      // Filtre régions
      if (filters.regions.length > 0 && !filters.regions.includes(event.region)) return false;

      // Filtre types
      if (filters.types.length > 0 && !filters.types.includes(event.type)) return false;

      // Filtre thématiques
      if (filters.themes.length > 0) {
        const hasMatchingTheme = event.themes.some(theme => filters.themes.includes(theme));
        if (!hasMatchingTheme) return false;
      }

      // Filtre partenaires
      if (filters.partners.length > 0) {
        if (!event.partners || event.partners.length === 0) return false;
        const hasMatchingPartner = event.partners.some(partner => filters.partners.includes(partner.id));
        if (!hasMatchingPartner) return false;
      }

      // Filtre public cible
      if (filters.audiences.length > 0 && !filters.audiences.some(a => event.targetAudience.includes(a))) return false;

      // Filtre code postal
      if (filters.postalCode) {
        const postalCodeFilter = filters.postalCode.trim();
        if (!event.postalCode.startsWith(postalCodeFilter)) return false;
      }

      return true;
    });
  }, [events, filters]);

  // Convertir en GeoJSON (exclut automatiquement les événements sans coordonnées)
  const geojson: EventsGeoJSON = useMemo(() => {
    return eventsToGeoJSON(filteredEvents);
  }, [filteredEvents]);

  // Actions sur les filtres
  const updateFilters = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };
      const nextMode = newFilters.dateFilter ?? prev.dateFilter;
      if (newFilters.dateFilter !== undefined && nextMode !== 'custom') {
        next.dateFrom = '';
        next.dateTo = '';
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const toggleRegion = (region: string) => {
    setFilters(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region],
    }));
  };

  const toggleType = (type: EventType) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type],
    }));
  };

  const toggleTheme = (theme: EventTheme) => {
    setFilters(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme],
    }));
  };

  const togglePartner = (partnerId: string) => {
    setFilters(prev => ({
      ...prev,
      partners: prev.partners.includes(partnerId)
        ? prev.partners.filter(p => p !== partnerId)
        : [...prev.partners, partnerId],
    }));
  };

  const toggleAudience = (audience: TargetAudience) => {
    setFilters(prev => ({
      ...prev,
      audiences: prev.audiences.includes(audience)
        ? prev.audiences.filter(a => a !== audience)
        : [...prev.audiences, audience],
    }));
  };

  // Toggle mode dev (afficher tous les événements vs validés seulement)
  const toggleDevMode = useCallback(() => {
    setDevMode(prev => !prev);
  }, []);

  // Stats
  const stats = useMemo(() => ({
    total: events.length,
    filtered: filteredEvents.length,
    duringWeek: events.filter(e => e.isDuringWeek).length,
    byType: Object.fromEntries(
      EVENT_TYPES_ALL.map(type => [
        type,
        filteredEvents.filter(e => e.type === type).length,
      ])
    ) as Record<EventType, number>,
    byRegion: Object.fromEntries(
      [...new Set(events.map(e => e.region))].map(region => [
        region,
        filteredEvents.filter(e => e.region === region).length,
      ])
    ) as Record<string, number>,
  }), [events, filteredEvents]);

  return {
    events: filteredEvents,
    allEvents: events,
    geojson,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
    toggleRegion,
    toggleType,
    toggleTheme,
    togglePartner,
    availablePartners,
    toggleAudience,
    stats,
    devMode,
    toggleDevMode,
  };
}
