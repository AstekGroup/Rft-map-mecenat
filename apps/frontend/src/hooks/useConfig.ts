import { createContext, useContext } from 'react';
import type { AppConfig } from '@/types/event';

export interface ConfigHelpers {
  getEnumLabel: (category: keyof typeof ENUM_MAP, id: string) => string;
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
  targetAudiences: [
    { id: "tout-public", label: "Tout public" },
    { id: "familles-enfants", label: "Famille / enfants" },
    { id: "salaries-entreprise", label: "Salariés d'une entreprise" },
    { id: "professionnels", label: "Professionnels" },
    { id: "scolaires", label: "Scolaires" }
  ],
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
      return map[id] || FALLBACK_LABELS[id] || id;
    },
    getText(section, key) {
      const texts = (config?.texts as any)?.[section];
      if (texts && texts[key]) return texts[key];
      return key;
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
