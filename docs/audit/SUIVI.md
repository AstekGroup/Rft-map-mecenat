# SUIVI — Bilan de la refonte (carte interactive multi-cartes)

> **À lire en début de session. À mettre à jour en fin de session.**
> Branche de travail : `audit/bilan-refonte` (aucun commit sur `main`).
> Preuves : voir [JOURNAL.md](JOURNAL.md). Livrables : un fichier par étape dans ce dossier.

> **Vue d'ensemble condensée de tout le bilan : [SYNTHESE.md](SYNTHESE.md).**

## Convention de preuve

Chaque constat porte un statut et une preuve :

| Statut | Sens |
|---|---|
| `FAIT` | Implémenté et piloté par config/Baserow, vérifié |
| `PARTIEL` | Implémenté en partie (précisé) |
| `PAS FAIT` | Absent |
| `EN DUR` | Fonctionne mais codé en dur (contraire à la philosophie) |
| `NON VÉRIFIÉ` | Pas de preuve disponible (obligatoire si pas de preuve) |

Preuve = `fichier:ligne` ou commande + extrait de sortie (dans JOURNAL.md).

## Philosophie cible (rappel)

1 seul code pour N cartes · 1 fichier de config par carte (features, titre, textes, dates, design) · données de référence et structure pilotées par Baserow · un changement de structure Baserow ne doit pas casser la carte.

## État des étapes

| # | Étape | État | Livrable | Dernière mise à jour |
|---|---|---|---|---|
| 0 | Initialisation | **fait** | [00-inventaire.md](00-inventaire.md) | 2026-10-16 |
| 1 | Lancement local | **fait** | [01-lancement.md](01-lancement.md) | 2026-10-16 |
| 2 | Baserow + seed | **fait** | [02-baserow-seed.md](02-baserow-seed.md) | 2026-10-16 |
| 3 | Validation fonctionnelle | **fait** (limites : mobile, partage, Docker) | [03-validation.md](03-validation.md) | 2026-10-16 |
| 4 | Cartographie statique | **fait** | [04-cartographie.md](04-cartographie.md) | 2026-10-16 |
| 5 | Branches non mergées | **fait** (2 passes ; merge d'essai des 2 branches `Refonte-*` : 61/61 tests front) | [05-branches.md](05-branches.md) | 2026-10-16 |
| 6 | AGENTS.md | **appliqué, non commité, à valider** | [06-agents.md](06-agents.md) · [06-agents.diff](06-agents.diff) | 2026-10-16 |
| 7 | Plan de suite | **fait, révisé** (périmètre du 16/10, voir note en tête) | [07-plan-de-suite.md](07-plan-de-suite.md) | 2026-10-16 |
| 8 | Périmètre config vs Baserow (+ filtres) | **fait** (décisions Q-F1…Q-F7 à prendre) | [08-perimetre-config-vs-baserow.md](08-perimetre-config-vs-baserow.md) | 2026-10-16 |

## Plan de refonte en 9 sessions (voir [PLAN-SESSIONS.md](PLAN-SESSIONS.md))

| Session | État (2026-10-16) |
|---|---|
| 0 GitHub CLI | **faite** : `gh` 2.102.0, connecté (`ClementTro`, droit ADMIN) |
| 1 Base Git | **faite** : PR #9 à #14 mergées dans `develop` ; `pnpm build` et `pnpm test` verts sur `develop`. Reste : PR `develop` → `main` et tag `v0.1.0` (validation du propriétaire). |
| 2 Nettoyage et intégration | **faite** : PR unique #21 `chore/session-2-unifiee` mergée dans `develop` (commit `7c9e01c`, constaté en début de session 3 ; elle regroupait `docs/agents`, `chore/remove-airtable`, `chore/remove-dead-code`, `merge/refonte-unifier-outils-carte`, `merge/refonte-panneau-lateral` ; PR #15 à #20 fermées). Preuves dans JOURNAL. |
| 3 Titres et identité pilotés par la config | **faite** : PR #22 (`feat/config-titres-identite`), #23 et #24 mergées dans `develop` (constaté en début de session 4). Gabarits `{{app.name}}` dans la config (backend), badge d'édition et libellés de période depuis la config, plus de repli de dates, `index.html` généré (idempotent), vérifié avec la seconde config. Preuves dans JOURNAL. |
| 4 Baserow réglable par la config, config validée | **faite, PR #25, #26 et #27 mergées dans `develop`** (branches supprimées). `AppConfig` aligné ; 29 replis de noms de colonnes supprimés (colonnes de référence, valeurs de modalité, tarif gratuit et modération lus dans `baserow.mapping` / `moderationVisibleValue`) ; config validée au démarrage (le backend refuse de démarrer avec la liste des erreurs) ; colonnes de Baserow comparées à la config au démarrage et à chaque chargement (colonne absente nommée, colonne proche suggérée) ; seed adapté (`--config`). Vérifié sur le Baserow local : renommer une colonne puis adapter la config suffit (1250 événements, 1106 avec ville). Preuves dans JOURNAL. |
| 5 Filtres | **faite, 2 PR empilées à merger dans l'ordre** vers `develop` (merge commit) : [#29](https://github.com/AstekGroup/Rft-map-mecenat/pull/29) `refactor/filtres-unifies`, puis [#30](https://github.com/AstekGroup/Rft-map-mecenat/pull/30) `fix/filtres-regles`. Une seule définition des filtres (`FILTER_DEFINITIONS`) pour le panneau de la carte et la barre de la liste (mêmes 8 filtres, vérifié dans le navigateur) ; règles : recherche multi-champs, « pendant l'événement » par recoupement, événements passés visibles automatiquement une fois l'événement terminé, un seul format (avertissement si plusieurs), ordre des options = ordre Baserow, référentiel en erreur ≠ vide (502, `/api/health` `degraded`, filtre affiché avec un message). Preuves dans JOURNAL. |
| 6 à 8 | non commencées |

**Reporté (décision du propriétaire)** : la PR `develop` → `main` et les tags (`v0.1.0`, `v0.2.0`, …) ne sont pas faits ; on reste sur `develop`.

Prochaine action : merger, **dans cet ordre** et avec l'option « Create a merge commit », la PR #28 (suivi de la session 4), puis #29 et #30 (session 5) vers `develop` ; puis lancer la **session 6** (cas dégradés). Attention : à partir de cette session, une config invalide empêche le backend de démarrer ; toute config de carte doit contenir `baserow.mapping` (voir `app.config.json`). Restent aussi (propriétaire) : fermer les PR #7 et #8 si elles ne sont pas marquées mergées, supprimer `wip/audit-snapshot`, et demander à l'auteur l'accord pour supprimer les 3 branches obsolètes `add-dynamic-filters`, `modify-audiences-filters`, `modif_audience_filters`. PR `develop` → `main` et tags : reportés.

Points relevés en session 3 pour la suite : `APP_CONFIG_PATH` invalide retombe silencieusement sur le fichier par défaut côté backend (**résolu en session 4** : erreur au démarrage) ; `HomePage` affiche « Édition » sans année si `eventDates` manque (non rejoué), `getText` renvoie la clé brute et un événement sans date affiche « Invalid Date » (constaté dans le navigateur ; session 6) ; le `Dockerfile` frontend devra fournir `app.config.json` et `index.template.html` est le seul modèle suivi (session 8).

Points relevés en session 5 pour la suite : un test frontend (`formatFrDateRangeLabel`, `eventDateRange.spec.ts`) a expiré une fois en exécution parallèle lourde puis est repassé (non reproduit seul : à surveiller) ; `parseDateTime` prend la date dans le fuseau du serveur et l'heure à Paris (session 6, E27) ; `#D4DDE2` reste dupliqué dans 4 autres fichiers du front ; `App.tsx` est du code mort ; une table de référence dont la variable d'environnement est absente reste un avertissement + liste vide (pas une erreur) ; `EventsService.invalidateCache` ne vide que le cache des partenaires parmi les référentiels ; le test e2e `apps/backend/test/app.e2e-spec.ts` est le modèle Nest (attend « Hello World! » sur `/`) : probablement périmé, non vérifié (non exécuté par `pnpm test`) ; l'avertissement multi-format n'a pas été vu à l'écran (le seed n'a aucun événement à plusieurs formats).

