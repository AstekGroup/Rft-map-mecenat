import type { ReactNode } from 'react';
import { Globe, Heart, MapPin, Search, X } from 'lucide-react';
import { useConfig } from '@/hooks';
import type { EventFilterControls, EventFilters } from '@/hooks';
import type { LinkedTableRow } from '@/types/event';
import type { FilterId } from '@/utils/filterDefinitions';
import { HIGHLIGHT_LABEL } from '@/utils/highlight';
import { DEFAULT_FORMAT_COLOR, checkIconColor, getIcon } from '@/utils/iconResolver';
import { DateCustomRangeInputs } from './DateCustomRangeInputs';

/**
 * Contenu des filtres, commun au panneau de la carte (`panel`, accordéons) et à la barre de la
 * liste (`bar`, menus déroulants). Le conteneur (accordéon ou menu) est la seule différence entre
 * les deux écrans ; la liste des filtres vient de `FILTER_DEFINITIONS`.
 */
export type FilterVariant = 'panel' | 'bar';

export const SEARCH_PLACEHOLDER = 'Rechercher par titre, ville, organisateur...';

const MODALITY_OPTIONS: { value: EventFilters['modality']; label: string; icon: typeof Globe | null }[] = [
  { value: 'all', label: 'Tous', icon: null },
  { value: 'presentiel', label: 'Présentiel', icon: MapPin },
  { value: 'distanciel', label: 'En ligne', icon: Globe },
];

const ROW_CLASS: Record<FilterVariant, string> = {
  panel: 'flex items-center gap-3 cursor-pointer group',
  bar: 'flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-primary/5 transition-colors',
};

const CHECKBOX_CLASS = 'w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary';

interface CheckOptionProps {
  variant: FilterVariant;
  checked: boolean;
  onChange: () => void;
  lead?: ReactNode;
  children: ReactNode;
}

function CheckOption({ variant, checked, onChange, lead, children }: CheckOptionProps) {
  const labelClass =
    variant === 'panel'
      ? 'text-sm text-text-secondary group-hover:text-text-primary transition-colors'
      : checked
        ? 'text-primary font-medium'
        : 'text-text-secondary';
  return (
    <label className={ROW_CLASS[variant]}>
      <input type="checkbox" checked={checked} onChange={onChange} className={CHECKBOX_CLASS} />
      {lead}
      <span className={labelClass}>{children}</span>
    </label>
  );
}

function PictoBadge({ row, variant }: { row: LinkedTableRow; variant: FilterVariant }) {
  const Icon = getIcon(row.pictoName, Globe);
  const color = checkIconColor(row.colorHexa, DEFAULT_FORMAT_COLOR);
  const size = variant === 'panel' ? 'w-6 h-6 rounded-md' : 'w-5 h-5 rounded flex-shrink-0';
  const iconSize = variant === 'panel' ? 'w-3.5 h-3.5' : 'w-3 h-3';
  return (
    <span className={`${size} flex items-center justify-center`} style={{ backgroundColor: color }}>
      <Icon className={`${iconSize} text-white`} />
    </span>
  );
}

interface ReferenceOptionsProps {
  rows: LinkedTableRow[];
  selected: string[];
  onToggle: (id: string) => void;
  lead: 'none' | 'logo' | 'picto';
  variant: FilterVariant;
  /** La liste n'a pas pu être chargée : message d'erreur à la place des options (≠ liste vide). */
  unavailable?: boolean;
}

export const UNAVAILABLE_LIST_MESSAGE = 'Liste momentanément indisponible. Réessayez dans quelques instants.';

/** Options d'un référentiel Baserow, dans l'ordre où l'API les renvoie (ordre des lignes dans Baserow). */
function ReferenceOptions({ rows, selected, onToggle, lead, variant, unavailable }: ReferenceOptionsProps) {
  if (unavailable && rows.length === 0) {
    return (
      <p
        role="status"
        className={`text-sm text-text-secondary ${variant === 'panel' ? '' : 'p-3 min-w-[220px]'}`}
      >
        {UNAVAILABLE_LIST_MESSAGE}
      </p>
    );
  }
  return (
    <div className={variant === 'panel' ? 'space-y-2' : 'p-2 space-y-1 min-w-[220px]'}>
      {rows.map((row) => (
        <CheckOption
          key={row.id}
          variant={variant}
          checked={selected.includes(row.id)}
          onChange={() => onToggle(row.id)}
          lead={
            lead === 'logo' && row.logoUrl ? (
              <img
                src={row.logoUrl}
                alt={row.name}
                className="w-6 h-6 object-contain rounded-sm shadow-sm bg-white"
              />
            ) : lead === 'picto' ? (
              <PictoBadge row={row} variant={variant} />
            ) : undefined
          }
        >
          {row.name}
        </CheckOption>
      ))}
    </div>
  );
}

