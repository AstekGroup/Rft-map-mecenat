# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MVP POC for **"La Grande Semaine Végétale"** - an interactive map application displaying events promoting plant-based food across France. The project is a **monorepo** with a React frontend, a NestJS backend, and shared types.

**Project**: La Grande Semaine Végétale
**Event dates**: May 2026
**Status**: Adapted from "Semaine de l'IA" to LGSV branding

## Monorepo Structure

```
make-map/
├── apps/
│   ├── frontend/           # React + Vite (consumes backend API)
│   ├── backend/            # NestJS (Baserow proxy + geocoding)
│   └── map-interactive/    # Original standalone version (unchanged)
├── shared/
│   └── types/              # @make-map/types (shared TypeScript types)
├── turbo.json              # TurboRepo configuration
└── pnpm-workspace.yaml     # pnpm workspaces
```

## Commands

```bash
# From root (recommended)
pnpm install              # Install all workspace dependencies
pnpm dev                  # Start frontend + backend (via turbo)
pnpm front:dev            # Start frontend only (localhost:5173)
pnpm back:dev             # Start backend only (localhost:3000)
pnpm map:dev              # Start original map-interactive
pnpm build                # Build all packages
pnpm lint                 # Lint all packages
```

## Architecture Overview

### Backend (apps/backend) - NestJS

```
src/
├── baserow/                # Baserow API integration
│   ├── baserow.service.ts      # Fetch paginated + transform records
│   ├── baserow.types.ts        # BaserowRecord interface (French field names)
│   └── baserow-mapping.util.ts # Format/Audience/Modality mapping
├── geocoding/              # Address geocoding
│   └── geocoding.service.ts    # api-adresse.data.gouv.fr + in-memory cache
├── events/                 # REST API
│   ├── events.controller.ts    # GET /api/events, GET /api/events/:id
│   └── events.service.ts       # Orchestration + TTL cache (5min)
├── app.module.ts           # Root module (ConfigModule, EventsModule)
├── app.controller.ts       # GET /api/health
└── main.ts                 # Bootstrap + CORS config
```

**Key features**:
- Baserow token stays server-side (env var `BASEROW_API_TOKEN`)
- Geocoding via api-adresse.data.gouv.fr with permanent in-memory cache
- 5-minute TTL cache for Baserow data
- CORS configured for localhost dev ports
- `?devMode=true` query param to bypass moderation filter

### Frontend (apps/frontend) - React + Vite

Same UI as `map-interactive` but with simplified API layer:
- `services/api.ts` only makes HTTP calls to backend
- No Baserow/geocoding code client-side
- Types imported from `@make-map/types` (via re-export in `types/event.ts`)

### Shared Types (@make-map/types)

All shared types in `shared/types/src/event.ts`:
- `Event` - Core event model
- `EventType`, `EventFormat`, `TargetAudience`, `EventModality` - Enums
- `GeoJSONEvent`, `EventsGeoJSON` - GeoJSON representations
- `ClusterFeature`, `MapFeature` - Supercluster types
- Label constants: `EVENT_TYPE_LABELS`, `EVENT_FORMAT_LABELS`, etc.
- `REGIONS` - All French regions including DOM-TOM

### Frontend Application Structure

The frontend follows a **hook-first architecture** with React Router:

```
RouterProvider (root)
├── HomePage (/)              # Landing page hub
├── MapPage (/carte)          # Interactive map with sidebar
│   ├── useEvents hook        # Calls backend API, manages filters
│   ├── MapView component     # MapLibre integration
│   │   ├── useClusters hook  # Supercluster integration
│   │   └── DOMTOMInset       # Overseas territories mini-maps
│   ├── Sidebar component     # Event list & filters
│   └── EventListView         # List view with pagination
├── EventsListPage (/evenements)  # Events list page
└── EventDetailPage (/evenement/:id)  # Event detail
```

### Data Flow

```
Frontend                    Backend                    External
--------                    -------                    --------
useEvents() ──GET /api/events──> EventsController
                                 └─> EventsService (cache check)
                                      └─> BaserowService
                                           ├─> Baserow API (fetch)
                                           ├─> mapping (transform)
                                           └─> GeocodingService
                                                └─> api-adresse.data.gouv.fr
```

## Design System

Custom design system matching semaine-ia.fr branding (in `tailwind.config.ts`):

**Colors**: `primary` (#003081), `accent-coral` (#f56476), `accent-magenta` (#cc3366), `surface-beige` (#ffeed1)
**Typography**: Rubik (titles), Palanquin (body)

## Environment Variables

**Backend** (`apps/backend/.env`):
```
BASEROW_API_URL=...             # Baserow API URL
BASEROW_API_TOKEN=...           # Baserow Database Token
BASEROW_TABLE_ID=...            # Baserow Events Table ID
BASEROW_PARTNERS_TABLE_ID=...   # Baserow Partners Table ID
BASEROW_MODERATION_FIELD_ID=... # Baserow Moderation Field ID
PORT=3000
```

**Frontend** (`apps/frontend/.env`):
```
VITE_API_URL=http://localhost:3000  # Backend URL
VITE_MAPTILER_KEY=...              # MapTiler API key
```

## Path Aliases

Frontend uses `@/` alias pointing to `src/`:
```typescript
import { useEvents } from '@/hooks';
import { Event } from '@/types/event';  // Re-exports from @make-map/types
```

## Performance Considerations

- **Clustering**: Supercluster handles 500k+ points efficiently
- **Server-side geocoding**: Geocoded once, cached in memory permanently
- **Backend cache**: 5-minute TTL avoids repeated Baserow calls
- **Memoization**: Frontend uses `useMemo` and `useCallback` extensively
- **WebGL rendering**: MapLibre uses GPU acceleration

## Important Notes

- This is a POC/MVP - focus on functionality over perfection
- `apps/map-interactive` is the original standalone version - DO NOT MODIFY
- All French text/labels should remain in French
- Event dates reference May 2026 event week
- Backend is READ-ONLY on Baserow (only GET operations)
## Design System (LGSV)

Custom design system matching `resources/lgsv-design.yml`:

**Colors**: 
- `primary`: #3BAE5D (green_main)
- `primary-dark`: #1F7A3E (green_dark)
- `primary-light`: #A7D7B5 (green_light)
- `surface-beige`: #F2EDE4
- `text-primary`: #2E2E2E

**Typography**: 
- Titles: Poppins
- Body: Inter
