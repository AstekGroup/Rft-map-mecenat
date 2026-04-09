import { useState } from 'react';
import { Event, EventType, TargetAudience } from '@/types/event';
import { useEvents } from '@/hooks';
import { MapView } from '@/components/Map';
import { Sidebar } from '@/components/Sidebar';
import { Loader2 } from 'lucide-react';

function App() {
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
    toggleAudience,
    stats,
  } = useEvents();

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null);

  // État de chargement
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-offwhite">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="mt-4 font-poppins font-semibold text-text-primary text-lg">
            Chargement des événements...
          </p>
          <p className="text-text-secondary text-sm mt-2 font-inter">
            Découvrez La Grande Semaine Végétale
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
      {/* Carte */}
      <MapView
        geojson={geojson}
        selectedEvent={selectedEvent}
        onSelectEvent={setSelectedEvent}
        hoveredEvent={hoveredEvent}
        onHoverEvent={setHoveredEvent}
      />

      {/* Sidebar */}
      <Sidebar
        events={events}
        filters={filters}
        onUpdateFilters={updateFilters}
        onToggleRegion={toggleRegion}
        onToggleType={(type) => toggleType(type as EventType)}
        onToggleTheme={toggleTheme}
        onToggleAudience={(audience) => toggleAudience(audience as TargetAudience)}
        onResetFilters={resetFilters}
        selectedEvent={selectedEvent}
        onSelectEvent={setSelectedEvent}
        hoveredEvent={hoveredEvent}
        onHoverEvent={setHoveredEvent}
        stats={stats}
      />

      {/* Badge compteur mobile */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:hidden bg-white rounded-full px-4 py-2 shadow-popup z-10">
        <span className="font-poppins font-semibold text-primary">
          {stats.filtered}
        </span>
        <span className="text-text-secondary text-sm ml-1">événements</span>
      </div>
    </div>
  );
}

export default App;
