import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventsGeoJSON } from '@/types/event';
import { DOMTOMInset } from './DOMTOMInset';

// MapLibre n'existe pas sous jsdom : chaque mini-carte est remplacée par un repère testable.
vi.mock('react-map-gl/maplibre', () => ({
  default: () => <div data-testid="mini-carte" />,
  Marker: () => null,
}));
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
vi.mock('@/hooks', () => ({
  useClusters: () => ({ clusters: [] }),
}));

const geojson: EventsGeoJSON = { type: 'FeatureCollection', features: [] };

function renderInset() {
  return render(<DOMTOMInset geojson={geojson} mapStyleUrl="https://exemple.test/style.json" />);
}

describe('DOMTOMInset', () => {
  it('est replié par défaut : un bouton « Outre-mer » et aucune mini-carte montée', () => {
    renderInset();

    const bouton = screen.getByRole('button', { name: /Outre-mer/ });
    expect(bouton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('mini-carte')).toBeNull();
    expect(screen.queryByText('Accès rapide')).toBeNull();
  });

  it('se déplie au clic : 6 mini-cartes et un bouton de repli', async () => {
    renderInset();

    await userEvent.click(screen.getByRole('button', { name: /Outre-mer/ }));

    expect(screen.getAllByTestId('mini-carte')).toHaveLength(6);
    expect(screen.getByText('Accès rapide')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Replier l'accès rapide" })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('se replie via le bouton de repli et démonte les mini-cartes', async () => {
    renderInset();
    await userEvent.click(screen.getByRole('button', { name: /Outre-mer/ }));

    await userEvent.click(screen.getByRole('button', { name: "Replier l'accès rapide" }));

    expect(screen.queryByTestId('mini-carte')).toBeNull();
    expect(screen.getByRole('button', { name: /Outre-mer/ })).toHaveAttribute('aria-expanded', 'false');
  });
});
