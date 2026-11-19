import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Event } from '@/types/event';
import { AddToCalendar } from './AddToCalendar';

const baseEvent: Event = {
  id: 'evt-1',
  title: 'Atelier jardin partagé',
  description: 'Découverte des plantations.',
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

// jsdom n'implémente pas les URL d'objets : on les remplace pendant les tests.
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:ics-test');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
});

const NOM_BOUTON = 'Ajouter à mon calendrier';

/** Ouvre le menu et le renvoie, pour alléger les tests d'action. */
async function openMenu() {
  render(<AddToCalendar event={baseEvent} />);
  const bouton = screen.getByRole('button', { name: NOM_BOUTON });
  await userEvent.click(bouton);
  return bouton;
}

describe('AddToCalendar', () => {
  it('affiche le bouton refermé et ouvre au clic un menu à trois entrées', async () => {
    render(<AddToCalendar event={baseEvent} />);

    const bouton = screen.getByRole('button', { name: NOM_BOUTON });
    expect(bouton).toHaveAttribute('aria-haspopup', 'menu');
    expect(bouton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();

    await userEvent.click(bouton);

    const menu = screen.getByRole('menu', { name: NOM_BOUTON });
    expect(bouton).toHaveAttribute('aria-expanded', 'true');
    // Le bouton pilote bien le menu (aria-controls ↔ id).
    expect(bouton.getAttribute('aria-controls')).toBe(menu.id);
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByRole('menuitem', { name: 'Google Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Outlook' })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /Télécharger le fichier \.ics/ }),
    ).toBeInTheDocument();
  });

  it('ouvre Google Calendar dans un nouvel onglet sécurisé puis referme le menu', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const bouton = await openMenu();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Google Calendar' }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, cible, options] = openSpy.mock.calls[0];
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Atelier+jardin+partag');
    expect(cible).toBe('_blank');
    expect(options).toBe('noopener,noreferrer');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(bouton).toHaveFocus();
  });

  it('ouvre Outlook de la même façon', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    await openMenu();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Outlook' }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, , options] = openSpy.mock.calls[0];
    expect(url).toContain('https://outlook.live.com/calendar/0/action/compose?');
    expect(url).toContain('rru=addevent');
    expect(url).toContain('subject=Atelier+jardin+partag');
    expect(options).toBe('noopener,noreferrer');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('télécharge le fichier .ics (blob créé puis révoqué) et referme le menu', async () => {
    // Le clic sur l'ancre de téléchargement n'a pas de sens sous jsdom : on l'intercepte.
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const bouton = await openMenu();

    await userEvent.click(screen.getByRole('menuitem', { name: /Télécharger le fichier \.ics/ }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ics-test');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(bouton).toHaveFocus();
  });

  it('referme au clavier avec Échap et rend le focus au bouton', async () => {
    const bouton = await openMenu();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
    expect(bouton).toHaveAttribute('aria-expanded', 'false');
    expect(bouton).toHaveFocus();
  });

  it('referme au clic à l’extérieur du composant', async () => {
    render(
      <>
        <button type="button">Dehors</button>
        <AddToCalendar event={baseEvent} />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: NOM_BOUTON }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dehors' }));

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('ne s’affiche pas si la date de l’événement est illisible', () => {
    render(<AddToCalendar event={{ ...baseEvent, date: 'bientôt' }} />);

    expect(screen.queryByRole('button', { name: NOM_BOUTON })).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
