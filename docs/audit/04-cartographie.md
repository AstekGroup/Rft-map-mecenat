# 04 — Cartographie : refonte vs philosophie « 1 code / N cartes » (étape 4)

Date : 2026-10-16. Statuts et preuves : voir [SUIVI.md](SUIVI.md). Commandes exécutées : [JOURNAL.md](JOURNAL.md) (section étape 4).

> **Limite de portée** : `astek-jnr-map COMPARATIF/` est **une seule** des 5 copies dupliquées (JNR, backend Airtable). Les 4 autres copies ne sont pas dans le dépôt → leurs fonctionnalités propres sont **NON VÉRIFIÉES**. La comparaison ci-dessous ne dit donc pas « tout ce qui existait avant », seulement « ce que cette copie avait de plus ».
>
> Les comptages de textes JSX (§3) viennent d'une regex approximative (nœuds texte + `placeholder|title|aria-label|alt`) : c'est un ordre de grandeur, pas un décompte exact.

## 1. Grille « piloté par la config ? » par axe

| Axe | Statut | Ce qui est piloté | Ce qui reste en dur / manquant | Preuve |
|---|---|---|---|---|
| **Fonctionnalités on/off** | **PAS FAIT** | — | Aucun bloc `features` dans `app.config.json` ni dans le type `AppConfig`. Toute fonctionnalité est soit présente pour tout le monde, soit absente. | `app.config.json` : clés `profile, app, theme, texts, filters, baserow` ; `shared/types/src/app-config.ts` (aucune clé `features`) |
| **Titre / nom de l'événement** | **PARTIEL** | `app.name/shortName/description/url/locale` servis par `/api/config` ; titre de la page d'accueil via `texts.home` | Logo « SEMAINE VÉGÉTALE » dans `Header.tsx:18-21`, liens `semaine-vegetale.fr` / `contact@semaine-vegetale.fr` (`Footer.tsx:13,24`, `Header.tsx:37`), « LGSV 2026 » (`EventListView.tsx:88,108`), « • 2026 » (`Footer.tsx:37`), commentaires/badges « semaine LGSV » (`EventCard.tsx:127`, `EventPopup.tsx:67`) | `rg` étape 4 |
| **Textes** | **PARTIEL** | `texts.meta` (5 clés) et `texts.home` (10 clés) ; 14 appels `getText` | Le **type** `AppConfig` prévoit `map/list/detail/filters/footer` mais le JSON n'en contient pas et le front ne les lit pas : ~122 textes UI en dur dans 19 fichiers (plus gros : `EventDetailPage` 32, `FilterPanel` 15, `Header` 9, `Sidebar` 9, `EventFiltersBar` 7, `EventListView` 7, `MapPage` 6). `getText` renvoie la **clé brute** si absente (pas de repli) | `app.config.json`, `hooks/useConfig.ts`, script de comptage |
| **Dates de l'événement** | **PARTIEL** | `app.eventDates` → filtre « pendant la semaine » + libellés des modes (`filters.dateFilterModes`) | Repli backend `2026-09-25` / `2026-10-04` dans `baserow-mapping.util.ts:72-73` (≠ dates du JSON : valeur trompeuse si la config est absente). Libellés de repli « Pendant la semaine de ... » dans `EventFiltersBar.tsx:89,128` et `FilterPanel.tsx:49` | `rg` étape 4 |
| **Design : couleurs** | **PARTIEL** | Variables CSS `--color-*-rgb` injectées par `ConfigProvider.tsx:61` depuis `theme.colors` ; Tailwind lit ces variables | Valeurs de repli vertes LGSV dans `tailwind.config.ts:12-29` (utile, mais c'est la « marque par défaut »). `accent-yellow` : **non changé** par le test de la seconde config (étape 3). Ombres `card/popup/cluster` en rgba verts (`tailwind.config.ts:51-53`). `Badge.tsx:24-25` : `#F2EDE4` / `#1F7A3E`. `iconResolver.ts:32` : `#C9C3C1`. Couleur de repli `#D4DDE2` répétée **6 fois** (`EventListView.tsx:68`, `HomePage.tsx:13`, `EventFiltersBar.tsx:326`, `EventMarker.tsx:26`, `FilterPanel.tsx:172`, `EventCard.tsx:32`) | `rg` étape 4 ; capture `05-accueil-seconde-config.png` |
| **Design : polices** | **PARTIEL** | `theme.fonts` → `--font-heading` / `--font-body` (`globals.css:34,45`) | `'Inter'` en dur dans `globals.css:34` ; `index.html` (liens Google Fonts/métadonnées) **réécrit au build** par `scripts/update-index-html.cjs` à partir de la config : une autre carte demande donc **un build différent** | `globals.css`, script de build |
| **Design : rayons / ombres** | **PAS FAIT** | — | Le type prévoit `borderRadius`/`shadows`, le JSON ne les fournit pas, Tailwind ne les lit pas | `app-config.ts`, `tailwind.config.ts` |
| **Carte : centre / zoom / styles** | **EN DUR** | — | Centre France `[2.2137, 46.2276]` zoom `5.5` : `MapView.tsx:290-291` et `DOMTOMInset.tsx:16-17`. Zooms min/max (`3`/`18`) `MapView.tsx:264,277`. Le type prévoit `center/defaultZoom/styles/cluster*` mais le JSON ne les contient pas et rien ne les lit. Fournisseur de géocodage BAN (`api-adresse.data.gouv.fr`) en dur dans `SearchOverlay.tsx:54` : carte limitée à la France | `rg` étape 4 |
| **Territoires DOM-TOM** | **EN DUR** | — | Liste + centres/zooms des 5 territoires : `DOMTOMInset.tsx:16-62` ; noms des régions DOM-TOM redéfinis dans `DOMTOMInset.tsx:90` et `useConfig.ts:53-56` | `rg` |
| **Mapping Baserow (noms de champs)** | **PARTIEL** | `baserow.fieldMapping` dans la config, lu par `transformRecord` | Chaque champ a un **second nom en dur** en repli (`fm.x \|\| 'Ville du lieu'`, etc.) : `baserow.service.ts:289-377`, ≈ 17 occurrences. Le repli masque une config incomplète et ne sert à rien si le champ est renommé. IDs de tables et du champ de modération uniquement par variables d'environnement (donc **une instance backend par carte**). Aucune validation du schéma au démarrage | `baserow.service.ts`, étape 3 §3 |
| **Valeurs de référence (formats, publics, thématiques, partenaires)** | **FAIT** (types) / **PARTIEL** (libellés) | Lues dans Baserow : nom, couleur, picto, partenaires ; options de filtres issues de Baserow (étape 3) | `FALLBACK_LABELS` / `ENUM_MAP` en dur (`useConfig.ts:17,60`) contenant des libellés **LGSV** (« Dégustation ou menu végétal », « Cuisine végétale », `useConfig.ts:19,32`) ; modalités (présentiel/en ligne/hybride) en dur dans `DEFAULT_MODALITY_MAP` ; hybride rabattu sur présentiel (étape 3) | `useConfig.ts`, `baserow-mapping.util.ts` |
| **Régions** | **EN DUR** | — | Liste des régions + groupes métropole/DOM-TOM : `useConfig.ts:39-58` ; table département→région : `geocoding.service.ts:149-152` et suivantes | `rg` |
| **Filtres affichés** | **PARTIEL** | Modes de date via `filters.dateFilterModes` | Les groupes de filtres (partenaires, type, thématiques, public, code postal, région, passés) sont **toujours** tous affichés (`FilterPanel.tsx`, `EventFiltersBar.tsx`) ; ni activation par config ni ordre configurable. `showPastEvents` / `defaultModality` existent dans le type, pas dans le JSON | `app-config.ts`, `app.config.json` |
| **Choix de la config au runtime** | **PARTIEL** | Backend : `APP_CONFIG_PATH` ou chemins candidats → **1 config par processus backend** (testé étape 3 : une 2ᵉ config change thème, polices, textes, dates sans toucher au code) | Pas de sélection de profil côté front ; pas d'hébergement de plusieurs cartes dans un même déploiement ; `VITE_MAPTILER_KEY` est une variable **morte** (aucune lecture dans `src/`) | étape 3 §N cartes ; `rg import.meta.env` → seul `VITE_API_URL` (`services/api.ts:12`) |
| **Déploiement multi-instance** | **PAS FAIT** | — | `deploy/docker-compose.prod.yml` utilise encore des variables `AIRTABLE_*` ; les Dockerfiles ne copient pas `app.config.json` ; build avec `--frozen-lockfile` alors que le lockfile est périmé ; `pnpm build` est cassé (4 erreurs TS, `types/event.ts:12`). **NON VÉRIFIÉ** par un `docker build` réel | étape 1 ; lecture de `deploy/` |
| **Types partagés ↔ config** | **PARTIEL** | `AppConfig` est un bon schéma cible | Il est **plus riche** que le JSON réel et n'est **pas validé** à l'exécution (aucun schéma/zod : une clé manquante donne `undefined` ou la clé brute) ; `shared/types` n'exporte plus `EventTheme/EventType/EventFormat/TargetAudience` alors que `apps/frontend/src/types/event.ts:12` les importe | `app-config.ts`, `tsc -b` (étape 1) |

### Lecture d'ensemble

- **Réellement fait** : séparation du back (Baserow, plus Airtable dans le code), config JSON servie par API, thème par variables CSS, référentiels et couleurs/pictos venant de Baserow, 1 config → 1 carte vérifiée en pratique.
- **Fondations posées mais pas branchées** : le type `AppConfig` (map, textes par page, rayons, ombres, `showPastEvents`, `defaultModality`) décrit la cible, mais le JSON, le front et le back n'en consomment qu'une partie. C'est le principal levier : **brancher ce qui est déjà typé**.
- **Pas commencé** : bloc `features`, validation de config, validation du schéma Baserow, sélection de profil côté front, déploiement multi-cartes.

## 2. Liste des éléments codés en dur (fichier:ligne)

| # | Catégorie | Emplacement | Contenu |
|---|---|---|---|
| H1 | Marque | `Header.tsx:18-21,37` | « SEMAINE / VÉGÉTALE », `contact@semaine-vegetale.fr` |
| H2 | Marque | `Footer.tsx:13,24,37` | `semaine-vegetale.fr`, e-mail, « • 2026 » |
| H3 | Marque | `EventListView.tsx:88,108` | « LGSV 2026 » |
| H4 | Marque | `EventCard.tsx:127`, `EventPopup.tsx:67` | Badge « semaine LGSV » (commentaire, logique liée à la semaine) |
| H5 | Libellés | `EventFiltersBar.tsx:89,128`, `FilterPanel.tsx:49` | « Pendant la semaine de ... » |
| H6 | Libellés | `useConfig.ts:17-36` | `FALLBACK_LABELS` (formats/thématiques LGSV) |
| H7 | Couleurs | `Badge.tsx:24-25` | `#F2EDE4`, `#1F7A3E` |
| H8 | Couleurs | `iconResolver.ts:32` | `#C9C3C1` |
| H9 | Couleurs | 6 fichiers (voir §1) | `#D4DDE2` dupliqué |
| H10 | Couleurs | `tailwind.config.ts:12-29,51-53` | Valeurs de repli + ombres vertes |
| H11 | Police | `globals.css:34` | `'Inter'` |
| H12 | Carte | `MapView.tsx:264,277,290-291` | Centre France, zoom 5.5, bornes 3/18 |
| H13 | Carte | `DOMTOMInset.tsx:16-62,90` | 5 territoires, centres, zooms |
| H14 | Carte | `SearchOverlay.tsx:54` | API BAN (France seulement) |
| H15 | Régions | `useConfig.ts:39-58` ; `geocoding.service.ts:149+` | Régions, groupes, département→région |
| H16 | Dates | `baserow-mapping.util.ts:72-73` | `2026-09-25` / `2026-10-04` |
| H17 | Baserow | `baserow.service.ts:289-377` | ≈ 17 noms de champs FR de repli |
| H18 | Baserow | `baserow.service.ts:333` | Titre de repli « Événement sans titre » |
| H19 | Baserow | `baserow.service.ts` (`fetchLinkedTableMap`) | Convention `tableName + '_ID'` pour les tables liées |
| H20 | Config | `app.config.json` | Pas de `features`, `map`, `texts.{map,list,detail,filters,footer}` |
| H21 | Textes | 19 fichiers `.tsx` | ≈ 122 textes UI (voir §1) |
| H22 | Env | `VITE_MAPTILER_KEY` | Variable documentée mais jamais lue (code mort/documentation trompeuse) |

## 3. COMPARATIF (JNR, avant refonte) vs `main` — matrice de fonctionnalités

Mesure : nombre de fichiers `src/` (hors specs) contenant le mot-clé, COMPARATIF → `main`. `0` = **absent de `main`**. Contrôle détaillé là où c'était nécessaire.

| Fonctionnalité (COMPARATIF) | COMPARATIF → main | Nature | À qualifier |
|---|---|---|---|
| Partage d'un événement (`ShareEventButton`, `shareEvent`) | 2 → 0 | **Générique** (utile à toute carte) | Candidat flag `features.share` |
| Géolocalisation « Me localiser » (`useGeolocation`) | 3 → **présent en ligne** dans `SearchOverlay.tsx:129` (`navigator.geolocation`) | **Générique** — non perdu, simplement non extrait en hook | Aucune perte |
| Statistiques de compteurs (`@Get('stats')`, `EventsCountStats`) | 2 → 0 (route `stats` absente) | Spécifique/optionnel (bandeau de chiffres) | Flag `features.stats` |
| Trophées (`isTrophy`, `TrophyBadge`) | 9 → 0 | **Spécifique JNR** | Flag `features.trophies` + champ mappé, ou abandon |
| Labels/logos (`labels`, `LabelLogos`) | 6 → 0 | Spécifique JNR (labels de qualité) | Flag `features.labels` |
| Visibilité sur la carte (`visibleOnMap`) | 3 → 0 | Spécifique (événements non cartographiés) | Via mapping optionnel |
| Inscription requise (`requiresRegistration`) | 2 → 0 | Générique possible | Mapping optionnel |
| Type d'organisateur (`organizerType`) | 3 → 0 | Générique possible (filtre) | Mapping optionnel + filtre configurable |
| Image d'en-tête événement (`EventHeroImage`, `imageUrl`) | 2 → 0 | Générique possible | Flag `features.eventImage` |
| Page d'erreur de routes (`RouteErrorPage`) | 2 → 0 | **Robustesse générique** | À reprendre (sans flag) |
| Recherche d'événements (`eventSearch`) | 2 → 0 | Générique | À vérifier : `SearchBar.tsx` existe dans `main` (équivalent partiel ? **NON VÉRIFIÉ**) |
| Mise en page de popup / overlays / padding carte (`popupLayout`, `mapOverlays`, `mapViewPadding`, `useMapContainerSize`) | 1–3 → 0 | Refactoring interne (découpage) | `MapView` passe de 539 à 296 lignes dans `main` : à considérer comme refonte, pas comme perte |

Conclusion de la matrice : `main` n'a pas « tout perdu » ; **la plupart des écarts sont soit des fonctions propres à JNR, soit des extractions de code**. En revanche, **deux fonctions génériques de COMPARATIF manquent** (partage, page d'erreur de routes) et **aucun mécanisme de feature flag** n'existe pour réintroduire proprement les fonctions optionnelles — c'est le vrai manque de la refonte, pas leur absence individuelle.

Ce qui existe dans `main` et pas dans COMPARATIF (acquis de la refonte) : backend Baserow, `AppConfigService` + `GET /api/config`, `ConfigProvider`, thème par variables CSS, `fieldMapping`, résolution d'icônes/couleurs depuis Baserow, découpage du frontend (fichiers plus petits), scripts de seed/robustesse (cet audit).

## 4. Réponses aux questions de l'étape

- **Fait / partiel / pas fait / en dur** : voir §1 (statuts par axe) et §2 (22 points en dur).
- **Ce qu'il manque pour « 1 config = 1 carte »** : (1) bloc `features`, (2) brancher `map`/`texts.*`/`borderRadius`/`shadows` déjà typés, (3) retirer la marque LGSV du code, (4) valider la config et le schéma Baserow au démarrage, (5) fournir `app.config.json` dans l'image Docker et choisir le profil au runtime, (6) supprimer les noms de champs de repli du backend.
- **Non vérifié** : fonctionnalités des 4 autres copies ; équivalence exacte de la recherche d'événements ; comportement d'un `docker build` ; rendu mobile.
