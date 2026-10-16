import { createContext, useContext } from 'react';
import type { AppConfig } from '@/types/event';

export interface ConfigHelpers {
  getEnumLabel: (category: keyof typeof ENUM_MAP, id: string) => string;
  getText: (section: string, key: string) => string;
  getRegionGroups: () => { metropole: string[]; domtom: string[] };
  /** Badge d'édition « nom court + année » tiré de la config ; chaîne vide si la config ne les donne pas. */
  getEditionBadge: () => string;
  /** Modes du filtre de période : ceux de la config, sinon les seuls modes génériques. */
  getDateFilterModes: () => DateFilterModeOption[];
}

export interface DateFilterModeOption {
  mode: string;
  label: string;
}

// Modes dont le libellé ne dépend pas de l'événement. Le mode « pendant l'événement »
// n'y figure pas : son libellé porte le nom de l'événement et vient de la config
// (`filters.dateFilterModes`) ; sans lui, ce mode n'est simplement pas proposé.
const GENERIC_DATE_FILTER_MODES: DateFilterModeOption[] = [
  { mode: 'all', label: 'Toutes les dates' },
  { mode: 'custom', label: 'Dates personnalisées' },
];

export interface ConfigContextValue {
  config: AppConfig | null;
  loading: boolean;
  error: Error | null;
  helpers: ConfigHelpers;
}

const REGIONS = [
  { id: "Auvergne-Rhône-Alpes", group: "metropole" },
  { id: "Bourgogne-Franche-Comté", group: "metropole" },
  { id: "Bretagne", group: "metropole" },
  { id: "Centre-Val de Loire", group: "metropole" },
  { id: "Corse", group: "metropole" },
  { id: "Grand Est", group: "metropole" },
  { id: "Hauts-de-France", group: "metropole" },
  { id: "Île-de-France", group: "metropole" },
  { id: "Normandie", group: "metropole" },
  { id: "Nouvelle-Aquitaine", group: "metropole" },
  { id: "Occitanie", group: "metropole" },
  { id: "Pays de la Loire", group: "metropole" },
  { id: "Provence-Alpes-Côte d'Azur", group: "metropole" },
  { id: "Guadeloupe", group: "domtom" },
  { id: "Martinique", group: "domtom" },
  { id: "Guyane", group: "domtom" },
  { id: "La Réunion", group: "domtom" },
  { id: "Mayotte", group: "domtom" }
];

const ENUM_MAP = {
  modalities: [
    { id: "presentiel", label: "En présentiel" },
    { id: "distanciel", label: "En ligne" }
  ]
};

export function buildHelpers(config: AppConfig | null): ConfigHelpers {
  const enumMap = (cat: keyof typeof ENUM_MAP): Record<string, string> => {
    const items = ENUM_MAP[cat];
    if (!items) return {};
    const map: Record<string, string> = {};
    for (const item of items as any[]) {
      map[item.id] = item.label;
    }
    return map;
  };


  return {
    getEnumLabel(category, id) {
      const map = enumMap(category);
      return map[id] || id;
    },
    getText(section, key) {
      const texts = (config?.texts as any)?.[section];
      if (texts && texts[key]) return texts[key];
      return key;
    },
    getEditionBadge() {
      const shortName = config?.app?.shortName?.trim();
      const year = config?.app?.eventDates?.weekStart?.split('-')[0];
      const validYear = year && /^\d{4}$/.test(year) ? year : undefined;
      return [shortName, validYear].filter(Boolean).join(' ');
    },
    getDateFilterModes() {
      const modes = config?.filters?.dateFilterModes;
      return modes && modes.length > 0 ? modes : GENERIC_DATE_FILTER_MODES;
    },
    getRegionGroups() {
      const metropole: string[] = [];
      const domtom: string[] = [];
      for (const r of REGIONS) {
        if (r.group === 'domtom') domtom.push(r.id);
        else metropole.push(r.id);
      }
      return { metropole, domtom };
    },
  };
}

export const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  loading: true,
  error: null,
  helpers: buildHelpers(null),
});

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return ctx;
}
