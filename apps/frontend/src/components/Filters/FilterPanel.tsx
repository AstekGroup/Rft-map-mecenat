import { EventFilters } from '@/hooks';
import {
  
  EventType, 
 
  TargetAudience,
  EVENT_TYPE_LABELS, 
 
  EVENT_TYPE_COLORS, 
  EventTheme, 
  EVENT_THEME_LABELS, 
 
  TARGET_AUDIENCE_LABELS,
  REGIONS,
  EVENT_TYPES_ALL,
  Partner,

} from '@/types/event';
import { Calendar, MapPin, Tag, RotateCcw, Search, X, Hash, BookOpen, Handshake, Users, History } from 'lucide-react';
import { Button } from '@/components/UI';
import { FilterAccordion } from './FilterAccordion';
import { TYPE_ICONS } from '@/components/Map/EventMarker';
import { DateCustomRangeInputs } from '@/components/Filters/DateCustomRangeInputs';
import { isDateFilterActive } from '@/utils/eventDateRange';

interface FilterPanelProps {
  filters: EventFilters;
  onUpdateFilters: (filters: Partial<EventFilters>) => void;
  onToggleRegion: (region: string) => void;
  onToggleType: (type: string) => void;
  onToggleTheme: (theme: EventTheme) => void;
  onTogglePartner: (partnerId: string) => void;
  availablePartners: Partner[];
  onToggleAudience: (audience: string) => void;
  onResetFilters: () => void;
  stats: {
    total: number;
    filtered: number;
    duringWeek: number;
  };
}

const EVENT_TYPES: EventType[] = EVENT_TYPES_ALL;
const AUDIENCES: TargetAudience[] = ['tout-public', 'jeunes', 'seniors', 'familles', 'scolaire', 'professionnels'];

const EVENT_THEMES = Object.keys(EVENT_THEME_LABELS) as EventTheme[];

