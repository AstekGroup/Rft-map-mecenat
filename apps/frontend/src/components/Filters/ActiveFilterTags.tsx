import { X } from 'lucide-react';
import { useConfig } from '@/hooks';
import type { EventFilterControls } from '@/hooks';
import { getActiveFilterTags } from '@/utils/activeFilterTags';

interface ActiveFilterTagsProps {
  controls: EventFilterControls;
  /** Affiche « Tout effacer » quand au moins une pastille est présente. */
  showClearAll?: boolean;
  className?: string;
}

/** Synthèse des filtres actifs sous forme de pastilles supprimables. */
export function ActiveFilterTags({ controls, showClearAll = true, className = '' }: ActiveFilterTagsProps) {
  const { helpers } = useConfig();
  const tags = getActiveFilterTags(controls, helpers);

  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 font-inter ${className}`.trim()}>
      {tags.map((tag) => (
        <span
          key={tag.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
        >
          {tag.label}
          <button
            type="button"
            onClick={tag.onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            aria-label={`Retirer le filtre ${tag.label}`}
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {showClearAll && (
        <button
          type="button"
          onClick={controls.onResetFilters}
          className="text-xs text-black hover:underline font-bold"
        >
          Tout effacer
        </button>
      )}
    </div>
  );
}
