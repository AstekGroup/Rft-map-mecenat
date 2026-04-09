import { useState, useMemo } from 'react';
import { Event, EventTheme } from '@/types/event';
import { EventFilters } from '@/hooks';
import { EventCard } from './EventCard';
import { FilterPanel } from '@/components/Filters/FilterPanel';
import { ChevronLeft, ChevronRight, Filter, List, MapIcon } from 'lucide-react';
import { MapBounds } from '@/components/Map';
import { isDateFilterActive } from '@/utils/eventDateRange';

interface SidebarProps {
  events: Event[];
  filters: EventFilters;
  onUpdateFilters: (filters: Partial<EventFilters>) => void;
  onToggleRegion: (region: string) => void;
  onToggleType: (type: string) => void;
  onToggleTheme: (theme: EventTheme) => void;
  onToggleAudience: (audience: string) => void;
  onResetFilters: () => void;
  selectedEvent: Event | null;
  onSelectEvent: (event: Event | null) => void;
  hoveredEvent: Event | null;
  onHoverEvent: (event: Event | null) => void;
  stats: {
    total: number;
    filtered: number;
    duringWeek: number;
  };
  mapBounds?: MapBounds | null;
}

export function Sidebar({
  events,
  filters,
  onUpdateFilters,
  onToggleRegion,
  onToggleType,
  onToggleTheme,
  onToggleAudience,
  onResetFilters,
  selectedEvent,
  onSelectEvent,
  hoveredEvent,
  onHoverEvent,
  stats,
  mapBounds,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'filters'>('list');

  // Séparer les événements visibles sur la carte des autres
  const { visibleEvents, hiddenEvents } = useMemo(() => {
    if (!mapBounds) return { visibleEvents: null, hiddenEvents: events };
    const inBounds = (e: Event) =>
      e.longitude >= mapBounds.west &&
      e.longitude <= mapBounds.east &&
      e.latitude >= mapBounds.south &&
      e.latitude <= mapBounds.north;
    return {
      visibleEvents: events.filter(inBounds),
      hiddenEvents: events.filter(e => !inBounds(e)),
    };
  }, [events, mapBounds]);

  const filtersActiveBadge =
    !!filters.search ||
    !!filters.postalCode ||
    filters.regions.length > 0 ||
    filters.types.length > 0 ||
    filters.audiences.length > 0 ||
    isDateFilterActive(filters.dateFilter, filters.dateFrom);

  if (isCollapsed) {
    return (
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-primary text-white p-3 rounded-r-lg shadow-popup hover:bg-primary-dark transition-colors"
          aria-label="Ouvrir le panneau latéral"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Overlay mobile */}
      <div 
        className="fixed inset-0 bg-black/30 z-10 sm:hidden"
        onClick={() => setIsCollapsed(true)}
      />
      
      <div className="absolute left-0 top-0 bottom-0 w-full sm:w-96 sm:max-w-[85vw] bg-surface-offwhite shadow-popup z-20 flex flex-col animate-slide-up font-inter border-r border-primary/10">
      {/* Header */}
      <div className="p-4 bg-primary text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-poppins font-semibold text-lg">Événements nationaux</h2>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Fermer le panneau latéral"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Onglets */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'bg-white text-primary'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <List className="w-4 h-4" />
            Liste
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'filters'
                ? 'bg-white text-primary'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {filtersActiveBadge && (
              <span className="w-2 h-2 bg-accent-yellow rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'list' ? (
          <div className="p-4 space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Aucun événement trouvé</p>
                <p className="text-sm mt-1">Essayez de modifier vos filtres</p>
              </div>
            ) : visibleEvents !== null ? (
              <>
                {/* Section : visibles sur la carte */}
                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
                  <div className="px-3 py-2 bg-primary/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-semibold text-primary-dark uppercase tracking-wide">
                      Visibles sur la carte ({visibleEvents.length})
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    {visibleEvents.length === 0 ? (
                      <p className="text-center text-sm text-text-secondary py-3">
                        Aucun événement dans cette zone
                      </p>
                    ) : (
                      visibleEvents.slice(0, 50).map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          isSelected={selectedEvent?.id === event.id}
                          isHovered={hoveredEvent?.id === event.id}
                          onClick={() => onSelectEvent(event)}
                          onMouseEnter={() => onHoverEvent(event)}
                          onMouseLeave={() => onHoverEvent(null)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Section : hors champ */}
                {hiddenEvents.length > 0 && (
                  <div className="rounded-xl border border-primary/10 bg-white/50 overflow-hidden">
                    <div className="px-3 py-2 bg-primary/5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/30" />
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        Autres événements ({hiddenEvents.length})
                      </span>
                    </div>
                    <div className="p-2 space-y-2">
                      {hiddenEvents.slice(0, 30).map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          isSelected={selectedEvent?.id === event.id}
                          isHovered={hoveredEvent?.id === event.id}
                          onClick={() => onSelectEvent(event)}
                          onMouseEnter={() => onHoverEvent(event)}
                          onMouseLeave={() => onHoverEvent(null)}
                        />
                      ))}
                      {hiddenEvents.length > 30 && (
                        <p className="text-center text-xs text-text-secondary py-2">
                          +{hiddenEvents.length - 30} autres — zoomez ou déplacez la carte
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Pas de bounds encore : liste simple */
              <>
                {hiddenEvents.slice(0, 50).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isSelected={selectedEvent?.id === event.id}
                    isHovered={hoveredEvent?.id === event.id}
                    onClick={() => onSelectEvent(event)}
                    onMouseEnter={() => onHoverEvent(event)}
                    onMouseLeave={() => onHoverEvent(null)}
                  />
                ))}
                {events.length > 50 && (
                  <p className="text-center text-sm text-text-secondary py-2">
                    Affichage limité à 50 événements.
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <FilterPanel
            filters={filters}
            onUpdateFilters={onUpdateFilters}
            onToggleRegion={onToggleRegion}
            onToggleType={onToggleType}
            onToggleTheme={onToggleTheme}
            onToggleAudience={onToggleAudience}
            onResetFilters={onResetFilters}
            stats={stats}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-primary/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            <span className="font-semibold text-primary">{stats.duringWeek}</span> pour La Grande Semaine Végétale
          </span>
          {filtersActiveBadge && (
            <button
              onClick={onResetFilters}
              className="text-accent-red hover:underline font-medium"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