Points relevés en session 4 pour la suite : `root AGENTS.md` cite encore les paramètres de carte (centre, zoom…) comme contenu de la config alors que `AppConfigMap` est retiré (la carte reste dans le code) ; une table de référence en erreur renvoie toujours une liste vide (**résolu en session 5**) ; le titre de repli « Événement sans titre » reste en dur (session 6) ; le message d'erreur du rôle `moderation` dit « le champ sera vide » alors que la modération passe par l'ID de champ ; le contrôle de schéma lit une ligne par table (une table vide n'est pas contrôlable : avertissement).

> Les parties ci-dessous (branche `audit/bilan-refonte`, « à commiter », etc.) décrivent l'état au moment de l'audit et sont **périmées** : cette branche est supprimée et le code corrigé est dans les PR de la session 1.

## Point de mi-parcours (étapes 0 à 3, rédigé au début de la session 2)

| Étape | Ce qu'on sait maintenant | Ce qui reste incertain |
|---|---|---|
| 0 Inventaire | Branche `audit/bilan-refonte`, outillage OK, Docker démarré, doc obsolète (`map-interactive`, `DEVPLAN.md`, `BASEROW_TABLE_ID`) | Aucun |
| 1 Lancement | Tests 119/119 OK, `vite build` OK. **`pnpm build` KO** (4 erreurs de types front), lint front sans config, lint back = bruit CRLF + `--fix`, **déploiement Docker non migré** (Airtable, `app.config.json` non copié) | Build Docker non exécuté |
| 2 Baserow + seed | Baserow 2.4.1 local, seed idempotent (36 cas + 1500), API : 1536 / 1250 événements, fuseaux OK. Faille `?devMode=true` publique, cold start 30-50 s | Schéma réel de la prod non fourni (types déduits) |
| 3 Validation | Carte, clusters, filtres, DOM-TOM, iframe OK. Bugs : `Invalid Date`, fin < début, config invalide fail-late, suppression du champ de modération = 500, cache sans invalidation. « 1 code N configs » prouvé pour thème/textes accueil/dates | Mobile, partage, géolocalisation, Safari/Firefox |

Lecture globale : **la base fonctionne** (données, API, carte, filtres), **la philosophie « 1 code N cartes » est atteinte à ~40 %** (thème, accueil, dates, noms de champs) et **la robustesse/déploiement est le point faible** (build, Docker, modération, validation de schéma/config).

Fait en session 2 : étapes 4 à 7 (cartographie, branches, AGENTS.md, plan de suite).

## Décisions prises

- **Périmètre (2026-10-16, propriétaire du projet)** : (1) déploiement et migration de données **hors périmètre** (on repart d'une base vide, nouveau schéma) ; (2) **seuls les titres/noms de l'événement** sont pilotés par la config, le **wording de l'interface reste en dur** ; (3) **pas de fonctionnalités activables** pour l'instant (piste : activation déduite des données) ; (4) **filtres** à cadrer (08 §3). Conséquences : A3/A4/A7/B1/B4/B6/D différés, C2 annulé, `AGENTS.md` à ajuster (08 §7, non fait).
- **Précisions (2026-10-16, soir)** : **pas de schéma cible Baserow** → la carte doit fonctionner avec le schéma indiqué par la config (donc tout nom de colonne et toute valeur de liste de choix doivent être mappables) ; **carte et régions restent dans le code** ; **suppression du code mort** : d'accord mais **hors périmètre** ; **aucune modification de code** pendant cette phase (bilan seulement). Les clés existantes `texts.*` (meta, home) restent dans la config.
- Baserow : instance **locale Docker** créée de zéro (choix utilisateur).
- Référence « avant refonte » : `astek-jnr-map COMPARATIF/` (copie dupliquée pré-refonte, choix utilisateur).
- Branches distantes : 3 sur 5 déjà intégrées dans `main` (SHA différents), 2 petites branches « Refonte » propres et sans conflit (05). Aucune suppression ni merge effectué.
- AGENTS.md (5 fichiers) réécrits **dans l'arbre de travail**, non commités ; `CLAUDE.md` volontairement **non modifié** (décision Q2 attendue).
- Aucun code applicatif modifié pendant le bilan (seuls ajouts : `docs/audit/`, `scripts/seed-baserow/`, `deploy/baserow-local/`, AGENTS.md).

## Blocages / points ouverts

- Docker : CLI présent (26.1.1), démon non démarré au début de la session (voir 00-inventaire.md).
- Le plan initial mentionnait un dossier imbriqué `astek-jnr-map/` : il **n'existe plus** dans le working tree (vérifié par `Test-Path`). Sans objet.

## Questions en attente (voir [07](07-plan-de-suite.md))

Q1 couleur `primary` #AE3B5D (typo ?) · Q2 sort de `CLAUDE.md` · Q3 recherche limitée au titre · Q4 fonctions des copies à réintégrer (fournir les 4 autres copies) · Q5 un déploiement par carte ou multi-cartes · Q6 nom du bloc `features`.

## Prochaine action exacte

1. **Relire** `06-agents.diff` (ou `git diff` des 5 AGENTS.md) : accepter (commit sur `audit/bilan-refonte` + PR) ou refuser (`git checkout --`).
2. Répondre à Q1–Q6.
3. **Jalon J1 « Prod saine »** : **A1, A5, A6 faits** (session 3, voir JOURNAL, non commités, dans l'arbre de travail de `audit/bilan-refonte`). Reste : A2 (lockfile, `package-lock.json`), A3/A4 (déploiement Baserow + config dans les images + `docker build` réel), A7 (`frame-ancestors`), puis A8 (Q1), A9 (Q3), A10.
   Fichiers de code touchés : `apps/frontend/src/types/event.ts`, `pages/MapPage.tsx`, `pages/EventsListPage.tsx`, `apps/backend/src/events/events.controller.ts` (+ spec), `apps/backend/src/baserow/baserow.service.ts` (+ nouveau `baserow.service.spec.ts`), `apps/backend/.env.example`, `scripts/seed-baserow/seed.mjs`. **À séparer de la branche d'audit avant PR** (changements ciblés).
4. Nettoyage de l'environnement si besoin : `docker compose -f deploy/baserow-local/docker-compose.yml down` (ajouter `-v` pour effacer les données de test).
