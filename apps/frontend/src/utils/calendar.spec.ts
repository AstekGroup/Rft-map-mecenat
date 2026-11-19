import { describe, it, expect } from 'vitest';
import type { Event } from '@/types/event';
import {
  buildGoogleCalendarUrl,
  buildIcs,
  buildOutlookCalendarUrl,
  getCalendarEventData,
  parseEventTime,
} from './calendar';

const baseEvent: Event = {
  id: 'evt-1',
  title: 'Atelier jardin partagé',
  description: 'Découverte des plantations.\nAvec goûter.',
  date: '2026-06-10',
  time: '14:00',
  endDate: '2026-06-10',
  endTime: '16:00',
  address: '12 rue des Fleurs',
  city: 'Lyon',
  region: 'Auvergne-Rhône-Alpes',
  department: 'Rhône',
  postalCode: '69000',
  latitude: 45.75,
  longitude: 4.85,
  type: { id: 't1', name: 'Atelier' },
  themes: [],
  organizer: 'Asso Verte',
  isDuringWeek: false,
  isHighlighted: false,
  modality: 'presentiel',
  targetAudience: [],
  isFree: true,
  venueName: 'Maison des associations',
};

describe('parseEventTime', () => {
  it('parse différents formats d’heure', () => {
    expect(parseEventTime('14:00')).toBe('14:00');
    expect(parseEventTime('14h00')).toBe('14:00');
    expect(parseEventTime('14h')).toBe('14:00');
    expect(parseEventTime('9:05')).toBe('09:05');
    expect(parseEventTime('09 h 30')).toBe('09:30');
  });

  it('retourne null si absente ou illisible', () => {
    expect(parseEventTime(undefined)).toBeNull();
    expect(parseEventTime('')).toBeNull();
    expect(parseEventTime('toute la journée')).toBeNull();
    expect(parseEventTime('25:00')).toBeNull();
  });
});

describe('getCalendarEventData', () => {
  it('construit les données nominales présentiel', () => {
    const data = getCalendarEventData(baseEvent, 'https://carte.test/evenement/evt-1');
    expect(data).not.toBeNull();
    expect(data?.allDay).toBe(false);
    expect(data?.startYmd).toBe('2026-06-10');
    expect(data?.endYmd).toBe('2026-06-10');
    expect(data?.startTime).toBe('14:00');
    expect(data?.endTime).toBe('16:00');
    expect(data?.location).toContain('Maison des associations');
    expect(data?.location).toContain('69000 Lyon');
    expect(data?.uid).toBe('evt-1@make-map');
    expect(data?.description).toContain('Détails : https://carte.test/evenement/evt-1');
  });

  it('gère un événement distanciel avec URL de visio', () => {
    const event: Event = {
      ...baseEvent,
      modality: 'distanciel',
      videoConferenceUrl: 'https://visio.test/reunion',
      address: '',
      city: '',
      postalCode: '',
    };
    const data = getCalendarEventData(event);
    expect(data?.location).toBe('https://visio.test/reunion');
    expect(data?.description).toContain('Accès en ligne : https://visio.test/reunion');
  });

  it('passe en journée entière si l’heure est absente', () => {
    const data = getCalendarEventData({ ...baseEvent, time: '' });
    expect(data?.allDay).toBe(true);
    expect(data?.startTime).toBeUndefined();
  });

  it('ajoute une durée par défaut si l’heure de fin est absente', () => {
    const data = getCalendarEventData({ ...baseEvent, endTime: undefined });
    expect(data?.allDay).toBe(false);
    expect(data?.startTime).toBe('14:00');
    expect(data?.endTime).toBe('15:00');
  });

  it('retourne null si la date de début est illisible', () => {
    expect(getCalendarEventData({ ...baseEvent, date: '' })).toBeNull();
    expect(getCalendarEventData({ ...baseEvent, date: 'bientôt' })).toBeNull();
  });

  it('corrige une date de fin antérieure au début', () => {
    const data = getCalendarEventData({ ...baseEvent, endDate: '2026-06-01' });
    expect(data?.endYmd).toBe('2026-06-10');
  });
});

describe('buildIcs', () => {
  const fixedNow = new Date('2026-05-01T10:00:00.000Z');

  it('génère un ICS nominal avec heures et lieu', () => {
    const data = getCalendarEventData(baseEvent, 'https://carte.test/evenement/evt-1')!;
    const ics = buildIcs(data, fixedNow);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Atelier jardin partagé');
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20260610T140000');
    expect(ics).toContain('DTEND;TZID=Europe/Paris:20260610T160000');
    expect(ics).toContain('DTSTAMP:20260501T100000Z');
    expect(ics).toContain('LOCATION:Maison des associations');
    expect(ics).toContain('UID:evt-1@make-map');
    expect(ics).toContain('END:VEVENT');
  });

  it('génère un ICS en journée entière (DTEND exclusif)', () => {
    const data = getCalendarEventData({ ...baseEvent, time: '', endDate: '2026-06-11' })!;
    const ics = buildIcs(data, fixedNow);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260610');
    expect(ics).toContain('DTEND;VALUE=DATE:20260612');
  });

  it('échappe les caractères spéciaux et retours ligne', () => {
    const data = getCalendarEventData({
      ...baseEvent,
      title: 'Atelier, jardin; test\\fin',
      description: 'Ligne 1\nLigne 2',
    })!;
    const ics = buildIcs(data, fixedNow);
    expect(ics).toContain('SUMMARY:Atelier\\, jardin\\; test\\\\fin');
    expect(ics).toContain('Ligne 1\\nLigne 2');
  });
});

describe('liens calendrier', () => {
  it('génère un lien Google Calendar cohérent', () => {
    const data = getCalendarEventData(baseEvent)!;
    const url = buildGoogleCalendarUrl(data);
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('ctz=Europe%2FParis');
    expect(url).toContain('dates=20260610T140000%2F20260610T160000');
    expect(url).toContain('text=Atelier+jardin+partag%C3%A9');
  });

  it('génère un lien Outlook cohérent', () => {
    const data = getCalendarEventData(baseEvent)!;
    const url = buildOutlookCalendarUrl(data);
    expect(url).toContain('https://outlook.live.com/calendar/0/action/compose?');
    expect(url).toContain('allday=false');
    expect(url).toContain('startdt=2026-06-10T14%3A00%3A00');
    expect(url).toContain('enddt=2026-06-10T16%3A00%3A00');
  });

  it('génère des liens en journée entière', () => {
    const data = getCalendarEventData({ ...baseEvent, time: '' })!;
    expect(buildGoogleCalendarUrl(data)).toContain('dates=20260610%2F20260611');
    expect(buildOutlookCalendarUrl(data)).toContain('allday=true');
  });
});
