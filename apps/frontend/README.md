# Carte interactive - Frontend

Application React qui affiche les événements d'une carte sur une carte interactive de France. C'est le frontend du monorepo « **1 code, N cartes** » : l'identité de l'événement (nom, titres, dates, couleurs, polices) vient du fichier de config de la carte (`app.config.json`, servi par `GET /api/config`), les événements et référentiels viennent de Baserow via le backend.

**Assistants IA** : [AGENTS.md](./AGENTS.md) dans ce dossier (détail local) ; index global [AGENTS.md](../../AGENTS.md). Cette app consomme le backend NestJS, pas Baserow en direct. Qui porte quoi (config, Baserow, code) : [docs/audit/PERIMETRE-CONFIG-BASEROW.md](../../docs/audit/PERIMETRE-CONFIG-BASEROW.md) ; index de la documentation : [docs/README.md](../../docs/README.md).

## Aperçu

Cette application permet de visualiser et filtrer les événements d'une carte. Elle ne contient aucune donnée propre à un événement : changer de carte, c'est changer de config (et de base Baserow), sans toucher au code.

### Fonctionnalités

- 🗺️ **Carte interactive** avec MapLibre GL JS
- 📍 **Clustering** avec Supercluster
- 🔍 **Recherche** (titre, description, ville, organisateur, région, lieu)
- 📅 **Filtres** : modalité, période, partenaires, type d'événement, thématiques, public cible, code postal, région. Un filtre dont le référentiel Baserow est vide se masque de lui-même.
- 📋 **Vue liste** avec pagination
- 📱 **Responsive** (desktop + mobile)
- 🎨 **Thème piloté par la config** (couleurs, polices, rayons)

## Stack technique

| Technologie | Usage |
|-------------|-------|
| React 18 + Vite | Framework et bundler |
| MapLibre GL JS | Carte vectorielle WebGL |
| react-map-gl | Wrapper React pour MapLibre |
| Supercluster | Clustering performant |
| Tailwind CSS | Styling |
| Lucide React | Icônes |
| Vitest | Tests |

## Installation

Depuis la racine du monorepo (recommandé) :

```bash
pnpm install
pnpm front:dev    # frontend seul ; pnpm dev lance aussi le backend
pnpm build        # build de tout le monorepo
```

Ou depuis `apps/frontend` : `pnpm dev`, `pnpm build`.

## Structure du projet

```
src/
├── components/
│   ├── Map/           # Carte : MapView, marqueurs, clusters, popup, encarts DOM-TOM, fonds de carte
│   ├── Sidebar/       # Liste latérale et recherche
│   ├── Filters/       # Panneau de filtres (FilterPanel, FilterContent, accordéons)
│   ├── Events/        # Vue liste (EventListView) et barre de filtres (EventFiltersBar)
│   ├── Layout/        # ConfigProvider (thème depuis /api/config)
│   └── UI/            # Composants UI réutilisables (Badge, Button, Pagination)
├── hooks/
│   ├── useEvents.ts       # Chargement des événements et filtres
│   ├── useClusters.ts     # Clustering avec Supercluster
│   ├── useConfig.ts       # Accès à la config (textes, libellés)
│   └── useMapViewport.ts
├── pages/
│   ├── HomePage.tsx        # Page d'accueil
│   ├── MapPage.tsx         # Carte interactive
│   ├── EventsListPage.tsx  # Liste des événements
│   └── EventDetailPage.tsx # Détail d'un événement
├── services/
│   └── api.ts              # Client HTTP du backend (VITE_API_URL)
├── utils/                  # filterDefinitions, eventFilters, formatEventDate, iconResolver…
├── types/
│   └── event.ts            # Réexport des types partagés (@make-map/types)
└── styles/
    └── globals.css         # Styles globaux + Tailwind
scripts/                    # Génération de index.html depuis index.template.html + la config
tests/                      # Tests transverses (config d'une autre carte)
```

## Design

