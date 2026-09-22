import { memo } from 'react';
import { LinkedTableRow} from '@/types/event';
import {checkIconColor, getIcon} from "@/utils/iconResolver.ts";
import {HelpCircle} from "lucide-react";

interface EventMarkerProps {
  type: LinkedTableRow;
  isSelected?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  size?: 'sm' | 'md';
  dateLabel?: string;
}

function EventMarkerComponent({
  type,
  isSelected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  size = 'md',
  dateLabel,
}: EventMarkerProps) {
  const Icon = getIcon(type?.pictoName, HelpCircle);
  const typeColor = checkIconColor(type?.colorHexa, "#D4DDE2");
  const isSmall = size === 'sm';

  return (
    <div className="flex flex-col items-center gap-0.5" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div
        className={`event-marker animate-scale-in ${isSelected ? 'ring-2 ring-white scale-125' : ''}`}
        style={{
          backgroundColor: typeColor,
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
          style={{ backgroundColor: typeColor }}
          onClick={onClick}
        >
          {dateLabel}
        </div>
      )}
    </div>
  );
}

export const EventMarker = memo(EventMarkerComponent);
