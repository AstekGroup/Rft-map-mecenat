# Make Map - La Grande Semaine Végétale

Carte interactive pour visualiser les événements de **La Grande Semaine Végétale** à travers la France.

**Projet** : Promotion d'une alimentation végétale accessible | **Stack** : React + NestJS + MapLibre GL JS | **Monorepo** : pnpm + TurboRepo

## Structure du projet

```
make-map/
├── AGENTS.md               # Consignes pour assistants IA (Cursor, etc.)
├── CLAUDE.md               # Architecture détaillée pour agents
├── apps/
│   ├── frontend/           # React + Vite (consomme l'API backend)
│   ├── backend/            # NestJS (proxy Baserow + géocodage)
│   └── map-interactive/    # Version standalone originale (référence)
├── shared/
│   └── types/              # @make-map/types (types TypeScript partagés)
├── deploy/                 # Docker Compose + Caddy (production)
├── scripts/                # Scripts de déploiement
├── resources/              # Analyses et design system de référence
├── turbo.json
└── pnpm-workspace.yaml
```

## Démarrage rapide

### Prérequis

- Node.js 18+
- pnpm 9+

### Installation

```bash
pnpm install
```

### Variables d'environnement

Copier les fichiers `.env.example` et renseigner les valeurs :

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

| Variable | Où | Description |
|---|---|---|
| `BASEROW_API_URL` | backend | URL de l'instance Baserow (ex: https://api.baserow.io) |
| `BASEROW_API_TOKEN` | backend | Jeton de base de données Baserow |
| `BASEROW_TABLE_ID` | backend | ID numérique de la table des événements |
| `BASEROW_PARTNERS_TABLE_ID` | backend | ID numérique de la table des partenaires |
| `BASEROW_MODERATION_FIELD_ID` | backend | ID numérique du champ de modération |
| `VITE_API_URL` | frontend | URL du backend (`http://localhost:3000`) |
| `VITE_MAPTILER_KEY` | frontend | Clé API MapTiler ([obtenir ici](https://cloud.maptiler.com/account/keys/)) |

### Lancer le projet

```bash
# Frontend + backend ensemble
pnpm dev

# Ou séparément
pnpm back:dev    # Backend (port 3000)
pnpm front:dev   # Frontend (port 5173)
```

## Applications

### Backend (`apps/backend`)

Proxy sécurisé NestJS pour l'API Baserow. Le token reste côté serveur.

- **API** : `GET /api/events` · `GET /api/events/:id` · `GET /api/health`
- Géocodage via [api-adresse.data.gouv.fr](https://adresse.data.gouv.fr) avec cache permanent
- Cache TTL 5 min pour les données Baserow
- `?devMode=true` pour bypasser le filtre de modération

### Frontend (`apps/frontend`)

Application React avec carte interactive MapLibre GL JS.

- Clustering (Supercluster) pour 1500+ événements
- Filtres par type, format, audience, modalité, région
- Vue carte + vue liste avec pagination
- Encarts DOM-TOM
- Design system calé sur la charte semaine-ia.fr (Rubik / Palanquin)

### map-interactive (`apps/map-interactive`)

Version standalone originale avec appel direct Airtable côté client. Conservée comme référence, non modifiée (elle continue à utiliser Airtable).

```bash
pnpm map:dev
```

## Package partagé

### @make-map/types (`shared/types`)

Types TypeScript partagés : `Event`, `EventType`, `EventFormat`, `TargetAudience`, `EventModality`, `GeoJSONEvent`, constantes de labels, liste des régions.

## Déploiement

Instance **Scaleway DEV1-S** avec Docker Compose : Caddy (HTTPS auto) + Nginx (frontend) + NestJS (backend).

```bash
pnpm deploy:v2
```

Voir [deploy/README.md](deploy/README.md) pour le guide complet.

## Documentation pour assistants IA

Format ouvert [agents.md](https://agents.md/) : un **`AGENTS.md` par zone** du monorepo (l’agent privilégie en général le fichier le plus proche du dossier de travail).

- [AGENTS.md](AGENTS.md) — index et règles globales
- [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md) — frontend React / carte
- [apps/backend/AGENTS.md](apps/backend/AGENTS.md) — API NestJS
- [shared/types/AGENTS.md](shared/types/AGENTS.md) — package `@make-map/types`
- [deploy/AGENTS.md](deploy/AGENTS.md) — déploiement
- [apps/map-interactive/AGENTS.md](apps/map-interactive/AGENTS.md) — référence (non modifiée)
- [CLAUDE.md](CLAUDE.md) — architecture et conventions détaillées

## Ressources

- [Design System LGSV](resources/lgsv-design.yml)

---

**POC - Astek Innovation Lab**
