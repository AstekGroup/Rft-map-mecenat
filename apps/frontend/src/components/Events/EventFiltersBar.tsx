import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { EventFilterControls } from '@/hooks';
import { FilterContent, FilterSearch } from '@/components/Filters/FilterContent';
import { ActiveFilterTags } from '@/components/Filters/ActiveFilterTags';
import { countActiveFilters } from '@/utils/eventFilters';
import { getVisibleFiltersFor } from '@/utils/filterDefinitions';
import { ChevronDown, RotateCcw, History } from 'lucide-react';

interface EventFiltersBarProps {
  controls: EventFilterControls;
}

interface FilterDropdownProps {
  label: string;
  children: ReactNode;
  badge?: number;
}

function FilterDropdown({ label, children, badge }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          badge ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary/5'
        }`}
      >
        {label}
        {badge ? (
          <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        ) : null}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-popup z-50 min-w-[220px] max-h-[min(90vh,520px)] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

/** Barre de filtres de la liste : un menu par filtre de `FILTER_DEFINITIONS` (modalité et code postal en ligne). */
export function EventFiltersBar({ controls }: EventFiltersBarProps) {
  const {
    filters,
    defaultShowPastEvents,
    onUpdateFilters,
    onResetFilters,
  } = controls;
  const visibleFilters = getVisibleFiltersFor(controls, 'list');
  const hasActiveFilters = countActiveFilters(filters, defaultShowPastEvents) > 0;

  return (
    <div className="flex flex-col gap-3 p-4 bg-surface-beige border-b border-primary/10">
      {/* Top row: Search and Modality Switcher */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <FilterSearch filters={filters} onUpdateFilters={onUpdateFilters} variant="bar" />
        </div>
        {visibleFilters.some((definition) => definition.id === 'modality') && (
          <FilterContent id="modality" variant="bar" controls={controls} />
        )}
      </div>

      {/* Bottom row: Other filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
        )}

        {visibleFilters
          .filter((definition) => definition.id !== 'modality')
          .map((definition) =>
            definition.id === 'postalCode' || definition.presentation === 'toggle' ? (
              <FilterContent key={definition.id} id={definition.id} variant="bar" controls={controls} />
            ) : (
              <FilterDropdown
                key={definition.id}
                label={definition.title}
                badge={definition.activeCount(filters) || undefined}
              >
                <FilterContent id={definition.id} variant="bar" controls={controls} />
              </FilterDropdown>
            ),
          )}

        {/* Toggle événements passés */}
        <button
          onClick={() => onUpdateFilters({ showPastEvents: !filters.showPastEvents })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            filters.showPastEvents
              ? 'bg-primary text-white'
              : 'bg-white text-primary hover:bg-primary/5'
          }`}
        >
          <History className="w-4 h-4" />
          Événements passés
        </button>
      </div>

      {/* Active filter tags */}
      <ActiveFilterTags controls={controls} />
    </div>
  );
}
