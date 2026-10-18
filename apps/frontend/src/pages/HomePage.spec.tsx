import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfigContext, buildHelpers, type ConfigContextValue } from '@/hooks/useConfig';
import type { AppConfig } from '@/types/event';
import { HomePage } from './HomePage';

vi.mock('@/hooks', () => ({
  useEvents: () => ({ allEvents: [], loading: false }),
}));

function makeConfig(texts: Record<string, Record<string, string>> = {}): AppConfig {
  return {
    profile: 'test',
    app: {
      name: 'Événement de test',
      shortName: 'EDT',
      description: '',
      eventDates: { weekStart: '2027-03-01', weekEnd: '2027-03-07' },
    },
    texts,
  } as unknown as AppConfig;
}

function renderHome(value: Partial<ConfigContextValue>) {
  const config = value.config ?? null;
  return render(
    <ConfigContext.Provider
      value={{ config, loading: false, error: null, helpers: buildHelpers(config), ...value }}
    >
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </ConfigContext.Provider>,
  );
}

describe('HomePage : configuration indisponible ou incomplète', () => {
  it("affiche un état d'erreur (et non un chargement infini ou des clés brutes) si /api/config échoue", () => {
    renderHome({ config: null, error: new Error('Erreur API config: 500') });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La carte est momentanément indisponible',
    );
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('mainTitle');
  });

  it('affiche un chargement tant que la config se charge', () => {
    renderHome({ config: null, loading: true });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it("n'affiche jamais les noms de clés quand les textes manquent : repli sur le nom de l'événement", () => {
    renderHome({ config: makeConfig({}) });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Événement de test');
    const text = document.body.textContent ?? '';
    for (const key of [
      'mainTitle',
      'editionLabel',
      'mainDescription',
      'ctaText',
      'sectionPresentiel',
      'nearbySubtitle',
      'seeAll',
      'infoTitle',
      'infoDescription',
    ]) {
      expect(text).not.toContain(key);
    }
    // Libellés génériques de repli pour les boutons.
    expect(screen.getByRole('link', { name: /Voir la carte/ })).toBeTruthy();
  });

  it('utilise les textes de la config quand ils existent', () => {
    renderHome({
      config: makeConfig({
        home: { mainTitle: 'Titre configuré', editionLabel: 'Édition', ctaText: 'Explorer' },
      }),
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Titre configuré');
    expect(document.body.textContent).toContain('Édition 2027');
    expect(screen.getByRole('link', { name: /Explorer/ })).toBeTruthy();
  });
});
