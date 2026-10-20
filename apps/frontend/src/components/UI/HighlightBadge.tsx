import { Heart } from 'lucide-react';
import { HIGHLIGHT_LABEL } from '@/utils/highlight';

interface HighlightBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  /** Affiche le libellé « Coup de cœur » à côté de l'icône. */
  withLabel?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<HighlightBadgeProps['size']>, { badge: string; icon: string }> = {
  xs: { badge: 'px-1.5 py-0.5 text-[10px] gap-1', icon: 'w-3 h-3' },
  sm: { badge: 'px-2 py-0.5 text-xs gap-1', icon: 'w-3.5 h-3.5' },
  md: { badge: 'px-3 py-1.5 text-sm gap-1.5', icon: 'w-4 h-4' },
};

/**
 * Badge mettant en valeur les « coups de cœur » (colonne case à cocher de Baserow, rôle
 * `fieldMapping.highlight`). Couleur : le jeton `accent-yellow` du thème de la carte, jamais une
 * teinte en dur.
 */
export function HighlightBadge({ size = 'sm', withLabel = false, className = '' }: HighlightBadgeProps) {
  const s = SIZES[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold bg-accent-yellow text-text-primary ring-1 ring-accent-yellow/60 shadow-sm ${s.badge} ${className}`}
      title={HIGHLIGHT_LABEL}
      {...(withLabel ? {} : { role: 'img', 'aria-label': HIGHLIGHT_LABEL })}
    >
      <Heart className={`${s.icon} shrink-0 fill-current`} aria-hidden="true" />
      {withLabel && <span>{HIGHLIGHT_LABEL}</span>}
    </span>
  );
}