function DateOptions({ filters, onUpdateFilters, variant }: Pick<EventFilterControls, 'filters' | 'onUpdateFilters'> & { variant: FilterVariant }) {
  const { helpers } = useConfig();
  const modes = helpers.getDateFilterModes();
  const select = (mode: string) => onUpdateFilters({ dateFilter: mode as EventFilters['dateFilter'] });

  return (
    <div className={variant === 'panel' ? 'space-y-2' : 'p-2 space-y-1'}>
      {modes.map(({ mode, label }) =>
        variant === 'panel' ? (
          <label key={mode} className={ROW_CLASS.panel}>
            <input
              type="radio"
              name="dateFilter"
              value={mode}
              checked={filters.dateFilter === mode}
              onChange={() => select(mode)}
              className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
            />
            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
              {label || mode}
            </span>
          </label>
        ) : (
          <button
            key={mode}
            onClick={() => select(mode)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.dateFilter === mode
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-text-secondary hover:bg-primary/5'
            }`}
          >
            {label || mode}
          </button>
        ),
      )}
      {filters.dateFilter === 'custom' && (
        <DateCustomRangeInputs
          filters={filters}
          onUpdateFilters={onUpdateFilters}
          compact={variant === 'bar'}
        />
      )}
    </div>
  );
}

function ModalityOptions({ filters, onUpdateFilters, variant }: Pick<EventFilterControls, 'filters' | 'onUpdateFilters'> & { variant: FilterVariant }) {
  return (
    <div
      className={`flex bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-primary/10 ${
        variant === 'bar' ? 'self-start' : ''
      }`}
    >
      {MODALITY_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onUpdateFilters({ modality: value })}
          className={`flex items-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-all ${
            variant === 'panel' ? 'flex-1 justify-center px-2' : 'px-4'
          } ${
            filters.modality === value
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-primary hover:bg-white/50'
          }`}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </button>
      ))}
    </div>
  );
}

function PostalCodeInput({ filters, onUpdateFilters, variant }: Pick<EventFilterControls, 'filters' | 'onUpdateFilters'> & { variant: FilterVariant }) {
  const active = !!filters.postalCode;
  const input = (
    <input
      type="text"
      value={filters.postalCode}
      onChange={(e) => onUpdateFilters({ postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
      placeholder={variant === 'panel' ? 'Ex: 75, 75001...' : 'Code postal'}
      maxLength={5}
      className={
        variant === 'panel'
          ? 'w-full px-3 py-2 bg-white border border-primary/20 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all'
          : `w-32 px-3 py-2 rounded-lg text-sm border transition-colors ${
              active
                ? 'bg-primary text-white border-primary placeholder:text-white/70'
                : 'bg-white text-primary border-primary/20 placeholder:text-text-secondary'
            }`
      }
    />
  );
  const clear = active && (
    <button
      onClick={() => onUpdateFilters({ postalCode: '' })}
      className={
        variant === 'panel'
          ? 'absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors'
          : 'absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white'
      }
      aria-label="Effacer le code postal"
    >
      <X className="w-4 h-4" />
    </button>
  );

  return (
    <>
      <div className="relative">
        {input}
        {clear}
      </div>
      {variant === 'panel' && (
        <p className="text-xs text-text-secondary mt-2">
          Entrez un code postal ou son début (ex: 75 pour Paris)
        </p>
      )}
    </>
  );
}

function RegionOptions({ filters, onToggleRegion, variant }: Pick<EventFilterControls, 'filters' | 'onToggleRegion'> & { variant: FilterVariant }) {
  const { helpers } = useConfig();
  const { metropole, domtom } = helpers.getRegionGroups();
  const option = (region: string) => (
    <CheckOption
      key={region}
      variant={variant}
      checked={filters.regions.includes(region)}
      onChange={() => onToggleRegion(region)}
    >
      {region}
    </CheckOption>
  );

  return (
    <div className={variant === 'panel' ? 'space-y-2' : 'p-2 space-y-1 max-h-[250px] overflow-y-auto scrollbar-thin'}>
      {metropole.map(option)}
      <div
        className={
          variant === 'panel'
            ? 'pt-3 mt-3 border-t border-primary/10 space-y-2'
            : 'border-t border-primary/10 mt-2 pt-2'
        }
      >
        <p
          className={
            variant === 'panel'
              ? 'text-xs text-text-secondary mb-2 font-medium uppercase tracking-wide'
              : 'px-3 py-1 text-xs text-text-secondary font-medium uppercase'
          }
        >
          Outre-mer
        </p>
        {domtom.map(option)}
      </div>
    </div>
  );
}

/**
 * Filtre « Coup de cœur » : une case à cocher mise en avant dans le panneau, un bouton à bascule dans
 * la barre. Couleur : jeton `accent-yellow` du thème.
 */
function HighlightToggle({ filters, onUpdateFilters, variant }: Pick<EventFilterControls, 'filters' | 'onUpdateFilters'> & { variant: FilterVariant }) {
  const checked = filters.highlightOnly;
  const toggle = () => onUpdateFilters({ highlightOnly: !checked });

  if (variant === 'bar') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={checked}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ring-1 ring-accent-yellow ${
          checked ? 'bg-accent-yellow text-text-primary' : 'bg-accent-yellow/10 text-text-primary hover:bg-accent-yellow/25'
        }`}
      >
        <Heart className={`w-4 h-4 ${checked ? 'fill-current' : ''}`} aria-hidden="true" />
        {HIGHLIGHT_LABEL}
      </button>
    );
  }

  return (
    <label
      className={`flex items-center gap-3 cursor-pointer group rounded-lg px-3 py-2.5 transition-colors ring-1 ring-accent-yellow/60 ${
        checked ? 'bg-accent-yellow/30' : 'bg-accent-yellow/10 hover:bg-accent-yellow/20'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={toggle} className={CHECKBOX_CLASS} />
      <span className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center bg-accent-yellow text-text-primary shadow-sm">
        <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold text-text-primary">{HIGHLIGHT_LABEL}</span>
    </label>
  );
}

/** Champ de recherche texte (titre, description, ville, organisateur, région, lieu). */
export function FilterSearch({
  filters,
  onUpdateFilters,
  variant,
}: Pick<EventFilterControls, 'filters' | 'onUpdateFilters'> & { variant: FilterVariant }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <input
        type="text"
        value={filters.search}
        onChange={(e) => onUpdateFilters({ search: e.target.value })}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label="Rechercher un événement"
        className={
          variant === 'panel'
            ? 'w-full pl-9 pr-9 py-2.5 bg-white border border-primary/20 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all'
            : 'w-full pl-10 pr-10 py-2.5 bg-white border border-primary/20 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-inter'
        }
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
  );
}

interface FilterContentProps {
  id: FilterId;
  variant: FilterVariant;
  controls: EventFilterControls;
}

/** Corps d'un filtre de `FILTER_DEFINITIONS`. */
export function FilterContent({ id, variant, controls }: FilterContentProps) {
  const { filters, onUpdateFilters } = controls;

  switch (id) {
    case 'highlight':
      return <HighlightToggle filters={filters} onUpdateFilters={onUpdateFilters} variant={variant} />;
    case 'modality':
      return <ModalityOptions filters={filters} onUpdateFilters={onUpdateFilters} variant={variant} />;
    case 'date':
      return <DateOptions filters={filters} onUpdateFilters={onUpdateFilters} variant={variant} />;
    case 'partners':
      return (
        <ReferenceOptions
          rows={controls.availablePartners}
          selected={filters.partners}
          onToggle={controls.onTogglePartner}
          lead="logo"
          variant={variant}
          unavailable={controls.unavailableReferences.includes('partners')}
        />
      );
    case 'format':
      return (
        <ReferenceOptions
          rows={controls.availableFormats}
          selected={filters.types}
          onToggle={controls.onToggleType}
          lead="picto"
          variant={variant}
          unavailable={controls.unavailableReferences.includes('formats')}
        />
      );
    case 'themes':
      return (
        <ReferenceOptions
          rows={controls.availableThemes}
          selected={filters.themes}
          onToggle={controls.onToggleTheme}
          lead="picto"
          variant={variant}
          unavailable={controls.unavailableReferences.includes('themes')}
        />
      );
    case 'audiences':
      return (
        <ReferenceOptions
          rows={controls.availablePublics}
          selected={filters.audiences}
          onToggle={controls.onToggleAudience}
          lead="none"
          variant={variant}
          unavailable={controls.unavailableReferences.includes('publics')}
        />
      );
    case 'postalCode':
      return <PostalCodeInput filters={filters} onUpdateFilters={onUpdateFilters} variant={variant} />;
    case 'region':
      return <RegionOptions filters={filters} onToggleRegion={controls.onToggleRegion} variant={variant} />;
  }
}
