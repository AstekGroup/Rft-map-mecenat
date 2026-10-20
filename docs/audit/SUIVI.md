# SUIVI — Refonte « 1 code, N cartes »

> **À lire en début de session. À mettre à jour en fin de session.**
> État au **2026-10-19**, sur `develop` après la PR #40. Preuves : [JOURNAL.md](JOURNAL.md). Vérification complète : [../verdict.md](../verdict.md). Plan actif : [PLAN-FIN-REFONTE.md](PLAN-FIN-REFONTE.md). Plan historique et workflow Git : [PLAN-SESSIONS.md](PLAN-SESSIONS.md).

## Philosophie (rappel)

1 seul code pour N cartes · 1 fichier de config par carte (identité et titres, dates, design, correspondance Baserow) · référentiels et données dans Baserow · un changement de structure Baserow ne casse pas la carte. Détail : [../../AGENTS.md](../../AGENTS.md).

## Convention de preuve

Chaque constat porte une preuve : `fichier:ligne` ou commande exécutée. Sans preuve : « non vérifié ».

## Où on en est

Vérifié le 2026-10-19 sur `origin/develop` (`2273bcb`) : `pnpm build`, `pnpm lint` (0 erreur, 3 avertissements connus) et `pnpm run test -- --force` verts (`shared/types` 5 tests, backend 227, frontend 133). Avancement estimé : environ 85 % (code ~95 %, robustesse ~90 %, qualité ~90 %, docs ~75 % avant ce nettoyage, déploiement ~10 %).

| Session | État | PR |
|---|---|---|
| 0 GitHub CLI | faite | — |
| 1 Base Git | faite | #9 à #14 |
| 2 Nettoyage et intégration | faite | #21 (#15 à #20 fermées) |
| 3 Titres et identité par la config | faite | #22, #23, #24 |
| 4 Mapping Baserow, config validée | faite | #25, #26, #27, #28 |
| 5 Filtres | faite | #29, #30, #31 |
| 6 Cas dégradés | faite | #32 |
| 7 Qualité | faite ; tests « deux cartes » et modèle de PR retirés par #38, **retrait annulé** (rétablis à l'étape 1) | #33 à #36, #38 |
| Hors plan | seed à 1000 événements, test des métas, verdict | #37, #39, #40 |
| 8 Déploiement | **non faite, hors du plan actif** | — |

## Plan actif : PLAN-FIN-REFONTE.md

| Étape | Sujet | État |
|---|---|---|
| 0 | Plan dans le dépôt, nettoyage de `docs/`, config Astek supprimée | **fait** (PR `docs/plan-fin-refonte`) |
| 1 | Remettre les tests « deux cartes » et le modèle de PR | **fait** (branche `test/retablir-deux-cartes`) |
| 3 | Résidus en dur (`Badge.tsx`, palette par défaut, gris de repli) | à faire |
| 4 | Cas dégradés restants (config absente sur carte et liste, section Format vide) | à faire |
| 5 | README et `PROJECT_VIBE_CONF.md` neutres | à faire |
| 6 | Filtre Modalité retiré de la carte ; picto kebab-case | à faire |
| 7 | Ménage (`App.tsx`, e2e périmé, branches mergées, lint) | à faire |
| 8 | Verdict final | à faire |

**Prochaine action** : merger les PR chaînées dans l'ordre (option « Create a merge commit »), en commençant par l'étape 1 (`test/retablir-deux-cartes`).

## Améliorations UX de la carte (2026-10-20)

Cinq branches courtes, chacune partie de `develop`, **non poussées, non mergées** (pas de PR créée). Chacune passe `pnpm lint` et `pnpm test` ; le rendu visuel dans un navigateur n'est **pas vérifié**.

