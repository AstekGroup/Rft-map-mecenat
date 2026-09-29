# Carte Interactive - La Grande Semaine Végétale

Application React pour afficher les événements de **La Grande Semaine Végétale** sur une carte interactive de France.

**Assistants IA** : [AGENTS.md](./AGENTS.md) dans ce dossier (détail local) ; index global [AGENTS.md](../../AGENTS.md). Cette app consomme le backend NestJS, pas Baserow en direct.

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
│   ├── api.ts              # Service API backend + fallback mock
│   ├── geocoding.ts        # Géocodage via api-adresse.data.gouv.fr
│   └── baserowMapping.ts  # Mapping champs Baserow → types internes
├── data/
│   └── mockEvents.ts  # Données mockées (fallback si backend non configuré)
├── types/
│   └── event.ts       # Types TypeScript
└── styles/
    └── globals.css    # Styles globaux + Tailwind
```

## Design System

Couleurs :
Chargées à partir du fichier de config app.config.json (theme.colors)

| Config | Usage |
|---------|-------|
| primary | Boutons, CTAs, accents |
| primary-dark | Titres, hovers |
| primary-light | Fonds, cartes |

Typographie :
Chargées à partir du fichier de config app.config.json (theme.fonts)


## Configuration API Backend

L'application se connecte au backend NestJS pour récupérer les événements. En l'absence de configuration, elle utilise les données mockées (fallback automatique).

### Variables d'environnement

Copier `.env.example` en `.env` et renseigner les valeurs :

```bash
cp .env.example .env
```

```env
# Backend (données événements)
VITE_API_URL=http://localhost:3000
```

### Architecture du pipeline de données

1. **Fetch** : Récupération paginée depuis le backend (GET uniquement, lecture seule)
2. **Mapping** : Transformation des champs français Baserow vers le modèle Event interne
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
