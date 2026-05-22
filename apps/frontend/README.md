# Carte Interactive - La Grande Semaine Végétale

Application React pour afficher les événements de **La Grande Semaine Végétale** sur une carte interactive de France.

**Assistants IA** : [AGENTS.md](./AGENTS.md) dans ce dossier (détail local) ; index global [AGENTS.md](../../AGENTS.md). Cette app consomme le backend NestJS, pas Airtable en direct.

## Aperçu

Cette application permet de visualiser et filtrer les événements (ateliers cuisine, dégustations, conférences, fermes ouvertes) organisés pour promouvoir une alimentation végétale accessible.

### Fonctionnalités

- 🗺️ **Carte interactive** avec MapLibre GL JS
- 📍 **Clustering intelligent** avec Supercluster
- 🔍 **Recherche** par ville, organisateur, région
- 📅 **Filtres** par type d'événement, public, modalité
- 📱 **Responsive** (desktop + mobile)
- 🎨 **Design System LGSV** (Palette de verts, Inter/Poppins)

## Stack technique

| Technologie | Usage |
|-------------|-------|
| React 18 + Vite | Framework et bundler |
| MapLibre GL JS | Carte vectorielle WebGL |
| react-map-gl | Wrapper React pour MapLibre |
| Supercluster | Clustering performant |
| Tailwind CSS | Styling |
| Lucide React | Icônes |

## Installation

```bash
# Installer les dépendances
pnpm install

# Lancer en mode développement
pnpm dev

# Build production
pnpm build
```

## Structure du projet

```
src/
├── components/
│   ├── Map/           # Composants carte (MapView, Markers, Popup)
│   ├── Sidebar/       # Sidebar avec liste et recherche
│   ├── Filters/       # Panneau de filtres
│   ├── Events/        # Vue liste événements et filtres
│   ├── Layout/        # Header et Footer
│   └── UI/            # Composants UI réutilisables
├── hooks/
│   ├── useEvents.ts   # Gestion des événements et filtres
│   ├── useClusters.ts # Clustering avec Supercluster
│   └── useMapViewport.ts
├── pages/
│   ├── HomePage.tsx        # Page d'accueil (carrefour)
│   ├── MapPage.tsx         # Carte interactive
│   ├── EventsListPage.tsx  # Liste des événements
│   └── EventDetailPage.tsx # Détail d'un événement
├── services/
│   ├── api.ts              # Service API Airtable + fallback mock
│   ├── geocoding.ts        # Géocodage via api-adresse.data.gouv.fr
│   └── airtableMapping.ts  # Mapping champs Airtable → types internes
├── data/
│   └── mockEvents.ts  # Données mockées (fallback si Airtable non configuré)
├── types/
│   └── event.ts       # Types TypeScript
└── styles/
    └── globals.css    # Styles globaux + Tailwind
```

## Design System

Couleurs selon [lgsv-design.yml](../../resources/lgsv-design.yml) :

| Couleur | Hex | Usage |
|---------|-----|-------|
| Vert Principal | `#3BAE5D` | Boutons, CTAs, accents |
| Vert Foncé | `#1F7A3E` | Titres, hovers |
| Vert Clair | `#A7D7B5` | Fonds, cartes |
| Beige | `#F2EDE4` | Fonds secondaires |
| Texte Sombre | `#2E2E2E` | Corps de texte |

Typographie :
- **Primaire** : Inter
- **Secondaire** : Poppins
## Configuration API Airtable

L'application se connecte à une base Airtable pour récupérer les événements. En l'absence de configuration, elle utilise les données mockées (fallback automatique).

### Variables d'environnement

Copier `.env.example` en `.env` et renseigner les valeurs :

```bash
cp .env.example .env
```

```env
# MapTiler (carte)
VITE_MAPTILER_KEY=votre_cle_maptiler

# Airtable (données événements)
VITE_AIRTABLE_API_KEY=votre_personal_access_token
VITE_AIRTABLE_BASE_ID=votre_base_id      # commence par "app"
VITE_AIRTABLE_TABLE_ID=votre_table_id    # commence par "tbl"
```

### Architecture du pipeline de données

1. **Fetch** : Récupération paginée depuis Airtable (GET uniquement, lecture seule)
2. **Mapping** : Transformation des champs français Airtable vers le modèle Event interne
3. **Géocodage** : Conversion des adresses en coordonnées GPS via api-adresse.data.gouv.fr (API BAN, gratuite)
4. **Cache** : Les résultats de géocodage sont mis en cache dans localStorage (7 jours)
5. **Filtre** : Par défaut, seuls les événements validés et visibles sur la cartographie sont récupérés

### Mode développeur

Un mode dev est disponible via `useEvents().toggleDevMode()` pour afficher tous les événements (y compris non validés).

### Événements distanciels

Les événements en ligne (sans adresse physique) ne sont pas géocodés et n'apparaissent pas sur la carte. Ils sont accessibles via la page "Événements en ligne" (`/evenements?modality=distanciel`).

## Scripts disponibles

```bash
pnpm dev      # Serveur de développement (localhost:5173)
pnpm build    # Build production
pnpm preview  # Preview du build
pnpm lint     # Lint du code
```

## Performance

L'application est optimisée pour gérer un grand nombre d'événements :

- **Clustering WebGL** : Les événements sont groupés automatiquement selon le niveau de zoom
- **Virtualisation** : Seuls les événements visibles sont rendus
- **Lazy loading** : Chargement progressif des données
- **Memoization** : Cache des calculs de clusters
## Liens

- Organisateur : La Grande Semaine Végétale
- Documentation : [AGENTS.md](../../AGENTS.md)
- Site principal : https://lagrandesemainevegetale.fr/
---

**La Grande Semaine Végétale**  
Promouvoir une alimentation végétale pour tous.
