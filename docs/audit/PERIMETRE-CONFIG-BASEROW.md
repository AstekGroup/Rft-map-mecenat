# Périmètre : ce qui vit dans la config, dans Baserow, dans le code, dans l'environnement

État au 2026-10-19 (après les sessions 0 à 7). Contrat des clés de config : `shared/types/src/app-config.ts` (type `AppConfig`). Règles de contribution : [../../AGENTS.md](../../AGENTS.md). Suivi : [SUIVI.md](SUIVI.md).

## 1. Les quatre zones

| Zone | Qui la modifie, quand | Ce qu'on y met |
|---|---|---|
| **Fichier de config** (`app.config.json`) | Équipe produit ou dev, à la création d'une carte | Identité et titres de l'événement, dates, design (couleurs, polices, rayons), libellés des modes de période, correspondance avec le schéma Baserow |
| **Baserow** | Organisateurs, modérateurs, admin de la base, sans déploiement | Événements ; référentiels (formats, publics, thématiques, partenaires) avec libellés, couleurs, pictos, logos ; ordre des options (ordre des lignes) |
| **Code** (assumé) | Développeurs | Wording générique de l'interface (français), logique, carte (centre, zoom, fonds, DOM-TOM), régions, géocodage |
| **Variables d'environnement** | Exploitation | Jeton, URL et identifiants des tables Baserow, identifiant du champ de modération, CORS, port, chemin de la config, mode dev |

Arbre de décision pour un cas nouveau :

1. Secret ou identifiant d'infrastructure : **environnement**.
2. Contenu saisi ou référentiel métier que des non-développeurs doivent pouvoir changer : **Baserow**.
3. Propre à l'événement (son nom, ses dates, sa charte, le nom d'une colonne Baserow) et décidé une fois par carte : **config**.
4. Wording d'interface générique (« Voir la carte », placeholders) ou logique : **code**, en français.
5. Fonctionnalité à activer ou désactiver : **non** (pas de flags, voir §5).

Cas limite assumé : `texts.home` mélange contenu de marque (`mainTitle`, `mainDescription`, `infoTitle`, `infoDescription`) et wording (`ctaText`, `seeAll`, `nearbySubtitle`, `sectionPresentiel`, `editionLabel`). On n'ajoute pas de nouvelle clé de wording à la config et on n'en retire pas.

## 2. Ce que porte la config (et comment)

