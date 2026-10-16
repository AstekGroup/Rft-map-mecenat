import { useState, useEffect, useMemo, useCallback } from 'react';
import { Event, EventsGeoJSON, LinkedTableRow } from '@/types/event';
import {fetchEvents, fetchPartners, eventsToGeoJSON, fetchThemes, fetchFormats, fetchPublics} from '@/services/api';
import type { DateFilterMode } from '@/utils/eventDateRange';
import { matchesFilters } from '@/utils/eventFilters';

export interface EventFilters {
  search: string;
  dateFilter: DateFilterMode;
  /** YYYY-MM-DD — utilisé si `dateFilter === 'custom'`. */
  dateFrom: string;
  /** YYYY-MM-DD inclusif ; vide = même jour que `dateFrom`. */
  dateTo: string;
  regions: string[];
  types: string[]; // IDs des formats (LinkedTableRow)
  themes: string[]; // IDs des thèmes (LinkedTableRow)
  partners: string[]; // Partner IDs (LinkedTableRow)
  audiences: string[];// IDs du public cible (LinkedTableRow)
  postalCode: string;
  modality: 'all' | 'presentiel' | 'distanciel';
  showPastEvents: boolean;
}

/**
 * Tout ce dont un écran de filtres a besoin : l'état, les actions et les options issues de Baserow.
 * Le panneau de la carte, la barre de la liste et le panneau latéral reçoivent le même objet
 * (`controls` renvoyé par `useEvents`) au lieu d'une douzaine de props recopiées.
 */
export interface EventFilterControls {
  filters: EventFilters;
  onUpdateFilters: (filters: Partial<EventFilters>) => void;
  onToggleRegion: (region: string) => void;
  onToggleType: (typeId: string) => void;
  onToggleTheme: (themeId: string) => void;
  onTogglePartner: (partnerId: string) => void;
  onToggleAudience: (audienceId: string) => void;
  onResetFilters: () => void;
  availablePartners: LinkedTableRow[];
  availableThemes: LinkedTableRow[];
  availableFormats: LinkedTableRow[];
  availablePublics: LinkedTableRow[];
}

/** Filtres à sélection multiple (listes d'identifiants ou de noms de région). */
type MultiValueFilterKey = 'regions' | 'types' | 'themes' | 'partners' | 'audiences';

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
  const [availablePartners, setAvailablePartners] = useState<LinkedTableRow[]>([]);
  const [availableThemes, setAvailableThemes] = useState<LinkedTableRow[]>([]);
  const [availableFormats, setAvailableFormats] = useState<LinkedTableRow[]>([]);
  const [availablePublics, setAvailablePublics] = useState<LinkedTableRow[]>([]);
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
        
        // Charger événements et les autres datas pour les filtres
        const [eventsData, partnersData, themesData, formatsData, publicsData] = await Promise.all([
          fetchEvents(devMode),
          fetchPartners(),
          fetchThemes(),
          fetchFormats(),
          fetchPublics(),
        ]);
        
        setEvents(eventsData);
        setAvailablePartners(partnersData);
        setAvailableThemes(themesData);
        setAvailableFormats(formatsData);
        setAvailablePublics(publicsData);
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

  const filteredEvents = useMemo(
    () => events.filter((event) => matchesFilters(event, filters, today)),
    [events, filters, today],
  );

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

  // Ajoute la valeur à la sélection d'un filtre à choix multiples, ou la retire si elle y est déjà.
  const toggleValue = useCallback((key: MultiValueFilterKey, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  }, []);

  const toggleRegion = useCallback((region: string) => toggleValue('regions', region), [toggleValue]);
  const toggleType = useCallback((typeId: string) => toggleValue('types', typeId), [toggleValue]);
  const toggleTheme = useCallback((themeId: string) => toggleValue('themes', themeId), [toggleValue]);
  const togglePartner = useCallback((partnerId: string) => toggleValue('partners', partnerId), [toggleValue]);
  const toggleAudience = useCallback((audienceId: string) => toggleValue('audiences', audienceId), [toggleValue]);

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
      availableFormats.map(format => [
        format.id,
        filteredEvents.filter(e => e.type && e.type.id === format.id).length,
      ])
    ) as Record<string, number>,
    byRegion: Object.fromEntries(
      [...new Set(events.map(e => e.region))].map(region => [
        region,
        filteredEvents.filter(e => e.region === region).length,
      ])
    ) as Record<string, number>,
  }), [events, filteredEvents, availableFormats]);

  const controls: EventFilterControls = useMemo(() => ({
    filters,
    onUpdateFilters: updateFilters,
    onToggleRegion: toggleRegion,
    onToggleType: toggleType,
    onToggleTheme: toggleTheme,
    onTogglePartner: togglePartner,
    onToggleAudience: toggleAudience,
    onResetFilters: resetFilters,
    availablePartners,
    availableThemes,
    availableFormats,
    availablePublics,
  }), [
    filters, updateFilters, toggleRegion, toggleType, toggleTheme, togglePartner, toggleAudience,
    resetFilters, availablePartners, availableThemes, availableFormats, availablePublics,
  ]);

  return {
    controls,
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
    availableThemes,
    availableFormats,
    availablePublics,
  };
}
