import {LinkedTableRow} from '@/types/event';

interface BadgeProps {
  type: LinkedTableRow;
  size?: 'sm' | 'md';
  variant?: 'default' | 'highlight';
}

export function Badge({ type, size = 'md', variant = 'default' }: BadgeProps) {
  const color = type?.colorHexa;
  const label = type?.name;

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  // Style highlight : Vert foncé sur fond beige
  if (variant === 'highlight') {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold ${sizes[size]}`}
        style={{
          backgroundColor: '#F2EDE4',
          color: '#1F7A3E',
        }}
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