Les couleurs, polices et rayons viennent de la config de la carte (`theme.colors`, `theme.fonts`, `theme.borderRadius`) et sont injectés en variables CSS par `ConfigProvider`. Les composants utilisent les classes Tailwind associées (`primary`, `primary-dark`, `primary-light`, `surface-*`, `text-*`…). Aucune couleur ni police n'est à écrire en dur dans un composant.

Des valeurs par défaut subsistent encore dans `globals.css` et `tailwind.config.ts` : c'est une dette connue, planifiée dans [PLAN-FIN-REFONTE.md](../../docs/audit/PLAN-FIN-REFONTE.md) (étape 3).

## Une compilation par carte

Le titre de l'onglet, la description et les métadonnées de partage (Open Graph, Twitter, icône) sont écrits dans `index.html` **à la compilation**, à partir de la config de la carte. Il faut donc **une compilation par carte** :

```bash
# Carte par défaut (app.config.json à la racine du dépôt)
pnpm build

# Autre carte : chemin absolu vers sa config
APP_CONFIG_PATH=/chemin/vers/autre.config.json pnpm build      # PowerShell : $env:APP_CONFIG_PATH="C:\chemin\autre.config.json"; pnpm build
```

- `index.template.html` est le modèle suivi par git ; `index.html` est **généré** (ignoré par git). Relancer la génération donne toujours le même fichier et ne crée aucun diff.
- Les chaînes de la config peuvent reprendre le nom de l'événement par gabarit : `"title": "Carte - {{app.name}}"`. Changer `app.name` change tous les titres.
- Si une valeur requise manque dans la config (`app.description`, `texts.meta.title`, `ogTitle`, `ogDescription`, `iconRef`), la génération échoue avec un message qui la nomme.

## Configuration API Backend

L'application se connecte au backend NestJS pour récupérer la config et les événements. Il n'y a pas de données de secours côté frontend.

### Variables d'environnement

Une seule variable est lue par le code : `VITE_API_URL`. Copier `.env.example` en `.env` :

```bash
cp .env.example .env
```

```env
# URL du backend (vide en production : chemins relatifs, proxiés par Caddy)
VITE_API_URL=http://localhost:3000
```

### Architecture du pipeline de données

1. **Config** : `GET /api/config` (thème, textes, dates), appliqué par `ConfigProvider`.
2. **Événements et référentiels** : `GET /api/events`, `/partners`, `/themes`, `/formats`, `/publics` (lecture seule). Le frontend ne connaît ni Baserow ni le géocodage.
3. **Mapping et géocodage** : faits par le backend (mapping des colonnes via la config, géocodage via api-adresse.data.gouv.fr avec cache mémoire).
4. **Modération** : le backend ne renvoie que les événements portant la valeur de modération configurée.

### Mode développeur

`useEvents().toggleDevMode()` demande au backend tous les événements, y compris non modérés (`?devMode=true`). Le backend ignore cette demande sauf si `ALLOW_DEV_MODE=true` et hors production. Aucun bouton de l'interface ne l'expose.

### Événements distanciels

Les événements en ligne (sans adresse physique) ne sont pas placés sur la carte (`eventsToGeoJSON` écarte les événements sans coordonnées). Ils sont accessibles dans la liste filtrée sur la modalité « En ligne » (`/evenements?modality=distanciel`).

## Scripts disponibles (depuis `apps/frontend`)

```bash
pnpm dev      # génère index.html puis lance Vite (localhost:5173)
pnpm build    # génère index.html, tsc -b, vite build
pnpm preview  # prévisualise le build
pnpm test     # Vitest
pnpm lint     # ESLint (0 erreur ; 3 avertissements connus)
```

## Performance

- **Clustering** : les événements sont groupés selon le niveau de zoom (Supercluster).
- **Pagination** : la vue liste affiche les événements page par page.
- **Memoization** : les calculs de clusters et de listes sont mémoïsés (`useMemo` / `useCallback`).
