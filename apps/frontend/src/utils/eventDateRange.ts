import type { Event } from '@/types/event';

export type DateFilterMode = 'all' | 'during-week' | 'custom';

export function isDateFilterActive(dateFilter: DateFilterMode, dateFrom: string): boolean {
  return (
    dateFilter === 'during-week' ||
    (dateFilter === 'custom' && !!dateFrom)
  );
}

/** Jour calendaire (fuseau du navigateur) de `date`, au format YYYY-MM-DD. */
export function toLocalYmd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * L'événement (la période `app.eventDates` de la config) est-il terminé ? Vrai dès le lendemain
 * de sa dernière journée. Date de fin absente ou illisible : faux (on ne devine rien).
 */
export function isEventOver(weekEnd: string | undefined, now: Date = new Date()): boolean {
  if (!weekEnd || !/^\d{4}-\d{2}-\d{2}/.test(weekEnd)) return false;
  return toLocalYmd(now) > weekEnd.slice(0, 10);
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
