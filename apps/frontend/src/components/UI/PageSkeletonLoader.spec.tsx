import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageSkeletonLoader, type PageSkeletonVariant } from './PageSkeletonLoader';

const VARIANTS: PageSkeletonVariant[] = ['map', 'list', 'detail'];

describe('PageSkeletonLoader', () => {
  it.each(VARIANTS)('annonce le chargement aux lecteurs d’écran (variante %s)', (variant) => {
    render(<PageSkeletonLoader variant={variant} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Chargement de la page…');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('imite le layout de la page carte par défaut (recherche, sidebar, bouton mobile)', () => {
    const { container } = render(<PageSkeletonLoader />);
    const root = screen.getByRole('status');
    // Même positionnement que MapPage : plein écran relatif
    expect(root.className).toContain('relative');
    expect(root.className).toContain('overflow-hidden');
    // Rectangles décoratifs présents pour chaque section du layout
    const blocks = container.querySelectorAll('[aria-hidden="true"]');
    expect(blocks.length).toBeGreaterThan(10);
  });

  it('dessine une grille d’événements en variante liste', () => {
    const { container } = render(<PageSkeletonLoader variant="list" />);
    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    // Mêmes colonnes que EventListView (2 par défaut, 6 en 2xl)
    expect(grid?.className).toContain('grid-cols-2');
    expect(grid?.className).toContain('2xl:grid-cols-6');
  });
});
