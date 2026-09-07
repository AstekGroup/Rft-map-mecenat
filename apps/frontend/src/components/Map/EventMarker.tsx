import { memo } from 'react';
import {
  MapPin,
  Utensils,
  Apple,
  Mic2,
  HelpCircle,
  Map,
  BookOpen,
  Music,
  Calendar,
  TrophyIcon,
  GraduationCap, Users, Heart, PartyPopper, Briefcase
} from 'lucide-react';
import { LinkedTableRow} from '@/types/event';

interface EventMarkerProps {
  type: LinkedTableRow;
  isSelected?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  size?: 'sm' | 'md';
  dateLabel?: string;
}

export const TYPE_ICONS: Record<string, typeof MapPin> = {
  'utensils': Utensils,
  'apple': Apple,
  'map': Map,
  'book-open': BookOpen,
  'mic-vocal': Mic2,
  'music': Music,
  'circle-question-mark': HelpCircle,
  'calendar': Calendar,
  'trophy': TrophyIcon,
  'graduation-cap': GraduationCap,
  'users': Users,
  'heart': Heart,
  'map-pin': MapPin,
  'party-popper': PartyPopper,
  'briefcase': Briefcase,
  'autre': HelpCircle,
};

function EventMarkerComponent({
  type,
  isSelected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  size = 'md',
  dateLabel,
}: EventMarkerProps) {
  const Icon = type?.pictoName? TYPE_ICONS[type.pictoName] : HelpCircle;
  const isSmall = size === 'sm';

  return (
    <div className="flex flex-col items-center gap-0.5" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div
        className={`event-marker animate-scale-in ${isSelected ? 'ring-2 ring-white scale-125' : ''}`}
        style={{
          backgroundColor: type?.colorHexa,
          width: isSmall ? '16px' : '32px',
          height: isSmall ? '16px' : '32px',
        }}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        aria-label="Voir les détails de l'événement"
      >
        <Icon className={isSmall ? 'w-2 h-2 text-white' : 'w-4 h-4 text-white'} />
      </div>
      {dateLabel && (
        <div
          className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-semibold leading-none shadow-sm whitespace-nowrap pointer-events-none"
          style={{ backgroundColor: type.colorHexa }}
          onClick={onClick}
        >
          {dateLabel}
        </div>
      )}
    </div>
  );
}

export const EventMarker = memo(EventMarkerComponent);
