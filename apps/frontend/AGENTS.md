# AGENTS.md — `@make-map/frontend`

[← Instructions racine](../../AGENTS.md) · [Backend](../backend/AGENTS.md) · [Types](../../shared/types/AGENTS.md) · [Suivi de la refonte](../../docs/audit/SUIVI.md)

> Lire d'abord la section « Philosophie de la refonte » de l'[AGENTS.md racine](../../AGENTS.md) : **1 code pour N cartes, les titres et l'identité de l'événement viennent de la config**.

## Contexte

Application **React 18 + Vite** : carte MapLibre, clustering Supercluster. Elle appelle le **backend uniquement** (jamais Baserow en direct) : `GET /api/config` (config de la carte) et `GET /api/events*`.

## Commandes (depuis `apps/frontend`)

```bash
pnpm dev          # Vite — http://localhost:5173
pnpm build        # génère index.html depuis index.template.html + la config, puis tsc -b et vite build
pnpm test         # Vitest
pnpm lint         # ESLint (eslint.config.js) : 0 erreur ; 3 avertissements connus (dépendances de hooks dans MapView, export dans MapStyleSelector)
```

Depuis la racine : `pnpm front:dev`. Le lint ne modifie aucun fichier. Ne pas ajouter de `any` : typer les réponses de l'API.

**Une compilation par carte** : les métas de `index.html` (titre, description, Open Graph, icône) sont écrites à la compilation. Pour une autre carte : `APP_CONFIG_PATH=<chemin absolu de la config> pnpm build` (sans la variable : `app.config.json` à la racine). `index.html` est un fichier généré et ignoré par git ; on ne modifie que `index.template.html`. Un placeholder absent du modèle ou une valeur manquante dans la config fait échouer le script avec un message clair.

## Règles propres au frontend

1. **Titres et noms de l'événement** (nom, nom court, année, titres d'accueil, métadonnées) : toujours depuis la config (`app.*`, `texts.*`, via `useConfig`), avec un **repli lisible** si la clé manque, jamais la clé brute. Le badge « nom court + année » vient de `helpers.getEditionBadge()`, les modes de la période de `helpers.getDateFilterModes()` (le mode « pendant l'événement » n'existe que si la config le libelle). Le **wording générique de l'interface** (boutons, placeholders, libellés de contrôles) reste en dur, en français.
2. **Aucune couleur, police ou ombre en dur.** Passer par les variables CSS `--color-*-rgb`, `--font-*` injectées par `ConfigProvider` et par les classes Tailwind (`primary`, `surface-*`, `text-*`…). Une couleur de repli doit être une constante **unique** (et non copiée dans chaque fichier).
3. **Aucune marque ni coordonnée en dur** (nom de l'événement, logo, `contact@…`, URL du site, année) : tout vient de `app.*` / `texts.*`.
4. **Carte et régions** (centre, zoom, bornes, territoires d'outre-mer, liste des régions) : restent dans le code, mais définis une seule fois (constante partagée, ex. `FRANCE_DEFAULT_VIEW`), jamais répétés.
5. **Référentiels** (types/formats, publics, thématiques, partenaires) : libellés, couleurs et pictos viennent de l'API (Baserow). Pas de `FALLBACK_LABELS` ni de listes métier ajoutées.
6. **Pas de flags de fonctionnalités** (`features.*`) : toutes les fonctionnalités sont actives. Pas de filtre masquable par la config ; un filtre dont le référentiel est vide se masque de lui-même. Un référentiel **en erreur** (≠ vide : `controls.unavailableReferences`) ne masque pas le filtre : il reste affiché avec « Liste momentanément indisponible ».
   - **Filtres : une seule définition** (`utils/filterDefinitions.ts`, `FILTER_DEFINITIONS`) pour le panneau de la carte (`FilterPanel`, accordéons) et la barre de la liste (`EventFiltersBar`, menus) : même liste, même ordre, mêmes titres, mêmes règles d'affichage (seule exception déclarée dans la définition : `views`, la modalité n'est proposée que sur la liste, la carte a le bouton « Événements en ligne ») ; le corps d'un filtre est `FilterContent` (variantes `panel` / `bar`). Ajouter ou retirer un filtre = un seul endroit, jamais un écran de plus. Le filtre « Coup de cœur » (`highlight`, `presentation: 'toggle'`, libellé générique `HIGHLIGHT_LABEL`) se masque de lui-même tant qu'aucun événement chargé n'est un coup de cœur (`controls.hasHighlightedEvents`) ; ses couleurs passent par le jeton `accent-yellow`. Les écrans reçoivent **un seul objet `controls`** (`EventFilterControls`, renvoyé par `useEvents`) ; la logique de filtrage est pure et testée (`utils/eventFilters.ts`). « Événements passés » : visible par défaut une fois l'événement terminé (`isEventOver(app.eventDates.weekEnd)`), sauf choix explicite de l'utilisateur. Les options des référentiels s'affichent dans l'ordre de l'API (ordre Baserow), sans tri.
7. **Dégradation** : pas de `Invalid Date`, pas de crash si `type`/`date`/`format` manquent ; une route inconnue ou une erreur de chargement a une page d'erreur dédiée ; si `/api/config` échoue, afficher un état d'erreur, pas des clés brutes.
   - Dates : toujours `formatEventDate` (`utils/formatEventDate.ts`, chaîne vide si illisible, lecture à midi) ; ne plus écrire `new Date(event.date).toLocaleDateString(...)`.
   - Textes : `helpers.getText(section, clé)` renvoie une **chaîne vide** si le texte manque (jamais la clé). L'appelant choisit un repli lisible (`helpers.getEventName()`, libellé générique en dur) ou masque l'élément. L'accueil (`HomePage`) affiche un état d'erreur avec « Réessayer » si `useConfig().error` est posé (les hooks restent avant les `return` anticipés).
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
| `scripts/update-index-html.cjs` | Génère `index.html` (ignoré par git) depuis `index.template.html` et la config (donc **un build par carte** pour les métas) |
| `scripts/config-template.cjs` | Gabarits `{{...}}` de la config, version script de build (doit rester identique à `apps/backend/src/config/config-template.util.ts` ; `config-template.spec.ts` le vérifie) |

## Variables

Voir `.env.example`. Seule `VITE_API_URL` est lue par le code. L'ancienne variable `VITE_MAPTILER_KEY` (jamais lue) a été retirée (session 7) : ne pas la réintroduire sans consommateur.
