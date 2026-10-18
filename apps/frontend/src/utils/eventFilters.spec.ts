import { describe, expect, it } from 'vitest';
import type { EventFilters } from '@/hooks/useEvents';
import type { Event } from '@/types/event';
import { countActiveFilters, isPastEvent, matchesFilters, matchesSearch } from './eventFilters';

const defaultFilters: EventFilters = {
  search: '',
  dateFilter: 'all',
  dateFrom: '',
  dateTo: '',
  regions: [],
  types: [],
  themes: [],
  partners: [],
  audiences: [],
  postalCode: '',
  modality: 'all',
  showPastEvents: false,
};

const today = new Date('2035-06-10T00:00:00');

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    title: 'Atelier cuisine',
    description: 'Cuisiner des légumineuses',
    date: '2035-06-20',
    time: '14:00',
    address: '1 rue Test',
    city: 'Nantes',
    region: 'Pays de la Loire',
    department: '44',
    postalCode: '44000',
    latitude: 47.2,
    longitude: -1.5,
    type: { id: 'atelier', name: 'Atelier' },
    themes: [{ id: 'cuisine', name: 'Cuisine' }],
    organizer: 'Association Verte',
    isDuringWeek: false,
    modality: 'presentiel',
    targetAudience: [],
    isFree: true,
    ...overrides,
  };
}

describe('countActiveFilters', () => {
  it('returns zero when filters are at their default values', () => {
    expect(countActiveFilters(defaultFilters)).toBe(0);
  });

  it('counts selected values and each active scalar filter', () => {
    expect(countActiveFilters({
      ...defaultFilters,
      search: 'festival',
      postalCode: '75001',
      regions: ['Bretagne', 'Normandie'],
      types: ['atelier'],
      themes: ['cuisine'],
      partners: ['partner-1'],
      audiences: ['families'],
      dateFilter: 'during-week',
      modality: 'presentiel',
      showPastEvents: true,
    })).toBe(11);
  });

  it("ne compte « événements passés » que s'il s'écarte du défaut", () => {
    // Avant la fin de l'événement : le défaut est de les masquer.
    expect(countActiveFilters({ ...defaultFilters, showPastEvents: true }, false)).toBe(1);
    expect(countActiveFilters({ ...defaultFilters, showPastEvents: false }, false)).toBe(0);
    // Après la fin : le défaut est de les montrer, les masquer devient un filtre.
    expect(countActiveFilters({ ...defaultFilters, showPastEvents: true }, true)).toBe(0);
    expect(countActiveFilters({ ...defaultFilters, showPastEvents: false }, true)).toBe(1);
  });
});

describe('matchesSearch', () => {
  it('accepte tout quand la recherche est vide ou ne contient que des espaces', () => {
    expect(matchesSearch(makeEvent(), '')).toBe(true);
    expect(matchesSearch(makeEvent(), '   ')).toBe(true);
  });

  it.each([
    ['titre', 'atelier'],
    ['description', 'LÉGUMINEUSES'],
    ['ville', 'nantes'],
    ['organisateur', 'association verte'],
    ['région', 'pays de la loire'],
  ])('trouve par %s sans tenir compte de la casse', (_champ, recherche) => {
    expect(matchesSearch(makeEvent(), recherche)).toBe(true);
  });

  it('trouve par lieu, et ne plante pas quand le lieu est absent', () => {
    expect(matchesSearch(makeEvent({ venueName: 'Halle Tony Garnier' }), 'tony')).toBe(true);
    expect(matchesSearch(makeEvent({ venueName: undefined }), 'tony')).toBe(false);
  });

  it('ne plante pas quand un champ texte est vide', () => {
    expect(matchesSearch(makeEvent({ description: '', organizer: '' }), 'introuvable')).toBe(false);
  });
});

describe('isPastEvent', () => {
  it('considère passé un événement terminé avant aujourd\'hui', () => {
    expect(isPastEvent(makeEvent({ date: '2035-06-01' }), today)).toBe(true);
  });

  it('garde un événement du jour ou à venir', () => {
    expect(isPastEvent(makeEvent({ date: '2035-06-10' }), today)).toBe(false);
    expect(isPastEvent(makeEvent({ date: '2035-07-01' }), today)).toBe(false);
  });

  it('utilise la date de fin quand elle existe', () => {
    expect(isPastEvent(makeEvent({ date: '2035-06-01', endDate: '2035-06-15' }), today)).toBe(false);
  });
});

describe('matchesFilters', () => {
  it('masque les événements passés par défaut et les montre sur demande', () => {
    const passe = makeEvent({ date: '2035-06-01' });
    expect(matchesFilters(passe, defaultFilters, today)).toBe(false);
    expect(matchesFilters(passe, { ...defaultFilters, showPastEvents: true }, today)).toBe(true);
  });

  it('combine les filtres : tous doivent correspondre', () => {
    const event = makeEvent();
    expect(matchesFilters(event, { ...defaultFilters, regions: ['Pays de la Loire'], types: ['atelier'] }, today)).toBe(true);
    expect(matchesFilters(event, { ...defaultFilters, regions: ['Pays de la Loire'], types: ['autre'] }, today)).toBe(false);
  });

  it('refuse un événement sans format quand un format est demandé', () => {
    const sansFormat = makeEvent({ type: undefined as unknown as Event['type'] });
    expect(matchesFilters(sansFormat, { ...defaultFilters, types: ['atelier'] }, today)).toBe(false);
    expect(matchesFilters(sansFormat, defaultFilters, today)).toBe(true);
  });

  it('refuse un événement sans partenaire quand un partenaire est demandé', () => {
    expect(matchesFilters(makeEvent({ partners: undefined }), { ...defaultFilters, partners: ['p1'] }, today)).toBe(false);
    expect(matchesFilters(makeEvent({ partners: [{ id: 'p1', name: 'P1' }] }), { ...defaultFilters, partners: ['p1'] }, today)).toBe(true);
  });
});
