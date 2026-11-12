import type { Event } from '@/types/event';

const DEFAULT_DURATION_MINUTES = 60;
const DEFAULT_TIMEZONE = 'Europe/Paris';

export interface CalendarEventData {
  uid: string;
  title: string;
  description: string;
  location: string;
  url?: string;
  startYmd: string;
  endYmd: string;
  /** HH:mm en heure locale (Europe/Paris par défaut) ; absent = journée entière */
  startTime?: string;
  /** HH:mm en heure locale ; absent si journée entière */
  endTime?: string;
  allDay: boolean;
}

interface TimeParts {
  hour: number;
  minute: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function normalizeYmd(date: string | undefined): string | null {
  if (!date) return null;
  const ymd = date.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

/**
 * Parse une heure affichée (ex. "14:00", "14h00", "14h", "9 h 30") en HH:mm.
 * Retourne null si l'heure est absente ou illisible.
 */
export function parseEventTime(time: string | undefined): string | null {
  if (!time) return null;
  const s = time.trim().toLowerCase().replace(/\s+/g, '');
  const match = s.match(/^(\d{1,2})(?:[:h](\d{2}))?(?:h)?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] !== undefined ? Number(match[2]) : 0;
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function toTimeParts(hhmm: string): TimeParts {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h, minute: m };
}

function addMinutes(hhmm: string, minutes: number): string {
  const { hour, minute } = toTimeParts(hhmm);
  const total = hour * 60 + minute + minutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

function compareYmd(a: string, b: string): number {
  return a.localeCompare(b);
}

function compareDateTime(ymdA: string, timeA: string, ymdB: string, timeB: string): number {
  const d = compareYmd(ymdA, ymdB);
  if (d !== 0) return d;
  return timeA.localeCompare(timeB);
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildLocation(event: Event): string {
  if (event.modality === 'distanciel') {
    return event.videoConferenceUrl?.trim() || 'Événement en ligne';
  }
  const parts = [
    event.venueName?.trim(),
    event.address?.trim(),
    [event.postalCode, event.city].map((p) => p?.trim()).filter(Boolean).join(' ').trim(),
  ].filter((p): p is string => Boolean(p && p.length > 0));
  return parts.join(', ');
}

function buildDescription(event: Event, pageUrl?: string): string {
  const chunks: string[] = [];
  if (event.description?.trim()) chunks.push(event.description.trim());
  if (event.modality === 'distanciel' && event.videoConferenceUrl?.trim()) {
    chunks.push(`Accès en ligne : ${event.videoConferenceUrl.trim()}`);
  }
  if (pageUrl) chunks.push(`Détails : ${pageUrl}`);
  return chunks.join('\n\n');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldIcsLine(line: string): string {
  // Limite simple à 75 octets approximée par caractères ; suffisant pour nos champs.
  const limit = 75;
  if (line.length <= limit) return line;
  let out = '';
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? limit : limit - 1));
    out += i === 0 ? chunk : `\r\n ${chunk}`;
    i += chunk.length;
  }
  return out;
}

function formatUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function ymdToCompact(ymd: string): string {
  return ymd.replace(/-/g, '');
}

function timeToCompact(hhmm: string): string {
  return `${hhmm.replace(':', '')}00`;
}

/**
 * Construit les données calendrier normalisées d'un événement.
 * Retourne null si aucune date de début exploitable n'est disponible.
 */
export function getCalendarEventData(event: Event, pageUrl?: string): CalendarEventData | null {
  const startYmd = normalizeYmd(event.date);
  if (!startYmd) return null;

  let endYmd = normalizeYmd(event.endDate) || startYmd;
  if (compareYmd(endYmd, startYmd) < 0) endYmd = startYmd;

  const parsedStart = parseEventTime(event.time);
  const parsedEnd = parseEventTime(event.endTime);

  let allDay = !parsedStart;
  let startTime: string | undefined;
  let endTime: string | undefined;

  if (parsedStart) {
    startTime = parsedStart;
    if (parsedEnd) {
      // Si fin <= début le même jour (ou avant), on applique une durée par défaut.
      if (compareDateTime(endYmd, parsedEnd, startYmd, parsedStart) <= 0) {
        if (compareYmd(endYmd, startYmd) === 0) {
          endTime = addMinutes(parsedStart, DEFAULT_DURATION_MINUTES);
          // Si +1h dépasse minuit, on garde sur la même journée en capant à 23:59.
          if (compareDateTime(startYmd, endTime, startYmd, parsedStart) <= 0) {
            endTime = '23:59';
          }
        } else {
          endTime = addMinutes(parsedStart, DEFAULT_DURATION_MINUTES);
        }
      } else {
        endTime = parsedEnd;
      }
    } else {
      endTime = addMinutes(parsedStart, DEFAULT_DURATION_MINUTES);
      if (compareYmd(endYmd, startYmd) === 0 && endTime <= startTime) {
        endTime = '23:59';
      }
    }
  } else {
    allDay = true;
  }

  return {
    uid: `${event.id}@make-map`,
    title: event.title?.trim() || 'Événement',
    description: buildDescription(event, pageUrl),
    location: buildLocation(event),
    url: pageUrl,
    startYmd,
    endYmd,
    startTime,
    endTime,
    allDay,
  };
}

export function buildIcs(data: CalendarEventData, now: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//make-map//Ajouter au calendrier//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(data.uid)}`,
    `DTSTAMP:${formatUtcStamp(now)}`,
  ];

  if (data.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${ymdToCompact(data.startYmd)}`);
    // DTEND en all-day est exclusif (RFC 5545) : on ajoute +1 jour à la date de fin incluse.
    lines.push(`DTEND;VALUE=DATE:${ymdToCompact(addDaysYmd(data.endYmd, 1))}`);
  } else if (data.startTime) {
    const endTime = data.endTime || addMinutes(data.startTime, DEFAULT_DURATION_MINUTES);
    lines.push(`DTSTART;TZID=${DEFAULT_TIMEZONE}:${ymdToCompact(data.startYmd)}T${timeToCompact(data.startTime)}`);
    lines.push(`DTEND;TZID=${DEFAULT_TIMEZONE}:${ymdToCompact(data.endYmd)}T${timeToCompact(endTime)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(data.title)}`);
  if (data.description) lines.push(`DESCRIPTION:${escapeIcsText(data.description)}`);
  if (data.location) lines.push(`LOCATION:${escapeIcsText(data.location)}`);
  if (data.url) lines.push(`URL:${escapeIcsText(data.url)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function buildGoogleCalendarUrl(data: CalendarEventData): string {
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', data.title);
  params.set('ctz', DEFAULT_TIMEZONE);
  params.set('details', data.description);
  if (data.location) params.set('location', data.location);

  if (data.allDay) {
    params.set('dates', `${ymdToCompact(data.startYmd)}/${ymdToCompact(addDaysYmd(data.endYmd, 1))}`);
  } else if (data.startTime) {
    const endTime = data.endTime || addMinutes(data.startTime, DEFAULT_DURATION_MINUTES);
    params.set(
      'dates',
      `${ymdToCompact(data.startYmd)}T${timeToCompact(data.startTime)}/${ymdToCompact(data.endYmd)}T${timeToCompact(endTime)}`,
    );
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(data: CalendarEventData): string {
  const params = new URLSearchParams();
  params.set('path', '/calendar/action/compose');
  params.set('rru', 'addevent');
  params.set('subject', data.title);
  params.set('body', data.description);
  if (data.location) params.set('location', data.location);

  if (data.allDay) {
    params.set('allday', 'true');
    params.set('startdt', data.startYmd);
    params.set('enddt', addDaysYmd(data.endYmd, 1));
  } else if (data.startTime) {
    const endTime = data.endTime || addMinutes(data.startTime, DEFAULT_DURATION_MINUTES);
    params.set('allday', 'false');
    params.set('startdt', `${data.startYmd}T${data.startTime}:00`);
    params.set('enddt', `${data.endYmd}T${endTime}:00`);
  }

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

function sanitizeFilename(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return base || 'evenement';
}

export function downloadIcs(data: CalendarEventData, now: Date = new Date()): void {
  const ics = buildIcs(data, now);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `${sanitizeFilename(data.title)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

export function getEventPageUrl(eventId: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/evenement/${encodeURIComponent(eventId)}`;
}

export const CALENDAR_TIMEZONE = DEFAULT_TIMEZONE;
