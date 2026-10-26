import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HighlightBadge } from '@/components/UI';
import { EventMarker } from './EventMarker';

const type = { id: 'atelier', name: 'Atelier', pictoName: 'Utensils', colorHexa: '#336699' };

describe('EventMarker : coup de cœur', () => {
  it('ne montre ni pastille ni libellé spécial pour un événement ordinaire', () => {
    render(<EventMarker type={type} onClick={vi.fn()} />);

    expect(screen.queryByTestId('highlight-marker-pin')).toBeNull();
    expect(screen.getByRole('button', { name: "Voir les détails de l'événement" })).toBeInTheDocument();
  });

  it('montre la pastille et l’annonce dans le libellé d’accessibilité pour un coup de cœur', () => {
    render(<EventMarker type={type} isHighlighted onClick={vi.fn()} />);

    expect(screen.getByTestId('highlight-marker-pin')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: "Voir les détails de l'événement (Coup de cœur)" }),
    ).toBeInTheDocument();
  });
});

describe('HighlightBadge', () => {
  it('affiche le libellé générique « Coup de cœur » avec withLabel', () => {
    render(<HighlightBadge withLabel />);
    expect(screen.getByText('Coup de cœur')).toBeInTheDocument();
  });

  it('reste lisible par les lecteurs d’écran sans libellé visible', () => {
    render(<HighlightBadge size="xs" />);
    expect(screen.getByRole('img', { name: 'Coup de cœur' })).toBeInTheDocument();
  });
});
