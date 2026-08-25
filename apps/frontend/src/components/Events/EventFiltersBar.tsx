import { useState, useRef, useEffect } from 'react';
import { EventFilters, useConfig } from '@/hooks';
import { EventType, EventTheme, TargetAudience, Partner } from '@/types/event';
import { TYPE_ICONS } from '@/components/Map/EventMarker';
import { DateCustomRangeInputs } from '@/components/Filters/DateCustomRangeInputs';
import { formatFrDateRangeLabel, isDateFilterActive } from '@/utils/eventDateRange';
import { ChevronDown, RotateCcw, X, Search, MapPin, Globe, Handshake, History } from 'lucide-react';

interface EventFiltersBarProps {
  filters: EventFilters;
  onUpdateFilters: (filters: Partial<EventFilters>) => void;
  onToggleRegion: (region: string) => void;
  onToggleType: (type: string) => void;
  onToggleTheme: (theme: EventTheme) => void;
  onTogglePartner: (partnerId: string) => void;
  availablePartners: Partner[];
  onToggleAudience: (audience: string) => void;
  onResetFilters: () => void;
}

interface FilterDropdownProps {
  label: string;
  children: React.ReactNode;
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

export function EventFiltersBar({
  filters,
  onUpdateFilters,
  onToggleRegion,
  onToggleType,
  onToggleTheme,
  onTogglePartner,
  availablePartners,
  onToggleAudience,
  onResetFilters,
}: EventFiltersBarProps) {
  const { helpers } = useConfig();
  const EVENT_TYPES = (helpers.getEnumList('eventTypes') as { id: EventType }[]).map(e => e.id);
  const EVENT_THEMES = (helpers.getEnumList('eventThemes') as { id: string }[]).map(e => e.id) as EventTheme[];
  const AUDIENCES: TargetAudience[] = ['tout-public', 'familles-enfants', 'salaries-entreprise', 'professionnels', 'scolaires'];
  const { metropole: REGIONS_METRO, domtom: REGIONS_DOMTOM } = helpers.getRegionGroups();
  const hasActiveFilters =
    filters.search ||
    filters.postalCode ||
    filters.regions.length > 0 ||
    filters.types.length > 0 ||
    filters.themes.length > 0 ||
    filters.partners.length > 0 ||
    filters.audiences.length > 0 ||
    isDateFilterActive(filters.dateFilter, filters.dateFrom) ||
    filters.modality !== 'all';

  // Collecte des tags actifs
  const activeTags: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.showPastEvents) {
    activeTags.push({
      key: 'pastEvents',
      label: 'Événements passés',
      onRemove: () => onUpdateFilters({ showPastEvents: false }),
    });
  }

  if (filters.dateFilter === 'custom' && filters.dateFrom) {
    activeTags.push({
      key: 'date',
      label: formatFrDateRangeLabel(filters.dateFrom, filters.dateTo),
      onRemove: () =>
        onUpdateFilters({ dateFilter: 'all', dateFrom: '', dateTo: '' }),
    });
  } else if (
    filters.dateFilter === 'during-week' || 
    filters.dateFilter === 'weekend-sept' ||
    filters.dateFilter === 'weekend-oct'
  ) {
    const dateLabels: Record<string, string> = {
      'during-week': 'La Grande Semaine Végétale',
      'weekend-sept': 'Weekend du 26-27 septembre',
      'weekend-oct': 'Weekend du 4-5 octobre',
    };
    activeTags.push({
      key: 'date',
      label: dateLabels[filters.dateFilter],
      onRemove: () =>
        onUpdateFilters({ dateFilter: 'all', dateFrom: '', dateTo: '' }),
    });
  }

  filters.types.forEach((type) => {
    activeTags.push({
      key: `type-${type}`,
      label: helpers.getEnumLabel('eventTypes', type),
      onRemove: () => onToggleType(type),
    });
  });

  filters.themes.forEach((theme) => {
    activeTags.push({
      key: `theme-${theme}`,
      label: helpers.getEnumLabel('eventThemes', theme),
      onRemove: () => onToggleTheme(theme),
    });
  });

