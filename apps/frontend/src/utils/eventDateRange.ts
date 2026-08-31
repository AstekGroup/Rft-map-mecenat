import type { Event } from '@/types/event';

export type DateFilterMode = 'all' | 'during-week' | 'custom';

export function isDateFilterActive(dateFilter: DateFilterMode, dateFrom: string): boolean {
  return (
    dateFilter === 'during-week' ||
    (dateFilter === 'custom' && !!dateFrom)
  );
}

/** Extrait YYYY-MM-DD depuis une chaîne API (ISO ou date seule). */
export function toYmd(s: string | undefined): string {
  if (!s) return '';
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * L’événement intersecte-t-il [rangeStart, rangeEnd] (inclus, bornes YYYY-MM-DD) ?
 * Utilise `date` et `endDate` (ou `date` si fin absente).
 */
export function eventIntersectsYmdRange(
  event: Pick<Event, 'date' | 'endDate'>,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const es = toYmd(event.date);
  const ee = toYmd(event.endDate) || es;
  const rs = rangeStart.slice(0, 10);
  const re = rangeEnd.slice(0, 10);
  if (!es || !rs) return true;
  const end = re >= rs ? re : rs;
  return es <= end && ee >= rs;
}

/** Libellé court pour chip (fr-FR). */
export function formatFrDateRangeLabel(dateFrom: string, dateTo: string): string {
  if (!dateFrom) return 'Plage personnalisée';
  const end = dateTo && dateTo >= dateFrom ? dateTo : dateFrom;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const a = new Date(`${dateFrom}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  if (dateFrom === end) {
    return a.toLocaleDateString('fr-FR', opts);
  }
  return `${a.toLocaleDateString('fr-FR', opts)} → ${b.toLocaleDateString('fr-FR', opts)}`;
}