| Branche | Sujet |
|---|---|
| `feat/carte-sans-modalite` | Filtre Modalité retiré du panneau de la carte (propriété `views` dans `FILTER_DEFINITIONS`, il reste sur la liste ; le bouton « Événements en ligne » reste l'accès) |
| `feat/carte-nav-haut-droite` | Accueil / Voir la liste / Événements en ligne en haut à droite, sur une ligne (icônes seules sous `2xl`) |
| `feat/domtom-repliable` | Encart DOM/TOM repliable, replié par défaut (`aria-expanded`, mini-cartes montées à l'ouverture) |
| `feat/sidebar-onglet-visible` | Onglet vertical « Filtres & liste » collé au bord gauche pour rouvrir le panneau, pastille du nombre de filtres actifs |
| `feat/coup-de-coeur` | Coup de cœur piloté par le rôle **optionnel** `fieldMapping.highlight` (case à cocher Baserow) : voir [PERIMETRE-CONFIG-BASEROW.md](PERIMETRE-CONFIG-BASEROW.md) §5 |

Points à traiter au merge : `feat/carte-sans-modalite` et `feat/coup-de-coeur` modifient toutes deux `getVisibleFilters` / `getVisibleFiltersFor` (paramètres `view` d'un côté, `hasHighlightedEvents` de l'autre) et `FilterPanel` : résoudre le conflit en gardant les deux paramètres. Le coup de cœur s'ajoute à la définition des filtres : sur la carte, la case est en tête du panneau ; sur la liste, c'est un bouton avant les menus. `scripts/seed-baserow/schema.mjs` et `scripts/baserow-init/init.mjs` n'existent que sur `feat/deploiement-n-cartes` (pas sur `develop`) : si cette branche est mergée, ils doivent aussi créer la colonne `highlight` quand le rôle est déclaré (non fait ici). **Base de production** : créer la colonne case à cocher à la main avant de déclarer le rôle dans `app.config.json` (sinon le contrôle du schéma signale l'écart et les événements ne sont pas marqués).

## Décisions en vigueur

- **Hors du plan actif (2026-10-19)** : session 8 (déploiement) et `develop` vers `main` avec tags. On reste sur `develop`.
- **Tests « deux cartes » et modèle de PR (2026-10-19)** : remis (étape 1) ; leur retrait par #38 était une erreur. La vérification d'identité ou de config se fait avec `docs/audit/fixtures/app.config.second-map.json`.
- **Config Astek (2026-10-19)** : supprimée (essai local sans valeur).
- **Couleurs des référentiels (2026-10-19)** : choisies avec la **pastille native** d'une liste de choix Baserow (branche `feat/champ-couleur-baserow`, doc [../baserow/couleurs.md](../baserow/couleurs.md)) ; `referenceFields.color` revient à `Couleur`. Remplace la table « Couleurs » + recherche de la PR #50 (mergée puis retirée : trop lourde pour les admins). Écarté aussi et le plugin communautaire de champ couleur (image Baserow à reconstruire sur chaque VPS). Compromis : palette Baserow dans `baserow-palette.ts` ([PLAN-FIN-REFONTE.md](PLAN-FIN-REFONTE.md), « Compromis assumés »). Suivi : le filtre Thématiques affiche lui aussi la pastille couleur et le picto (branche `fix/filtre-thematiques-couleur`) ; le filtre Public cible reste sans pastille, en attente de décision du propriétaire.
- **Périmètre (2026-10-16)** : seuls les titres et noms de l'événement sont pilotés par la config, le wording de l'interface reste en dur ; pas de flags de fonctionnalités ; pas de schéma cible Baserow ; carte et régions dans le code ; Airtable retiré, pas de migration de données.
- Toutes les décisions détaillées : [PLAN-SESSIONS.md](PLAN-SESSIONS.md), section « Décisions prises ».

## Points ouverts

- **PR #38** : sa description annonce le retrait du filtre Modalité de la carte et la conservation des tests « deux cartes ». Contenu réel : suppression des tests et du modèle de PR, rien sur les filtres. Le filtre Modalité est toujours sur la carte (étape 6).
- `main` a 124 commits de retard sur `develop` (au 2026-10-19) : tout est sur `develop` ; le passage sur `main` est reporté.
- Le test e2e `apps/backend/test/app.e2e-spec.ts` est périmé (`pnpm test:e2e` échoue) et n'est pas lancé par `pnpm test` ; `apps/frontend/src/App.tsx` est du code mort (étape 7).
- Un test frontend sensible aux délais (`eventDateRange.spec.ts`) a expiré une fois en exécution parallèle lourde : à surveiller.
- `prettier` n'est pas idempotent sur un bloc de `baserow.service.degraded.spec.ts` : `pnpm lint:fix` peut demander deux passes.
- Le lint ne détecte ni couleur ni marque en dur (règle d'`AGENTS.md` vérifiée à la revue seulement) ; garde-fou optionnel à l'étape 7.
- Schéma de la vraie base Baserow de production : jamais fourni (non vérifié) ; la carte doit fonctionner avec le schéma indiqué par la config.
- Base Baserow réelle : si les admins ont déjà appliqué la procédure de la PR #50 (colonne de lien `Couleur` vers la table `Couleurs`), garder `referenceFields.color` = `Couleur (hexa)` le temps de convertir `Couleur` en liste de choix (voir [../baserow/couleurs.md](../baserow/couleurs.md), migration). Non vérifié : schéma de production jamais fourni.
- Palette Baserow (`apps/backend/src/baserow/baserow-palette.ts`) relevée sur la 2.4.1 : à revérifier à chaque montée de version de Baserow (pastille inconnue = message dans les journaux).
- Branches obsolètes `add-dynamic-filters`, `modify-audiences-filters`, `modif_audience_filters` : accord de leur auteur requis avant suppression.
- Réglage GitHub à faire par le propriétaire : protéger `main` et `develop` (non vérifié).
