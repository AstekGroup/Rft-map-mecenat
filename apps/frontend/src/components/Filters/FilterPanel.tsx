import { RotateCcw } from 'lucide-react';
import type { EventFilterControls } from '@/hooks';
import { Button } from '@/components/UI';
import { FilterAccordion } from './FilterAccordion';
import { FilterContent, FilterSearch } from './FilterContent';
import { PastEventsToggle } from './PastEventsToggle';
import { countActiveFilters } from '@/utils/eventFilters';
import { getVisibleFiltersFor } from '@/utils/filterDefinitions';

interface FilterPanelProps {
  controls: EventFilterControls;
}

/** Panneau de filtres de la carte : un accordéon par filtre de `FILTER_DEFINITIONS`. */
export function FilterPanel({ controls }: FilterPanelProps) {
  const { filters, onUpdateFilters, onResetFilters } = controls;
  const hasActiveFilters = countActiveFilters(filters, controls.defaultShowPastEvents) > 0;
  const visibleFilters = getVisibleFiltersFor(controls, 'panel');

  return (
    <div className="flex flex-col h-full font-inter">
      {/* Recherche intégrée */}
      <div className="p-4 border-b border-primary/10">
        <FilterSearch filters={filters} onUpdateFilters={onUpdateFilters} variant="panel" />
      </div>

      {/* Filtres en accordéon */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {visibleFilters.map((definition) => {
          const Icon = definition.icon;
          const count = definition.activeCount(filters);
          return (
            <FilterAccordion
              key={definition.id}
              title={definition.title}
              icon={<Icon className="w-4 h-4" />}
              defaultOpen={count > 0}
              badge={count}
            >
              <FilterContent id={definition.id} variant="panel" controls={controls} />
            </FilterAccordion>
          );
        })}
      </div>

      {/* Toggle événements passés */}
      <div className="px-4 py-3 border-t border-primary/10">
        <PastEventsToggle
          checked={filters.showPastEvents}
          onChange={() => onUpdateFilters({ showPastEvents: !filters.showPastEvents })}
        />
      </div>

      {/* Bouton réinitialiser */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-primary/10 bg-white">
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="w-full text-accent-red border-accent-red hover:bg-accent-red/5"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}