export function FilterPanel({
  filters,
  onUpdateFilters,
  onToggleRegion,
  onToggleType,
  onToggleTheme,
  onTogglePartner,
  availablePartners,
  onToggleAudience,
  onResetFilters,
}: FilterPanelProps) {
  const hasActiveFilters =
    filters.search ||
    filters.postalCode ||
    filters.regions.length > 0 ||
    filters.types.length > 0 ||
    filters.themes.length > 0 ||
    filters.partners.length > 0 ||
    filters.audiences.length > 0 ||
    isDateFilterActive(filters.dateFilter, filters.dateFrom);

  return (
    <div className="flex flex-col h-full font-inter">
      {/* Recherche intégrée */}
      <div className="p-4 border-b border-primary/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onUpdateFilters({ search: e.target.value })}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-primary/20 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onUpdateFilters({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filtres en accordéon */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Filtre par date */}
        <FilterAccordion
          title="Période"
          icon={<Calendar className="w-4 h-4" />}
          defaultOpen={isDateFilterActive(filters.dateFilter, filters.dateFrom)}
        >
          <div className="space-y-2">
            {[
              { value: 'all', label: 'Toutes les dates' },
              { value: 'during-week', label: 'La Grande Semaine Végétale' },
              { value: 'other', label: 'Autres dates' },
              { value: 'custom', label: 'Plage au calendrier' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="dateFilter"
                  value={option.value}
                  checked={filters.dateFilter === option.value}
                  onChange={() =>
                    onUpdateFilters({ dateFilter: option.value as EventFilters['dateFilter'] })
                  }
                  className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
            {filters.dateFilter === 'custom' && (
              <DateCustomRangeInputs filters={filters} onUpdateFilters={onUpdateFilters} />
            )}
          </div>
        </FilterAccordion>

        {/* Filtre par partenaire */}
        {availablePartners.length > 0 && (
          <FilterAccordion
            title="Partenaires"
            icon={<Handshake className="w-4 h-4" />}
            defaultOpen={filters.partners.length > 0}
            badge={filters.partners.length}
          >
            <div className="space-y-2">
              {availablePartners.map((partner) => (
                <label
                  key={partner.id}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.partners.includes(partner.id)}
                    onChange={() => onTogglePartner(partner.id)}
                    className="w-4 h-4 text-accent-pink border-primary/30 rounded focus:ring-accent-pink"
                  />
                  {partner.logoUrl && (
                    <img 
                      src={partner.logoUrl} 
                      alt={partner.name} 
                      className="w-6 h-6 object-contain rounded-sm shadow-sm bg-white" 
                    />
                  )}
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    {partner.name}
                  </span>
                </label>
              ))}
            </div>
          </FilterAccordion>
        )}

        {/* Filtre par type avec pictos */}
        <FilterAccordion
          title="Type d'événement"
          icon={<Tag className="w-4 h-4" />}
          defaultOpen={filters.types.length > 0}
          badge={filters.types.length}
        >
          <div className="space-y-2">
            {EVENT_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type] || Globe;
              const color = EVENT_TYPE_COLORS[type];
              return (
                <label
                  key={type}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={() => onToggleType(type)}
                    className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                  />
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    {EVENT_TYPE_LABELS[type]}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* Filtre par thématique */}
        <FilterAccordion
          title="Thématiques"
          icon={<BookOpen className="w-4 h-4" />}
          defaultOpen={filters.themes.length > 0}
          badge={filters.themes.length}
        >
          <div className="space-y-2">
            {EVENT_THEMES.map((theme) => (
              <label
                key={theme}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.themes.includes(theme)}
                  onChange={() => onToggleTheme(theme)}
                  className="w-4 h-4 text-accent-pink border-primary/30 rounded focus:ring-accent-pink"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {EVENT_THEME_LABELS[theme]}
                </span>
              </label>
            ))}
          </div>
        </FilterAccordion>

        {/* Filtre par public cible */}
        <FilterAccordion
          title="Public cible"
          icon={<Users className="w-4 h-4" />}
          defaultOpen={filters.audiences.length > 0}
          badge={filters.audiences.length}
        >
          <div className="space-y-2">
            {AUDIENCES.map((audience) => (
              <label
                key={audience}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.audiences.includes(audience)}
                  onChange={() => onToggleAudience(audience)}
                  className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {TARGET_AUDIENCE_LABELS[audience]}
                </span>
              </label>
            ))}
          </div>
        </FilterAccordion>

        {/* Filtre par code postal */}
        <FilterAccordion
          title="Code postal"
          icon={<Hash className="w-4 h-4" />}
          defaultOpen={!!filters.postalCode}
        >
          <div className="relative">
            <input
              type="text"
              value={filters.postalCode}
              onChange={(e) => {
                // Permettre uniquement les chiffres
                const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                onUpdateFilters({ postalCode: value });
              }}
              placeholder="Ex: 75, 75001..."
              maxLength={5}
              className="w-full px-3 py-2 bg-white border border-primary/20 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {filters.postalCode && (
              <button
                onClick={() => onUpdateFilters({ postalCode: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                aria-label="Effacer le code postal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Entrez un code postal ou son début (ex: 75 pour Paris)
          </p>
        </FilterAccordion>

        {/* Filtre par région */}
        <FilterAccordion
          title="Région"
          icon={<MapPin className="w-4 h-4" />}
          defaultOpen={filters.regions.length > 0}
          badge={filters.regions.length}
        >
          <div className="space-y-2">
            {/* Métropole */}
            <div className="space-y-2">
              {REGIONS.filter(r => !['Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte'].includes(r)).map((region) => (
                <label
                  key={region}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.regions.includes(region)}
                    onChange={() => onToggleRegion(region)}
                    className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    {region}
                  </span>
                </label>
              ))}
            </div>
            
            {/* DOM-TOM */}
            <div className="pt-3 mt-3 border-t border-primary/10">
              <p className="text-xs text-text-secondary mb-2 font-medium uppercase tracking-wide">Outre-mer</p>
              <div className="space-y-2">
                {REGIONS.filter(r => ['Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte'].includes(r)).map((region) => (
                  <label
                    key={region}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.regions.includes(region)}
                      onChange={() => onToggleRegion(region)}
                      className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                      {region}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FilterAccordion>
      </div>

      {/* Toggle événements passés */}
      <div className="px-4 py-3 border-t border-primary/10">
        <label className="flex items-center gap-3 cursor-pointer group">
          <button
            role="switch"
            aria-checked={filters.showPastEvents}
            onClick={() => onUpdateFilters({ showPastEvents: !filters.showPastEvents })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
              filters.showPastEvents ? 'bg-primary' : 'bg-primary/20'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                filters.showPastEvents ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
              Afficher les événements passés
            </span>
          </div>
        </label>
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
