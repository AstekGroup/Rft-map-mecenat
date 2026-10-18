# Make Map

Carte interactive d'événements, **un seul code pour N cartes** : une carte = un événement (dates, marque, titres, données propres). Ce qui change d'une carte à l'autre vit dans un **fichier de configuration** (`app.config.json`) et dans **Baserow**, jamais dans le code.

**Stack** : React + NestJS + MapLibre GL JS | **Monorepo** : pnpm + TurboRepo

Qui porte quoi (config, Baserow, code, environnement) : [docs/audit/PERIMETRE-CONFIG-BASEROW.md](docs/audit/PERIMETRE-CONFIG-BASEROW.md). Règles de contribution : [AGENTS.md](AGENTS.md). Index de la documentation de la refonte : [docs/README.md](docs/README.md).

## Structure du projet

```
make-map/
├── AGENTS.md               # Consignes pour assistants IA (Cursor, etc.)
├── app.config.json         # Config de la carte par défaut (identité, dates, design, schéma Baserow)
├── apps/
│   ├── frontend/           # React + Vite (consomme l'API backend)
│   └── backend/            # NestJS (proxy Baserow + géocodage + service de la config)
├── shared/
│   └── types/              # @make-map/types (types TypeScript partagés, dont AppConfig)
├── deploy/                 # Docker Compose + Caddy (production), Baserow local jetable
├── docs/                   # Documentation de la refonte (voir docs/README.md)
├── scripts/                # Scripts de déploiement et seed du Baserow local
├── resources/              # Analyses et ressources de design historiques (exemples)
├── turbo.json
└── pnpm-workspace.yaml
```

## Démarrage rapide

### Prérequis

- Node.js 20 (version utilisée par les images Docker)
- pnpm 9 (`packageManager` de `package.json`)

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
| `BASEROW_EVENT_TABLE_ID` | backend | ID numérique de la table des événements |
| `BASEROW_MODERATION_FIELD_ID` | backend | ID numérique du champ de modération (absent : rien n'est publié) |
| `BASEROW_PARTNERS_TABLE_ID` | backend | ID numérique de la table des partenaires |
| `BASEROW_THEMATIQUES_TABLE_ID` | backend | ID numérique de la table des thématiques |
| `BASEROW_FORMATS_TABLE_ID` | backend | ID numérique de la table des formats |
| `BASEROW_PUBLICS_TABLE_ID` | backend | ID numérique de la table des publics |
| `PORT` | backend | Port du serveur (3000 par défaut) |
| `APP_CONFIG_PATH` | backend, compilation du frontend | (optionnel) chemin absolu du `app.config.json` de la carte ; absent : `app.config.json` à la racine |
| `CORS_ORIGIN` | backend | (optionnel) origine autorisée par CORS |
| `ALLOW_DEV_MODE` | backend | (optionnel, local seulement) autorise `?devMode=true` ; ignoré en production |
| `VITE_API_URL` | frontend | URL du backend en développement (`http://localhost:3000`) ; vide en production (chemins relatifs, Caddy) |

Pour développer sans toucher à un Baserow réel : [docs/audit/BASEROW-LOCAL.md](docs/audit/BASEROW-LOCAL.md).

### Lancer le projet

```bash
# Frontend + backend ensemble
pnpm dev

# Ou séparément
pnpm back:dev    # Backend (port 3000)
pnpm front:dev   # Frontend (port 5173)
```

### Build, lint, tests

```bash
pnpm build
pnpm lint
pnpm test
```

## Une carte = une config

Le fichier `app.config.json` décrit la carte : identité (nom, URL, description), dates de l'événement, titres, design (couleurs, polices, rayons) et correspondance avec le schéma Baserow (`baserow.fieldMapping`, `baserow.mapping`). Le contrat de ses clés est le type `AppConfig` (`shared/types/src/app-config.ts`). Le backend valide la config au démarrage et la sert sur `GET /api/config` ; le frontend s'en sert pour le thème et les textes.

Pour une autre carte, pointer `APP_CONFIG_PATH` vers une autre config (au démarrage du backend **et** à la compilation du frontend, voir [apps/frontend/README.md](apps/frontend/README.md#une-compilation-par-carte)). Le dépôt contient une seconde config d'exemple dans [docs/audit/fixtures/](docs/audit/fixtures/).

## Applications

### Backend (`apps/backend`)

Proxy sécurisé NestJS pour l'API Baserow (lecture seule). Le token reste côté serveur.

- **API** : `GET /api/config` · `GET /api/events` · `GET /api/events/:id` · `GET /api/events/partners|themes|formats|publics` · `GET /api/health`
- Géocodage via [api-adresse.data.gouv.fr](https://adresse.data.gouv.fr), avec cache mémoire (durée de vie du processus)
- Cache TTL 5 min pour les données Baserow : un événement modéré (accepté ou retiré) n'est visible qu'au plus 5 minutes plus tard, ou après un redémarrage du backend
- `?devMode=true` contourne le filtre de modération, uniquement si `ALLOW_DEV_MODE=true` et hors production

### Frontend (`apps/frontend`)

Application React avec carte interactive MapLibre GL JS.

- Clustering (Supercluster)
- Recherche et filtres (modalité, période, partenaires, type d'événement, thématiques, public cible, code postal, région) : ceux dont le référentiel Baserow est vide se masquent d'eux-mêmes
- Vue carte + vue liste avec pagination
- Encarts DOM-TOM
- Thème (couleurs, polices) et textes injectés depuis la config de la carte

## Package partagé

### @make-map/types (`shared/types`)

Types TypeScript partagés entre frontend et backend : `Event`, `EventModality`, `LinkedTableRow`, types GeoJSON et clusters, et `AppConfig` (contrat de la config de carte).

## Déploiement

Instance **Scaleway DEV1-S** avec Docker Compose : Caddy (HTTPS auto) + Nginx (frontend) + NestJS (backend).

```bash
pnpm deploy:v2
```

Voir [deploy/README.md](deploy/README.md) pour le guide complet.

## Documentation pour assistants IA

Format ouvert [agents.md](https://agents.md/) : un **`AGENTS.md` par zone** du monorepo (l'agent privilégie en général le fichier le plus proche du dossier de travail).

- [AGENTS.md](AGENTS.md) — index et règles globales
- [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md) — frontend React / carte
- [apps/backend/AGENTS.md](apps/backend/AGENTS.md) — API NestJS
- [shared/types/AGENTS.md](shared/types/AGENTS.md) — package `@make-map/types`
- [deploy/AGENTS.md](deploy/AGENTS.md) — déploiement
- [docs/README.md](docs/README.md) — index de la documentation de la refonte (suivi, plan, périmètre config / Baserow, workflow Git)

---

**POC - Astek Innovation Lab**
