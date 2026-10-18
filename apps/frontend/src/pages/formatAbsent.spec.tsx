import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConfigContext, buildHelpers } from '@/hooks/useConfig';
import type { AppConfig, Event } from '@/types/event';
import { Badge } from '@/components/UI/Badge';
import { EventDetailPage } from './EventDetailPage';

/** Cas dégradé : événement sans format (pas de section ni de badge vide). */

const baseEvent: Event = {
  id: 'e1',
  title: 'Atelier de test',
  description: 'Description',
  date: '2027-03-02',
  time: '10:00',
  address: '1 rue du Test',
  city: 'Testville',
  region: 'Région',
  department: '00',
  postalCode: '00000',
  latitude: 48,
  longitude: 2,
  type: { id: 'f1', name: 'Atelier' },
  themes: [],
  organizer: 'Structure',
  isDuringWeek: false,
  modality: 'presentiel',
  targetAudience: [],
  isFree: true,
};

const mockEvents = vi.hoisted(() => ({ events: [] as unknown[] }));

vi.mock('@/hooks', () => ({
  useEvents: () => ({ allEvents: mockEvents.events, loading: false, error: null }),
}));

const config = {
  profile: 'test',
  app: {
    name: 'Événement de test',
    shortName: 'EDT',
    description: '',
    eventDates: { weekStart: '2027-03-01', weekEnd: '2027-03-07' },
  },
  texts: {},
} as unknown as AppConfig;

function renderDetail(event: Event) {
  mockEvents.events = [event];
  return render(
    <ConfigContext.Provider
      value={{ config, loading: false, error: null, helpers: buildHelpers(config) }}
    >
      <MemoryRouter initialEntries={[`/evenement/${event.id}`]}>
        <Routes>
          <Route path="/evenement/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ConfigContext.Provider>,
  );
}

describe('EventDetailPage : événement sans format', () => {
  it("affiche la section « Format » quand l'événement a un format", () => {
    renderDetail(baseEvent);

    expect(screen.getByRole('heading', { name: 'Format' })).toBeTruthy();
    // Le nom du format apparaît dans le badge d'en-tête et dans la section.
    expect(screen.getAllByText('Atelier')).toHaveLength(2);
  });

  it.each([
    { cas: 'format absent', type: undefined },
    { cas: 'format sans nom', type: { id: 'f1', name: '' } },
  ])('masque la section « Format » et le badge de format ($cas)', ({ type }) => {
    renderDetail({ ...baseEvent, type: type as unknown as Event['type'] });

    expect(screen.getByRole('heading', { level: 1, name: baseEvent.title })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Format' })).toBeNull();
    // Public cible reste affiché : seule la section Format disparaît.
    expect(screen.getByRole('heading', { name: 'Public cible' })).toBeTruthy();
  });
});

describe('Badge : format sans nom', () => {
  it("n'affiche aucune pastille vide", () => {
    const { container } = render(<Badge type={{ id: 'f1', name: '' }} variant="highlight" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("n'échoue pas quand le format est absent", () => {
    const { container } = render(<Badge type={undefined as never} />);
    expect(container).toBeEmptyDOMElement();
  });
});
