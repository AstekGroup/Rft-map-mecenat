# AGENTS.md — `@make-map/frontend`

[← Instructions racine](../../AGENTS.md) · [Backend](../backend/AGENTS.md) · [Types](../../shared/types/AGENTS.md) · [Suivi de la refonte](../../docs/audit/SUIVI.md)

> Lire d'abord la section « Philosophie de la refonte » de l'[AGENTS.md racine](../../AGENTS.md) : **1 code pour N cartes, les titres et l'identité de l'événement viennent de la config**.

## Contexte

Application **React 18 + Vite** : carte MapLibre, clustering Supercluster. Elle appelle le **backend uniquement** (jamais Baserow en direct) : `GET /api/config` (config de la carte) et `GET /api/events*`.

## Commandes (depuis `apps/frontend`)

```bash
pnpm dev          # Vite — http://localhost:5173
pnpm build        # tsc -b puis vite build (+ réécriture de index.html)
pnpm test         # Vitest
```

Depuis la racine : `pnpm front:dev`. Limites connues : le lint frontend n'a pas de config ESLint ; `pnpm build` réécrit `index.html` (script non idempotent).

## Règles propres au frontend

1. **Titres et noms de l'événement** (nom, nom court, année, titres d'accueil, métadonnées) : toujours depuis la config (`app.*`, `texts.*`, via `useConfig`), avec un **repli lisible** si la clé manque, jamais la clé brute. Le **wording générique de l'interface** (boutons, placeholders, libellés de contrôles) reste en dur, en français.
2. **Aucune couleur, police ou ombre en dur.** Passer par les variables CSS `--color-*-rgb`, `--font-*` injectées par `ConfigProvider` et par les classes Tailwind (`primary`, `surface-*`, `text-*`…). Une couleur de repli doit être une constante **unique** (et non copiée dans chaque fichier).
3. **Aucune marque ni coordonnée en dur** (nom de l'événement, logo, `contact@…`, URL du site, année) : tout vient de `app.*` / `texts.*`.
4. **Carte et régions** (centre, zoom, bornes, territoires d'outre-mer, liste des régions) : restent dans le code, mais définis une seule fois (constante partagée, ex. `FRANCE_DEFAULT_VIEW`), jamais répétés.
5. **Référentiels** (types/formats, publics, thématiques, partenaires) : libellés, couleurs et pictos viennent de l'API (Baserow). Pas de `FALLBACK_LABELS` ni de listes métier ajoutées.
6. **Pas de flags de fonctionnalités** (`features.*`) : toutes les fonctionnalités sont actives. Pas de filtre masquable par la config ; un filtre dont le référentiel est vide se masque de lui-même.
7. **Dégradation** : pas de `Invalid Date`, pas de crash si `type`/`date`/`format` manquent ; une route inconnue ou une erreur de chargement a une page d'erreur dédiée ; si `/api/config` échoue, afficher un état d'erreur, pas des clés brutes.
8. **Intégration iframe** (la carte est embarquée dans WordPress, l'iframe reste telle quelle) : ne pas supposer la fenêtre entière ; ne pas ajouter de dépendance à `window.top`.

## Conventions

- Alias **`@/`** → `src/`. Types métier : `@/types/event` (réexport) ou `@make-map/types`.
- Hooks d'abord (`useEvents`, `useClusters`, `useMapViewport`, `useConfig`) ; `useMemo` / `useCallback` pour carte et listes.
- Tests Vitest à côté du code (`*.spec.ts(x)`) ; un cas dégradé testé pour toute logique de données.

## Zones utiles

| Dossier | Rôle |
|---|---|
| `src/components/Layout/ConfigProvider.tsx` | Injection du thème (couleurs, polices) depuis `/api/config` |
| `src/hooks/useConfig.ts` | Accès aux textes et libellés (contient de la dette en dur, ne pas l'étendre) |
| `src/components/Map/` | Carte, marqueurs, popup, encarts DOM-TOM |
| `src/components/Sidebar/`, `Filters/`, `Events/` | Liste latérale, filtres, liste |
| `src/pages/` | Routes (`HomePage`, `MapPage`, `EventsListPage`, `EventDetailPage`) |
| `src/services/api.ts` | Client HTTP vers `VITE_API_URL` |
| `scripts/update-index-html.cjs` | Réécrit `index.html` au build depuis la config (donc **un build par carte** pour les métas/polices) |

## Variables

Voir `.env.example`. Seule `VITE_API_URL` est lue par le code. `VITE_MAPTILER_KEY` est documentée dans d'anciens fichiers mais **jamais lue** : ne pas s'y fier (retrait prévu en session 7).
