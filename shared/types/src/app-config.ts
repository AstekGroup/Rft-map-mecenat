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

export interface AppConfigDateFilterMode {
  mode: string;
  label: string;
}

export interface AppConfigFilters {
  showPastEvents: boolean;
  defaultModality: string;
  dateFilterModes: AppConfigDateFilterMode[];
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
  texts: AppConfigTexts;
  filters: AppConfigFilters;
  baserow: {
    moderationVisibleValue: string;
    fieldMapping: Record<string, string>;
    mapping: Record<string, Record<string, string | Record<string, string>>>;
  };
}
