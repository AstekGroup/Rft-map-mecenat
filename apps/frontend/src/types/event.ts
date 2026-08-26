/**
 * Re-export all types from the shared @make-map/types package.
 * This allows existing component imports (from '@/types/event') to keep working
 * while using the shared type definitions.
 */
export * from '@make-map/types';

/**
 * Frontend-specific types for mock data and APIs.
 * Note: Event.themes is now LinkedTableRow[] (shared type) but we provide a compatibility type for frontend APIs.
 */
import type { Event as SharedEvent, EventTheme, EventType, EventFormat, TargetAudience, EventModality, EventsGeoJSON, GeoJSONEvent, LinkedTableRow, AppConfig } from '@make-map/types';

export { EventTheme, EventType, EventFormat, TargetAudience, EventModality, EventsGeoJSON, GeoJSONEvent, LinkedTableRow, AppConfig };

export type FrontendEvent = SharedEvent & {
  themes: LinkedTableRow[];
};
