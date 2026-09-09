import { useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Event, EventType, TargetAudience } from '@/types/event';
import { useEvents } from '@/hooks';
import { MapView, MapBounds } from '@/components/Map';
import { Sidebar } from '@/components/Sidebar';
import { SearchOverlay } from '@/components/Map/SearchOverlay';
import { Loader2, List, Home, Filter, Wifi } from 'lucide-react';

export interface MapViewHandle {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
}

export function MapPage() {
  const navigate = useNavigate();
  
  const {
    events,
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
    availableThemes,
    availableFormats,
    availablePublics,
  } = useEvents();

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const mapFlyToRef = useRef<((lng: number, lat: number, zoom?: number) => void) | null>(null);

  const handleViewDetails = (eventId: string) => {
    navigate(`/evenement/${eventId}`);
  };

  // Quand on clique sur un événement dans la sidebar, zoom et popup
  const handleSidebarEventClick = useCallback((event: Event | null) => {
    setSelectedEvent(event);
    if (event && mapFlyToRef.current) {
      mapFlyToRef.current(event.longitude, event.latitude, 14);
    }
  }, []);

  // Callback pour le zoom via la recherche
  const handleSearchFlyTo = useCallback((lng: number, lat: number, zoom: number) => {
    if (mapFlyToRef.current) {
      mapFlyToRef.current(lng, lat, zoom);
    }
  }, []);

  // Callback pour filtrer les événements via la recherche
  const handleSearchFilter = useCallback((search: string) => {
    updateFilters({ search });
  }, [updateFilters]);

  // État de chargement
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-offwhite font-inter">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="mt-4 font-poppins font-semibold text-text-primary text-lg">
            Chargement des événements...
          </p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-offwhite font-inter">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="font-poppins font-semibold text-text-primary text-xl mb-2">
            Oups, une erreur s'est produite
          </h2>
          <p className="text-text-secondary mb-6">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden font-inter">
      {/* Barre de recherche proéminente */}
      <SearchOverlay
        onFlyTo={handleSearchFlyTo}
        onSearchFilter={handleSearchFilter}
        searchValue={filters.search}
      />

      {/* Navigation Controls - masqués sur mobile (accessibles via bouton Filtres en bas) */}
      <div className="absolute top-4 left-4 z-20 hidden sm:flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="bg-white shadow-popup rounded-xl p-2.5 hover:bg-surface-beige transition-all border border-primary/5 group"
            title="Retour à l'accueil"
          >
            <Home className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          </Link>
          <button
            onClick={() => navigate('/evenements')}
            className="bg-white shadow-popup rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-text-primary hover:bg-surface-beige transition-all border border-primary/5 group"
          >
            <List className="w-4 h-4 group-hover:scale-110 transition-transform text-primary" />
            Voir la liste
          </button>
        </div>
        <button
          onClick={() => navigate('/evenements?modality=distanciel')}
          className="bg-white shadow-popup rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-text-primary hover:bg-surface-beige transition-all border border-primary/5 group"
        >
          <Wifi className="w-4 h-4 group-hover:scale-110 transition-transform text-primary" />
          Événements en ligne
        </button>
      </div>

      {/* Carte */}
      <MapView
        geojson={geojson}
        selectedEvent={selectedEvent}
        onSelectEvent={setSelectedEvent}
        hoveredEvent={hoveredEvent}
        onHoverEvent={setHoveredEvent}
        onViewEventDetails={handleViewDetails}
        onMapFlyToReady={(flyToFn) => { mapFlyToRef.current = flyToFn; }}
        onBoundsChange={setMapBounds}
      />
      {/*

      {/* Sidebar - visible sur desktop, toggle sur mobile */}
      <div className="hidden sm:block">
        <Sidebar
          events={events}
          filters={filters}
          onUpdateFilters={updateFilters}
          onToggleRegion={toggleRegion}
          onToggleType={(type) => toggleType(type as EventType)}
          onToggleTheme={toggleTheme}
          onTogglePartner={togglePartner}
          availablePartners={availablePartners}
          onToggleAudience={(audience) => toggleAudience(audience as TargetAudience)}
          onResetFilters={resetFilters}
          selectedEvent={selectedEvent}
          onSelectEvent={handleSidebarEventClick}
          hoveredEvent={hoveredEvent}
          onHoverEvent={setHoveredEvent}
          stats={stats}
          mapBounds={mapBounds}
          availableThemes={availableThemes}
          availableFormats={availableFormats}
          availablePublics={availablePublics}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileShowSidebar && (
        <div className="sm:hidden">
          <Sidebar
            events={events}
            filters={filters}
            onUpdateFilters={updateFilters}
            onToggleRegion={toggleRegion}
            onToggleType={(type) => toggleType(type as EventType)}
            onToggleTheme={toggleTheme}
            onTogglePartner={togglePartner}
            availablePartners={availablePartners}
          onToggleAudience={(audience) => toggleAudience(audience as TargetAudience)}
            onResetFilters={resetFilters}
            selectedEvent={selectedEvent}
            onSelectEvent={(event) => {
              handleSidebarEventClick(event);
              setMobileShowSidebar(false);
            }}
            hoveredEvent={hoveredEvent}
            onHoverEvent={setHoveredEvent}
            stats={stats}
            mapBounds={mapBounds}
            availableThemes={availableThemes}
            availableFormats={availableFormats}
            availablePublics={availablePublics}
          />
        </div>
      )}

      {/* Mobile: bouton d'ouverture sidebar au lieu du badge compteur */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:hidden z-10">
        <button
          onClick={() => setMobileShowSidebar(!mobileShowSidebar)}
          className="bg-primary text-white rounded-full px-5 py-3 shadow-popup flex items-center gap-2 font-poppins font-semibold text-sm"
        >
          <Filter className="w-4 h-4" />
          {mobileShowSidebar ? 'Fermer' : 'Filtres & Liste'}
        </button>
      </div>
    </div>
  );
}
