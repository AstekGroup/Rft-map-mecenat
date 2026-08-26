export interface AppConfigEnumItem {
  id: string;
  label: string;
  color?: string;
}

import { LinkedTableRow } from './event';

export interface AppConfigRegion {
  id: string;
  group: 'metropole' | 'domtom';
}

export interface AppConfigTheme {
  colors: Record<string, string>;
  fonts: {
    heading: string;
    body: string;
    googleFontsUrl?: string;
  };
  borderRadius?: Record<string, string>;
  shadows?: Record<string, string>;
}

export interface AppConfigTexts {
  meta: Record<string, string>;
  home: Record<string, string>;
  map: Record<string, string>;
  list: Record<string, string>;
  detail: Record<string, string>;
  filters: Record<string, string>;
  footer: Record<string, string>;
}

export interface AppConfigFilters {
  showPastEvents: boolean;
  defaultModality: string;
  dateFilterModes: string[];
  dateRanges?: Record<string, { start: string; end: string }>;
}

export interface AppConfigMap {
  center: { lng: number; lat: number };
  defaultZoom: number;
  maxZoom?: number;
  minZoom?: number;
  defaultStyle?: string;
  styles?: { id: string; label: string; url: string }[];
  clusterRadius?: number;
  clusterMaxZoom?: number;
}

export interface AppConfig {
  profile: string;
  app: {
    name: string;
    shortName: string;
    description: string;
    eventDates: { weekStart: string; weekEnd: string };
    url?: string;
    locale?: string;
  };
  theme: AppConfigTheme;
  enums: {
    eventTypes: AppConfigEnumItem[];
    eventFormats: AppConfigEnumItem[];
    targetAudiences: AppConfigEnumItem[];
    modalities: AppConfigEnumItem[];
  };

  regions: AppConfigRegion[];
  texts: AppConfigTexts;
  filters: AppConfigFilters;
  baserow: {
    moderationVisibleValue: string;
    fieldMapping: Record<string, string>;
    mapping: Record<string, Record<string, string | Record<string, string>>>;
    mappingHints?: Record<string, Record<string, string>>;
  };
  map?: AppConfigMap;
  availableThemes?: LinkedTableRow[];
}
