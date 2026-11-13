import { memo } from 'react';
import { LinkedTableRow} from '@/types/event';
import {checkIconColor, getIcon} from "@/utils/iconResolver.ts";
import {Heart, HelpCircle} from "lucide-react";
import { HIGHLIGHT_LABEL } from '@/utils/highlight';

interface EventMarkerProps {
  type: LinkedTableRow;
  isSelected?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  size?: 'sm' | 'md';
  dateLabel?: string;
  /** Coup de cœur : halo et pastille « cœur » en coin (jeton `accent-yellow` du thème). */
  isHighlighted?: boolean;
}

function EventMarkerComponent({
  type,
  isSelected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  size = 'md',
  dateLabel,
  isHighlighted = false,
}: EventMarkerProps) {
  const Icon = getIcon(type?.pictoName, HelpCircle);
  const typeColor = checkIconColor(type?.colorHexa, "#D4DDE2");
  const isSmall = size === 'sm';

  return (
    <div className="flex flex-col items-center gap-0.5" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="relative">
        <div
          className={`event-marker animate-scale-in ${isSelected ? 'ring-2 ring-white scale-125' : ''} ${
            isHighlighted ? 'ring-2 ring-accent-yellow' : ''
          }`}
          style={{
            backgroundColor: typeColor,
            width: isSmall ? '16px' : '32px',
            height: isSmall ? '16px' : '32px',
          }}
          onClick={onClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onClick()}
          aria-label={
            isHighlighted
              ? `Voir les détails de l'événement (${HIGHLIGHT_LABEL})`
              : "Voir les détails de l'événement"
          }
        >
          <Icon className={isSmall ? 'w-2 h-2 text-white' : 'w-4 h-4 text-white'} />
        </div>
        {isHighlighted && (
          <span
            data-testid="highlight-marker-pin"
            className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-accent-yellow text-text-primary ring-1 ring-white shadow-sm"
            style={{
              width: isSmall ? '12px' : '16px',
              height: isSmall ? '12px' : '16px',
            }}
          >
            <Heart
              className="fill-current"
              style={{ width: isSmall ? '8px' : '10px', height: isSmall ? '8px' : '10px' }}
              aria-hidden="true"
            />
          </span>
        )}
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
