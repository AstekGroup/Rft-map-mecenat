import {LinkedTableRow} from '@/types/event';

interface BadgeProps {
  type: LinkedTableRow;
  size?: 'sm' | 'md';
  variant?: 'default' | 'highlight';
}

export function Badge({ type, size = 'md', variant = 'default' }: BadgeProps) {
  const color = type?.colorHexa;
  const label = type?.name;

  // Pas de nom (format absent) : aucun badge, plutôt qu'une pastille vide.
  if (!label) return null;

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  // Style highlight : couleur primaire foncée du thème sur fond de surface du thème
  if (variant === 'highlight') {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold bg-surface-beige text-primary-dark ${sizes[size]}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizes[size]}`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