  filters.partners.forEach((partnerId) => {
    const partner = availablePartners.find(p => p.id === partnerId);
    activeTags.push({
      key: `partner-${partnerId}`,
      label: partner?.name || partnerId,
      onRemove: () => onTogglePartner(partnerId),
    });
  });

  if (filters.postalCode) {
    activeTags.push({
      key: 'postalCode',
      label: `CP: ${filters.postalCode}`,
      onRemove: () => onUpdateFilters({ postalCode: '' }),
    });
  }

  filters.audiences.forEach((audience) => {
    activeTags.push({
      key: `audience-${audience}`,
      label: helpers.getEnumLabel('targetAudiences', audience),
      onRemove: () => onToggleAudience(audience),
    });
  });

  filters.regions.forEach((region) => {
    activeTags.push({
      key: `region-${region}`,
      label: region,
      onRemove: () => onToggleRegion(region),
    });
  });

  return (
    <div className="flex flex-col gap-3 p-4 bg-surface-beige border-b border-primary/10">
      {/* Top row: Search and Modality Switcher */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onUpdateFilters({ search: e.target.value })}
            placeholder="Rechercher par titre, description, ville..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-primary/20 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-inter"
          />
          {filters.search && (
            <button
              onClick={() => onUpdateFilters({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modality Switcher */}
        <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-primary/10 self-start">
          {[
            { value: 'all', label: 'Tous', icon: null },
            { value: 'presentiel', label: 'Présentiel', icon: MapPin },
            { value: 'distanciel', label: 'En ligne', icon: Globe },
          ].map((option) => {
            const Icon = option.icon;
            const isActive = filters.modality === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onUpdateFilters({ modality: option.value as any })}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-primary hover:bg-white/50'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {option.label}
              </button>
            );
          })}
        </div>
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
        
        {/* Date filter */}
        <FilterDropdown
          label="Date"
          badge={isDateFilterActive(filters.dateFilter, filters.dateFrom) ? 1 : undefined}
        >
          <div className="p-2 space-y-1">
            {[
              { value: 'all', label: 'Toutes les dates' },
              { value: 'during-week', label: 'La Grande Semaine Végétale' },
              { value: 'weekend-sept', label: 'Weekend du 26-27 septembre' },
              { value: 'weekend-oct', label: 'Weekend du 4-5 octobre' },
              { value: 'custom', label: 'Plage au calendrier' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  onUpdateFilters({ dateFilter: option.value as EventFilters['dateFilter'] })
                }
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  filters.dateFilter === option.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-secondary hover:bg-primary/5'
                }`}
              >
                {option.label}
              </button>
            ))}
            {filters.dateFilter === 'custom' && (
              <DateCustomRangeInputs filters={filters} onUpdateFilters={onUpdateFilters} compact />
            )}
          </div>
        </FilterDropdown>

        {/* Partner filter */}
        {availablePartners.length > 0 && (
          <FilterDropdown
            label="Partenaires"
            badge={filters.partners.length || undefined}
          >
            <div className="flex items-center gap-2 px-3 py-1 mb-1 border-b border-primary/5 text-xs font-semibold text-text-secondary uppercase tracking-wider bg-surface-light/30">
              <Handshake className="w-3.5 h-3.5" />
              <span>Nos partenaires</span>
            </div>
            <div className="p-2 space-y-1 min-w-[200px]">
              {availablePartners.map((partner) => (
                <label
                  key={partner.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-primary/5 transition-colors"
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
                      className="w-5 h-5 object-contain rounded-sm shadow-sm bg-white" 
                    />
                  )}
                  <span className={filters.partners.includes(partner.id) ? 'text-primary font-medium' : 'text-text-secondary'}>
                    {partner.name}
                  </span>
                </label>
              ))}
            </div>
          </FilterDropdown>
        )}
        
        {/* Type filter with icons */}
        <FilterDropdown
          label="Type d'événement"
          badge={filters.types.length || undefined}
        >
          <div className="p-2 space-y-1">
            {EVENT_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type] || Globe;
              const color = helpers.getEnumColor(type);
              return (
                <label
                  key={type}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-primary/5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={() => onToggleType(type)}
                    className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                  />
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </span>
                  <span className={filters.types.includes(type) ? 'text-primary font-medium' : 'text-text-secondary'}>
                    {helpers.getEnumLabel('eventTypes', type)}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterDropdown>

        {/* Thématiques filter */}
        <FilterDropdown
          label="Thématiques"
          badge={filters.themes.length || undefined}
        >
          <div className="p-2 space-y-1 min-w-[250px]">
            {EVENT_THEMES.map((theme) => (
              <label
                key={theme}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.themes.includes(theme)}
                  onChange={() => onToggleTheme(theme)}
                  className="w-4 h-4 text-accent-pink border-primary/30 rounded focus:ring-accent-pink"
                />
                <span className={filters.themes.includes(theme) ? 'text-primary font-medium' : 'text-text-secondary'}>
                  {helpers.getEnumLabel('eventThemes', theme)}
                </span>
              </label>
            ))}
          </div>
        </FilterDropdown>
        
        {/* Audience filter */}
        <FilterDropdown
          label="Public cible"
          badge={filters.audiences.length || undefined}
        >
          <div className="p-2 space-y-1">
            {AUDIENCES.map((audience) => (
              <label
                key={audience}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.audiences.includes(audience)}
                  onChange={() => onToggleAudience(audience)}
                  className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                />
                <span className={filters.audiences.includes(audience) ? 'text-primary font-medium' : 'text-text-secondary'}>
                  {helpers.getEnumLabel('targetAudiences', audience)}
                </span>
              </label>
            ))}
          </div>
        </FilterDropdown>

        {/* Postal code filter */}
        {filters.modality !== 'distanciel' && (
          <div className="relative">
            <input
              type="text"
              value={filters.postalCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                onUpdateFilters({ postalCode: value });
              }}
              placeholder="Code postal"
              className={`w-32 px-3 py-2 rounded-lg text-sm border transition-colors ${
                filters.postalCode
                  ? 'bg-primary text-white border-primary placeholder:text-white/70'
                  : 'bg-white text-primary border-primary/20 placeholder:text-text-secondary'
              }`}
            />
            {filters.postalCode && (
              <button
                onClick={() => onUpdateFilters({ postalCode: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        
        {/* Region filter */}
        {filters.modality !== 'distanciel' && (
          <FilterDropdown
            label="Région"
            badge={filters.regions.length || undefined}
          >
            <div className="p-2 space-y-1 max-h-[250px] overflow-y-auto scrollbar-thin">
              {REGIONS_METRO.map((region) => (
                <label
                  key={region}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-primary/5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.regions.includes(region)}
                    onChange={() => onToggleRegion(region)}
                    className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                  />
                  <span className={filters.regions.includes(region) ? 'text-primary font-medium' : 'text-text-secondary'}>
                    {region}
                  </span>
                </label>
              ))}
              <div className="border-t border-primary/10 mt-2 pt-2">
                <p className="px-3 py-1 text-xs text-text-secondary font-medium uppercase">Outre-mer</p>
                {REGIONS_DOMTOM.map((region) => (
                  <label
                    key={region}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.regions.includes(region)}
                      onChange={() => onToggleRegion(region)}
                      className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                    />
                    <span className={filters.regions.includes(region) ? 'text-primary font-medium' : 'text-text-secondary'}>
                      {region}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </FilterDropdown>
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
      {activeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 font-inter">
          {activeTags.map((tag) => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {tag.label}
              <button
                onClick={tag.onRemove}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                aria-label={`Retirer le filtre ${tag.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={onResetFilters}
            className="text-xs text-accent-red hover:underline font-medium"
          >
            Tout effacer
          </button>
        </div>
      )}
    </div>
  );
}
