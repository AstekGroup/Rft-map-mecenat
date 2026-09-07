import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Event } from '@/types/event';
import { TYPE_ICONS } from '@/components/Map/EventMarker';
import { Pagination } from '@/components/UI/Pagination';
import {Calendar, Clock, Users, Accessibility, MapPin, Video, BookOpen} from 'lucide-react';

const ITEMS_PER_PAGE = 24;

interface EventListViewProps {
  events: Event[];
}

export function EventListView({ events }: EventListViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
  
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return events.slice(start, start + ITEMS_PER_PAGE);
  }, [events, currentPage]);
  
  // Reset to page 1 when events change
  useEffect(() => {
    setCurrentPage(1);
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-text-secondary text-lg font-medium">
            Aucun événement trouvé
          </p>
          <p className="text-text-secondary/70 text-sm mt-1">
            Essayez de modifier vos filtres
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Results count */}
      <div className="px-6 py-3 border-b border-primary/10 bg-white">
        <p className="text-sm text-text-secondary">
          {totalPages > 1 ? (
            <>
              Page {currentPage} sur {totalPages} — 
              <span className="font-semibold text-primary ml-1">{events.length}</span> événements au total
            </>
          ) : (
            <>
              <span className="font-semibold text-primary">{events.length}</span> événements trouvés
            </>
          )}
        </p>
      </div>

      {/* Event grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {paginatedEvents.map((event) => {
            const Icon = event.type?.pictoName ? TYPE_ICONS[event.type.pictoName] : TYPE_ICONS['autre'];
            const typeColor = event.type?.colorHexa || "#D4DDE2";
            
            return (
              <Link
                key={event.id}
                to={`/evenement/${event.id}`}
                className="bg-white rounded-xl shadow-card hover:shadow-popup transition-all group flex flex-col"
              >
                {/* Image */}
                {event.imageUrl ? (
                  <div className="relative h-28 overflow-hidden rounded-t-xl">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Tags overlay on image */}
                    <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
                      {event.isDuringWeek && (
                        <span className="inline-flex items-center gap-0.5 bg-primary text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                          LGSV 2026
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-beige text-primary-dark"
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {event.type?.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="h-16 rounded-t-xl flex items-center justify-center relative"
                    style={{ backgroundColor: `${typeColor}10` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: typeColor }} />
                    <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
                      {event.isDuringWeek && (
                        <span className="inline-flex items-center gap-0.5 bg-primary text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                          LGSV 2026
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Content */}
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-poppins font-semibold text-text-primary text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  
                  <div className="space-y-1 text-xs text-text-secondary mt-auto">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>
                        {new Date(event.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-auto" />
                      <span>{event.time}</span>
                    </p>
                    
                    <p className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="truncate">{event.organizer}</span>
                    </p>

                    {event.themes && event.themes.length > 0 && (
                      <p className="flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-accent-pink flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1 font-medium italic">
                          {event.themes.map(t => t.name).join(', ')}
                        </span>
                      </p>
                    )}

                    {/* Modality indicator for online events */}
                    {event.modality === 'distanciel' && (
                      <p className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />
                        <span className="text-accent-red font-medium">En ligne</span>
                      </p>
                    )}
                    
                    {/* Accessibility */}
                    {event.accessibilityInfo && (
                      <p className="flex items-center gap-1.5 text-primary">
                        <Accessibility className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{event.accessibilityInfo}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-primary/10 bg-white">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
