import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarPlus, ChevronDown, Download, ExternalLink } from 'lucide-react';
import type { Event } from '@/types/event';
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcs,
  getCalendarEventData,
  getEventPageUrl,
} from '@/utils/calendar';

interface AddToCalendarProps {
  event: Event;
}

export function AddToCalendar({ event }: AddToCalendarProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const pageUrl = useMemo(() => getEventPageUrl(event.id), [event.id]);
  const data = useMemo(() => getCalendarEventData(event, pageUrl), [event, pageUrl]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!data) return null;

  const closeMenu = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onDownloadIcs = () => {
    downloadIcs(data);
    closeMenu();
  };

  const onOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    closeMenu();
  };

  return (
    <div ref={containerRef} className="relative inline-block mt-3">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-button text-sm font-medium bg-white border border-primary/20 text-primary-dark hover:bg-primary/5 transition-colors shadow-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <CalendarPlus className="w-4 h-4 text-primary" />
        Ajouter à mon calendrier
        <ChevronDown className={`w-4 h-4 text-primary/70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Ajouter à mon calendrier"
          className="absolute left-0 z-20 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-primary/10 bg-white shadow-popup p-1.5"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => onOpenLink(buildGoogleCalendarUrl(data))}
            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-surface-beige/60 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="block text-sm font-medium text-text-primary">Google Calendar</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => onOpenLink(buildOutlookCalendarUrl(data))}
            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-surface-beige/60 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="block text-sm font-medium text-text-primary">Outlook</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onDownloadIcs}
            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-surface-beige/60 transition-colors"
          >
            <Download className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span>
              <span className="block text-sm font-medium text-text-primary">Télécharger le fichier .ics</span>
              <span className="block text-xs text-text-secondary">Apple Calendar, Outlook, autres</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
