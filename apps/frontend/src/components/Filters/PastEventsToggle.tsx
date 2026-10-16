import { History } from 'lucide-react';

interface PastEventsToggleProps {
  checked: boolean;
  onChange: () => void;
}

export function PastEventsToggle({ checked, onChange }: PastEventsToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-label="Afficher les événements passés"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-primary' : 'bg-primary/20'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-text-secondary" />
        <span className="text-sm text-text-secondary">
          Afficher les événements passés
        </span>
      </div>
    </div>
  );
}