| Rubrique | Clés | Remarques |
|---|---|---|
| Identité | `app.name`, `app.shortName`, `app.description`, `app.url`, `app.locale`, `profile` | Le nom de l'événement s'écrit **une seule fois** (`app.name`) ; les autres chaînes le reprennent par gabarit : `"Carte - {{app.name}}"`. Un placeholder inconnu donne une chaîne vide et un avertissement dans les logs. |
| Dates | `app.eventDates.weekStart`, `weekEnd` | Obligatoires, validées au démarrage ; plus de repli de dates. |
| Titres | `texts.meta` (titre, description, Open Graph), `texts.home` | Un titre manquant a un repli lisible, jamais la clé brute. |
| Période | `filters.dateFilterModes` | Libellés des modes ; le mode « pendant l'événement » n'existe que si la config le libelle. |
| Design | `theme.colors`, `theme.fonts`, `theme.borderRadius` | Injectés en variables CSS par `ConfigProvider`. Des valeurs par défaut existent encore dans `globals.css` et `tailwind.config.ts` (palette de marque à neutraliser, [PLAN-FIN-REFONTE.md](PLAN-FIN-REFONTE.md) étape 3). |
| Schéma Baserow | `baserow.fieldMapping` (rôle de colonne vers nom de colonne, toutes les clés obligatoires), `baserow.mapping.referenceFields` (colonnes des tables de référence), `baserow.mapping.modality` (valeur de la liste « modalité » vers modalité de l'application), `baserow.mapping.tariffFreeValue`, `baserow.moderationVisibleValue` | Aucun nom de colonne ni valeur de liste de choix dans le code. |

Validation : la config est contrôlée au démarrage du backend (`apps/backend/src/config/config-validation.util.ts`) ; une config invalide empêche le démarrage avec la liste des erreurs, un `APP_CONFIG_PATH` qui ne désigne aucun fichier aussi. Le schéma Baserow est comparé à la config au démarrage et à chaque chargement : colonne absente nommée, colonne proche suggérée. Les métadonnées de `index.html` sont écrites **à la compilation** (`apps/frontend/scripts/update-index-html.cjs`) : une compilation par carte.

## 3. Ce que porte Baserow

| Élément | Remarque |
|---|---|
| Événements | Flux : formulaire public, table, modérateur passe la modération à la valeur `moderationVisibleValue`. Valeur absente ou vide : masqué. |
| Couleurs | Table `Couleurs` (nom, code hexadécimal) administrée par les admins : ils choisissent une couleur **par son nom** dans chaque référentiel (colonne de lien) et n'écrivent jamais de code. Le backend ne lit pas cette table : il lit la colonne de recherche (`referenceFields.color`, ex. `Couleur (hexa)`) de chaque référentiel. Guide, migration et palette de 100 couleurs : [../baserow/couleurs.md](../baserow/couleurs.md). Aucune variable d'environnement. |
| Référentiels | 4 tables lues par le backend. Libellé, couleur et picto d'un format, logo d'un partenaire. Le filtre d'un référentiel vide se masque ; un référentiel **en erreur** reste affiché avec un message (502 côté API, `/api/health` `degraded`). |
| **Contrat du picto** | La valeur de la colonne `Picto` doit être un nom d'icône `lucide-react` exact (PascalCase, ex. `PenTool`) ; un nom inconnu donne l'icône de repli. L'acceptation de la forme kebab-case de lucide.dev (`pen-tool`) est planifiée ([PLAN-SESSIONS.md](PLAN-SESSIONS.md), Améliorations). Une couleur invalide donne le gris de repli. |
| Ordre des options | Ordre des lignes de la table (plus de tri alphabétique). |
| Format d'un événement | Un seul format retenu ; avertissement dans les logs s'il y en a plusieurs. |
| Régions | Pas dans Baserow : déduites du code postal puis du géocodage. |

Il n'existe **pas de schéma cible** : la carte doit fonctionner avec le schéma indiqué par la config. Le schéma du seed local ([BASEROW-LOCAL.md](BASEROW-LOCAL.md)) est une référence de test, pas une vérité sur la base de production.

## 4. Filtres

Une **seule définition** (`apps/frontend/src/utils/filterDefinitions.ts`, `FILTER_DEFINITIONS`) pour le panneau de la carte (`FilterPanel`) et la barre de la liste (`EventFiltersBar`) : mêmes filtres, même ordre, mêmes titres, mêmes règles. La recherche et le bouton « événements passés » sont hors liste, toujours affichés.

| Filtre | Source des options | Masqué quand |
|---|---|---|
| Modalité | code (tous, présentiel, en ligne) | jamais (retrait de la carte planifié, étape 6 du plan actif) |
| Période | `filters.dateFilterModes` (config) | jamais |
| Partenaires, Type d'événement, Thématiques, Public cible | Baserow (référentiels) | référentiel vide ; **pas** s'il est en erreur |
| Code postal, Région | saisie, liste de régions du code | modalité « en ligne » (sauf filtre déjà actif) |

Règles : recherche multi-champs (titre, description, ville, organisateur, région, lieu) ; « pendant l'événement » = recoupement de la période ; événements passés visibles par défaut une fois l'événement terminé ; titres des groupes en dur (wording générique). Tests : `filtresUnifies.spec.tsx` et `utils/eventFilters`.

## 5. Fonctionnalités activables : non

Pas de flags `features.*` : toutes les fonctionnalités sont actives pour toutes les cartes. Seuls les filtres dont le référentiel Baserow est vide se masquent d'eux-mêmes. Piste conservée pour plus tard, **hors plan** : activation déduite des données (par exemple masquer les fonctions « en ligne » s'il n'y a aucun événement en ligne), avec les garde-fous suivants : distinguer « vide » de « en erreur », ne pas faire clignoter l'interface selon le moment où un modérateur accepte un événement, calcul côté backend, tout comportement automatique journalisé.

## 6. Variables d'environnement

| Variable | Rôle |
|---|---|
| `BASEROW_API_URL`, `BASEROW_API_TOKEN` | accès Baserow (backend uniquement) |
| `BASEROW_EVENT_TABLE_ID`, `BASEROW_PARTNERS_TABLE_ID`, `BASEROW_THEMATIQUES_TABLE_ID`, `BASEROW_FORMATS_TABLE_ID`, `BASEROW_PUBLICS_TABLE_ID` | identifiants des tables |
| `BASEROW_MODERATION_FIELD_ID` | identifiant du champ de modération (absent : rien n'est publié) |
| `ALLOW_DEV_MODE` | autorise `?devMode=true` hors production uniquement |
| `APP_CONFIG_PATH` | chemin de la config (absolu recommandé) ; lu aussi à la compilation du frontend |
| `PORT`, `CORS_ORIGIN` | serveur |
| `VITE_API_URL` | URL de l'API pour le frontend |

Liste de référence : `apps/backend/.env.example` et `apps/frontend/.env.example`.
