# AGENTS.md — racine (make-map)

Ce dépôt suit le format ouvert [AGENTS.md](https://agents.md/) : instructions dédiées aux agents de code, complémentaires au [README.md](./README.md) humain. Les agents lisent en priorité l'`AGENTS.md` **le plus proche** du fichier modifié (liens en bas). Ces fichiers `AGENTS.md` sont la **seule** source de consignes pour les agents.

## Philosophie de la refonte (à respecter pour tout changement)

Ce dépôt est **1 seul code pour N cartes** d'événements (une carte = un événement : dates, marque, titres, données propres). Il remplace des copies du projet adaptées à la main, qui ont dérivé. Chaque changement doit rapprocher le code de ce modèle, jamais l'en éloigner.

1. **Un code, N cartes.** Aucune branche, copie de dossier ni `if (carte === …)` par événement. Ce qui diffère d'une carte à l'autre vit dans **le fichier de config de la carte** (`app.config.json`) ou dans **Baserow**, jamais dans le code.
2. **Ce que porte la config** : identité de l'événement (nom, URL, e-mail de contact, logo), **titres et noms de l'événement** (clés `texts.*` existantes : `meta`, `home`), **dates**, **design** (couleurs, polices, rayons, ombres), et **correspondance avec le schéma Baserow** (`baserow.fieldMapping`, `baserow.mapping`).
3. **Le wording générique de l'interface reste en dur, en français** (boutons, placeholders, libellés de contrôles). Seuls les titres et noms propres à l'événement passent par la config. La **carte et les régions** restent dans le code.
4. **Pas de flags de fonctionnalités** : on prend toutes les fonctionnalités, pour toutes les cartes. Aucun filtre n'est masquable par la config ; seuls les filtres dont la table Baserow est vide se masquent d'eux-mêmes. Ne pas ajouter de `features.*`.
5. **Aucun nom de champ Baserow en dehors du mapping.** Les noms de colonnes et les valeurs des listes de choix viennent de la config ; pas de valeur de repli française dans le code (`fm.x || 'Ville du lieu'` est interdit). Les identifiants de tables restent dans l'environnement du backend. Il n'y a **pas de schéma cible** : la carte doit fonctionner avec le schéma indiqué par la config.
6. **Les référentiels viennent de Baserow** (formats, publics, thématiques, partenaires : libellés, couleurs, pictos, logos). Pas de liste de libellés métier dans le code.
7. **Dégradation propre, jamais de casse silencieuse.** Un champ renommé, une table absente, une config incomplète ou un champ de modération manquant ne doivent ni faire planter la carte (HTTP 500 inutile), ni la rendre publique par défaut, ni vider des données **sans avertissement**. Valider la config et le schéma au démarrage, journaliser clairement, appliquer un repli explicite.
8. **Codé en dur = refus en revue.** Voir la checklist ci-dessous. Si un compromis est inévitable, l'inscrire dans le plan ([docs/audit/PLAN-FIN-REFONTE.md](./docs/audit/PLAN-FIN-REFONTE.md)) plutôt que le cacher.

> **Écart connu entre ces règles et le code actuel** : la refonte est **presque terminée** côté code (vérification du 2026-10-19 : [docs/verdict.md](./docs/verdict.md)). Restent des résidus listés avec `fichier:ligne` dans le verdict et planifiés dans [docs/audit/PLAN-FIN-REFONTE.md](./docs/audit/PLAN-FIN-REFONTE.md) : couleurs de marque dans `Badge.tsx`, palette de marque par défaut en CSS, cas dégradés des pages carte et liste. Les **tests automatisés « deux cartes »** (`apps/backend/src/config/deux-cartes.spec.ts`, `apps/frontend/tests/deux-cartes.spec.tsx`) sont rétablis : les garder verts. Ne pas copier ces patterns existants : ce sont des dettes, pas des modèles. État et prochaine action : [docs/audit/SUIVI.md](./docs/audit/SUIVI.md).

## Règles globales (tout le monorepo)

1. **Baserow** : **lecture seule** depuis l'application (le backend ne fait que des `GET`) ; jeton uniquement côté backend (`BASEROW_API_TOKEN`), jamais dans le front ni dans le dépôt. Exception documentée : les scripts de `scripts/seed-baserow/` écrivent dans une instance **Docker locale jetable** (ne jamais les pointer vers un Baserow réel).
2. **Modération** : un événement n'est public que s'il porte la valeur de modération configurée (`baserow.moderationVisibleValue`). En cas de doute (champ manquant, valeur vide), **masquer**, ne pas publier. Le mode `devMode` ne doit pas être accessible publiquement en production.
3. **Langue** : interface et libellés **en français** ; code, commentaires techniques et noms d'identifiants peuvent rester en anglais.
4. **Git** : voir « Workflow Git » ci-dessous.
5. **Portée** : changements ciblés ; pas de refactor gratuit hors demande.
6. **Preuves** : pour une affirmation sur l'état du projet, donner un `fichier:ligne` ou une commande exécutée ; sinon écrire « non vérifié ».

## Workflow Git

- `main` : stable, jamais de commit direct, mise à jour seulement depuis `develop` par PR, avec un tag à chaque jalon.
- `develop` : branche d'intégration. Les branches de travail partent de `develop`, sont courtes (une par sujet), nommées en `kebab-case` avec un préfixe de type (`feat/`, `fix/`, `refactor/`, `chore/`, `docs/`, `test/`), sans doublon, et supprimées après merge.
- Commits atomiques au format Conventional Commits : `type(scope): sujet` (type en anglais, sujet court en français à l'impératif, 72 caractères maximum). Scopes : `front`, `back`, `types`, `config`, `docs`, `deploy`, `scripts`. Le hook `husky` lance `pnpm test` à chaque commit ; ne jamais utiliser `--no-verify`.
- Une PR par branche, vers `develop`, petite et lisible. `git rebase develop` avant la PR. Merge par **merge commit** (`--no-ff`). Pas de force-push sur `main` ni `develop` ; `--force-with-lease` seulement sur sa propre branche.
- Aucune PR n'est mergée avec des tests rouges.

## Définition de terminé (checklist de PR)

Cette checklist est reprise dans le modèle de PR [`.github/pull_request_template.md`](./.github/pull_request_template.md) : si l'une change, mettre l'autre à jour.

- [ ] Aucun titre, nom de marque, date, e-mail/URL, couleur ou police propre à une carte dans le code (`rg -i "lgsv|semaine|végétal|#[0-9a-f]{6}"` sur les fichiers modifiés). Le wording générique de l'interface reste en dur.
- [ ] Aucun nom de champ Baserow ni valeur de liste de choix ajouté hors de la config ; aucun libellé de référentiel métier en dur.
- [ ] Nouveau **titre ou nom d'événement** → clé dans `texts.*` (type `AppConfig` + `app.config.json`), avec repli lisible si la clé manque. Le nom de l'événement s'écrit **une seule fois** (`app.name`) ; les autres titres le reprennent par gabarit (`"Carte - {{app.name}}"`).
- [ ] Pas de flag `features.*` ni de `if (carte === …)`.
- [ ] Cas dégradés couverts : donnée absente, champ renommé, config incomplète, API en erreur (pas de `Invalid Date`, pas de clé brute affichée, pas de 500 inutile).
- [ ] Types partagés (`shared/types`) mis à jour **avant** les consommateurs ; `pnpm build` de la racine passe.
- [ ] `pnpm lint` et `pnpm test` passent depuis la racine (0 erreur ; les avertissements connus sont listés dans « Commandes »).
- [ ] Aucune variable d'environnement morte ou non documentée ; `.env.example` à jour.
- [ ] Si le changement touche l'identité ou la config : vérifié avec **une seconde config** (voir `docs/audit/fixtures/`), sans toucher au code. Les tests « deux cartes » (`apps/backend/src/config/deux-cartes.spec.ts`, `apps/frontend/tests/deux-cartes.spec.tsx`) le font automatiquement pour les titres, les dates et le thème : les garder verts, et les étendre si une nouvelle clé de config pilote l'affichage.
- [ ] Docs concernées mises à jour (README de la zone, `docs/audit/SUIVI.md`).

## Où travailler : fichiers AGENTS par zone

| Zone | Fichier |
| --- | --- |
| Frontend React + carte | [apps/frontend/AGENTS.md](./apps/frontend/AGENTS.md) |
| API NestJS + Baserow + géocodage | [apps/backend/AGENTS.md](./apps/backend/AGENTS.md) |
| Types partagés `@make-map/types` (dont le type `AppConfig`) | [shared/types/AGENTS.md](./shared/types/AGENTS.md) |
| Déploiement Docker / Scaleway | [deploy/AGENTS.md](./deploy/AGENTS.md) |
| Plan de refonte, bilan, constats prouvés | [docs/README.md](./docs/README.md) (index) ; commencer par [docs/audit/SUIVI.md](./docs/audit/SUIVI.md) puis [docs/audit/PLAN-FIN-REFONTE.md](./docs/audit/PLAN-FIN-REFONTE.md) |

## Commandes (depuis la racine)

| Objectif | Commande |
| --- | --- |
| Frontend + backend | `pnpm dev` |
| Frontend seul / backend seul | `pnpm front:dev` · `pnpm back:dev` |
| Build / lint / tests | `pnpm build` · `pnpm lint` · `pnpm test` |
| Baserow local jetable + données de test | voir [docs/audit/BASEROW-LOCAL.md](./docs/audit/BASEROW-LOCAL.md) |

Qualité (session 7) : `pnpm lint` couvre le frontend (ESLint, 3 avertissements connus), le backend (ESLint + Prettier, **sans** `--fix` ; `pnpm lint:fix` dans `apps/backend` pour corriger volontairement) et `shared/types` (`tsc --noEmit`). `pnpm test` couvre `shared/types` (contrat `AppConfig`), le backend et le frontend. Aucun de ces scripts ne modifie de fichier.

Limites connues (preuves dans [docs/audit/JOURNAL.md](./docs/audit/JOURNAL.md)) : `pnpm build` génère `apps/frontend/index.html` (ignoré par git) depuis `index.template.html` : le modèle n'est jamais modifié ; le test e2e `apps/backend/test/app.e2e-spec.ts` est le modèle Nest périmé (il attend « Hello World! » sur `/` ; `pnpm test:e2e` échoue, constaté en session 7) et n'est pas lancé par `pnpm test`. Ne pas contourner un échec sans le dire.

Environnement : `apps/backend/.env.example` et `apps/frontend/.env.example` (le backend lit `BASEROW_API_URL`, `BASEROW_API_TOKEN`, `BASEROW_EVENT_TABLE_ID`, `BASEROW_MODERATION_FIELD_ID`, `BASEROW_PARTNERS_TABLE_ID`, `BASEROW_THEMATIQUES_TABLE_ID`, `BASEROW_FORMATS_TABLE_ID`, `BASEROW_PUBLICS_TABLE_ID`, `PORT`, `CORS_ORIGIN`, `APP_CONFIG_PATH`, `ALLOW_DEV_MODE`).

## Documentation associée

- [docs/README.md](./docs/README.md) — index de la documentation de la refonte.
- [docs/verdict.md](./docs/verdict.md) — vérification de la philosophie, état global.
- [docs/audit/PLAN-FIN-REFONTE.md](./docs/audit/PLAN-FIN-REFONTE.md) — plan actif pour finir la refonte.
- [docs/audit/PLAN-SESSIONS.md](./docs/audit/PLAN-SESSIONS.md) — workflow Git détaillé, décisions, historique des sessions.
- [docs/audit/PERIMETRE-CONFIG-BASEROW.md](./docs/audit/PERIMETRE-CONFIG-BASEROW.md) — qui porte quoi (config, Baserow, code, environnement).
- [docs/audit/SUIVI.md](./docs/audit/SUIVI.md) — état d'avancement, décisions, prochaine action.
- [PROJECT_VIBE_CONF.md](./PROJECT_VIBE_CONF.md) — type de projet.
