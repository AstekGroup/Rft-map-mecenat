import { memo } from 'react';
import { Event, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, EVENT_THEME_LABELS } from '@/types/event';
import { TYPE_ICONS } from '@/components/Map/EventMarker';
import { Calendar, Clock, MapPin, BookOpen, Globe } from 'lucide-react';

interface EventCardProps {
  event: Event;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function EventCardComponent({
  event,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

  const Icon = TYPE_ICONS[event.type] || Globe;
  const color = EVENT_TYPE_COLORS[event.type] || '#3BAE5D';

  return (
    <div
      className={`p-4 rounded-card bg-white border-2 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-primary shadow-popup'
          : isHovered
          ? 'border-primary/30 shadow-card'
          : 'border-transparent shadow-card hover:border-primary/20'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="flex items-start gap-3">
        {/* Indicateur type avec picto */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {/* Tag catégorie */}
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1 bg-primary/10 text-primary-dark"
          >
            <Icon className="w-2.5 h-2.5" />
            {EVENT_TYPE_LABELS[event.type]}
          </span>

          <h4 className="font-poppins font-semibold text-text-primary text-sm leading-tight line-clamp-2">
            {event.title}
          </h4>

          <div className="mt-2 space-y-1">
            {/* Date et heure */}
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {event.time}
              </span>
            </div>

            {/* Lieu */}
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="truncate">{event.city}</span>
            </div>

            {/* Thématiques */}
            {event.themes && event.themes.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                <BookOpen className="w-3.5 h-3.5 text-accent-pink flex-shrink-0" />
                <span className="truncate italic">
                  {event.themes.map(t => EVENT_THEME_LABELS[t]).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Badge semaine LGSV */}
          {event.isDuringWeek && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-soft" />
              La Grande Semaine Végétale
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const EventCard = memo(EventCardComponent);
