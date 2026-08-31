import { createContext, useContext } from 'react';
import type { AppConfig } from '@/types/event';

export interface ConfigHelpers {
  getEnumLabel: (category: keyof AppConfig['enums'], id: string) => string;
  getEnumColor: (id: string) => string;
  getEnumList: (category: keyof AppConfig['enums']) => AppConfig['enums'][keyof AppConfig['enums']];
  getText: (section: string, key: string) => string;
  getRegionGroups: () => { metropole: string[]; domtom: string[] };
}

export interface ConfigContextValue {
  config: AppConfig | null;
  loading: boolean;
  error: Error | null;
  helpers: ConfigHelpers;
}

const FALLBACK_LABELS: Record<string, string> = {
  'atelier-cuisine': 'Atelier de cuisine',
  degustation: 'Dégustation ou menu végétal',
  'visite-jardin': 'Visite de jardin / potager ou cueillette',
  'atelier-pedagogique': 'Atelier pédagogique ou formation',
  conference: 'Conférence/webinaire/table-ronde',
  festival: 'Festival',
  autre: 'Autres',
  'tout-public': 'Tout public',
  'familles-enfants': 'Famille / enfants',
  'salaries-entreprise': "Salariés d'une entreprise",
  professionnels: 'Professionnels',
  scolaires: 'Scolaires',
  presentiel: 'En présentiel',
  distanciel: 'En ligne',
  'cuisine-vegetale': 'Cuisine végétale',
  'sante-nutrition': 'Santé & nutrition',
  biodiversite: 'Biodiversité',
  agriculture: 'Agriculture',
  'climat-environnement': 'Climat & environnement',
};

const FALLBACK_COLORS: Record<string, string> = {
  'atelier-cuisine': '#3BAE5D',
  degustation: '#F4C542',
  'visite-jardin': '#A7D7B5',
  'atelier-pedagogique': '#1F7A3E',
  conference: '#E46A5D',
  festival: '#FF8C00',
  autre: '#D9D9D9',
};

const FALLBACK_REGIONS = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne',
  'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France',
  'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
  'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
  'Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte',
];

const DOMTOM = ['Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte'];

export function buildHelpers(config: AppConfig | null): ConfigHelpers {
  const enumMap = (cat: keyof AppConfig['enums']): Record<string, string> => {
    const items = config?.enums?.[cat];
    if (!items) return {};
    const map: Record<string, string> = {};
    for (const item of items as any[]) {
      map[item.id] = item.label;
    }
    return map;
  };

  const colorMap = (): Record<string, string> => {
    const items = config?.enums?.eventTypes;
    if (!items) return {};
    const map: Record<string, string> = {};
    for (const item of items as any[]) {
      if (item.color) map[item.id] = item.color;
    }
    return map;
  };

  return {
    getEnumLabel(category, id) {
      const map = enumMap(category);
      return map[id] || FALLBACK_LABELS[id] || id;
    },
    getEnumColor(id) {
      const map = colorMap();
      return map[id] || FALLBACK_COLORS[id] || '#3BAE5D';
    },
    getEnumList(category) {
      return config?.enums?.[category] || [];
    },
    getText(section, key) {
      const texts = (config?.texts as any)?.[section];
      if (texts && texts[key]) return texts[key];
      return key;
    },
    getRegionGroups() {
      if (config?.regions) {
        const metropole: string[] = [];
        const domtom: string[] = [];
        for (const r of config.regions) {
          if (r.group === 'domtom') domtom.push(r.id);
          else metropole.push(r.id);
        }
        return { metropole, domtom };
      }
      return {
        metropole: FALLBACK_REGIONS.filter(r => !DOMTOM.includes(r)),
        domtom: DOMTOM,
      };
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
