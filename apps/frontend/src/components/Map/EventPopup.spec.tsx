import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Event } from '@/types/event';
import { EventPopup } from './EventPopup';

const baseEvent: Event = {
  id: 'evt-1',
  title: 'Atelier découverte',
  description: 'Une description de test.',
  date: '2026-11-20',
  time: '14:00',
  address: '1 rue de la Paix',
  city: 'Paris',
  region: 'Île-de-France',
  department: 'Paris',
  postalCode: '75001',
  latitude: 48.8566,
  longitude: 2.3522,
  type: { id: 'atelier', name: 'Atelier', colorHexa: '#336699' },
  themes: [],
  organizer: 'Association Test',
  isDuringWeek: false,
  isHighlighted: false,
  modality: 'presentiel',
  targetAudience: [],
  isFree: true,
};

function renderPopup(overrides: Partial<Event> = {}) {
  const event = { ...baseEvent, ...overrides };
  const onViewDetails = vi.fn();
  render(<EventPopup event={event} onClose={vi.fn()} onViewDetails={onViewDetails} />);
  return { event, onViewDetails };
}

describe('EventPopup : contact et inscription', () => {
  it("affiche le contact dans la ligne de l'organisateur, pas dans les actions", () => {
    renderPopup({ contactEmail: 'contact@exemple.fr' });

    const organizerRow = screen.getByText('Association Test').parentElement;
    expect(organizerRow).not.toBeNull();
    const contactLink = within(organizerRow as HTMLElement).getByRole('link', {
      name: "Contacter l'organisateur par e-mail",
    });
    expect(contactLink).toHaveAttribute('href', 'mailto:contact@exemple.fr');
    expect(contactLink.textContent).toBe('');

    const actionsRow = screen.getByRole('button', { name: 'Détails' }).parentElement;
    expect(
      within(actionsRow as HTMLElement).queryByRole('link', { name: /Contacter/ }),
    ).toBeNull();
  });

  it("utilise le lien d'inscription de la page de détails et ouvre un nouvel onglet", () => {
    renderPopup({
      registrationUrl: 'https://exemple.fr/inscription',
      contactPhone: '+33 6 12 34 56 78',
      contactEmail: 'contact@exemple.fr',
    });

    const registrationLink = screen.getByRole('link', { name: "S'inscrire" });
    expect(registrationLink).toHaveAttribute('href', 'https://exemple.fr/inscription');
    expect(registrationLink).toHaveAttribute('target', '_blank');
    expect(registrationLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('button', { name: 'Détails' })).toBeInTheDocument();
  });

  it("n'affiche pas S'inscrire quand seul le téléphone est renseigné", () => {
    renderPopup({ contactPhone: '+33 6 12 34 56 78' });

    expect(screen.queryByRole('link', { name: "S'inscrire" })).toBeNull();
  });

  it("n'affiche pas S'inscrire quand seul l'e-mail est renseigné", () => {
    renderPopup({ contactEmail: 'contact@exemple.fr' });

    expect(screen.queryByRole('link', { name: "S'inscrire" })).toBeNull();
  });

  it("n'affiche pas S'inscrire quand aucun moyen n'est renseigné", () => {
    renderPopup();

    expect(screen.queryByRole('link', { name: "S'inscrire" })).toBeNull();
    expect(screen.getByRole('button', { name: 'Détails' })).toBeInTheDocument();
  });

  it("n'utilise pas organizerContact comme adresse e-mail", () => {
    renderPopup({ organizerContact: 'Jean Dupont' });

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('appelle onViewDetails au clic sur Détails', () => {
    const { event, onViewDetails } = renderPopup();

    fireEvent.click(screen.getByRole('button', { name: 'Détails' }));

    expect(onViewDetails).toHaveBeenCalledWith(event.id);
  });
});
