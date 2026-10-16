# 06 — Réécriture des AGENTS.md (étape 6)

Date : 2026-10-16. Statuts : voir [SUIVI.md](SUIVI.md).

## Statut : **appliqué en copie de travail, NON commité — en attente de ta validation**

Le plan prévoit une relecture avant application. Comme l'exécution devait se poursuivre sans interruption, les 5 fichiers ont été **réécrits dans l'arbre de travail de la branche `audit/bilan-refonte`** (rien de commité, rien sur `main`). Tu peux :

- **relire** : [`06-agents.diff`](06-agents.diff) (diff complet) ou `git diff -- AGENTS.md apps/frontend/AGENTS.md apps/backend/AGENTS.md shared/types/AGENTS.md deploy/AGENTS.md` ;
- **refuser** : `git checkout -- AGENTS.md apps/frontend/AGENTS.md apps/backend/AGENTS.md shared/types/AGENTS.md deploy/AGENTS.md` ;
- **accepter** : commiter sur la branche d'audit puis ouvrir une PR (pas de push direct sur `main`).

Stat : 5 fichiers, +134 / −76 (`git diff --stat`).

## Ce qui change

| Fichier | Changement |
|---|---|
| `AGENTS.md` (racine) | Nouvelle section **« Philosophie de la refonte »** (7 principes : 1 code / N cartes, tout via config, features = flags off par défaut, aucun nom de champ Baserow hors mapping, référentiels depuis Baserow, dégradation propre, codé en dur = refus en revue) ; **écart connu** code/règles avec lien vers `04-cartographie.md` ; règles globales durcies (modération fail-closed, exception documentée du script de seed local, preuves exigées) ; **checklist « définition de terminé » de PR** ; **retrait** des liens obsolètes `apps/map-interactive/AGENTS.md`, `DEVPLAN.md` ; liste exacte des variables d'environnement lues ; limites connues des scripts ; pointeur vers `docs/audit/` |
| `apps/frontend/AGENTS.md` | Règles : textes, couleurs/polices, marque, paramètres de carte, référentiels, flags, dégradation, iframe ; mention des limites (lint absent, `tsc -b`), `VITE_MAPTILER_KEY` morte ; build par carte (`update-index-html.cjs`) |
| `apps/backend/AGENTS.md` | API réelle (`/api/config`, `/partners`, `/themes`, `/formats`, `/publics`) ; règles : mapping sans repli en dur, validation au démarrage, **modération fail-closed**, lecture seule, config N cartes ; risque `devMode` ; variables réellement lues |
| `shared/types/AGENTS.md` | Reflète l'état réel (les énumérations `EventType/…` et `REGIONS` n'existent plus) ; `AppConfig` = contrat central ; règle « toute clé de config est typée d'abord » et flags `features` |
| `deploy/AGENTS.md` | Une carte = une configuration de déploiement ; `AIRTABLE_*` obsolètes ; `frame-ancestors` à définir dans Caddy ; lockfile/`docker build` non vérifiés ; mention de `deploy/baserow-local` |

Chaque règle ajoutée répond à un constat prouvé : `04` (codé en dur), `03` §2 (modération, `devMode`), `03` §3 (schéma Baserow), `03` §4 (iframe), `01` (build/lint), `05` (doublons de branches).

## Références obsolètes retirées / signalées

| Élément | Où | Preuve | Traitement |
|---|---|---|---|
| `apps/map-interactive` (lien + règle « ne pas modifier ») | `AGENTS.md` racine | dossier absent de `main` (`git ls-tree -d main apps/` → `backend`, `frontend` ; supprimé par `645aa73`) | **Retiré** de AGENTS |
| `DEVPLAN.md` | `AGENTS.md` racine | fichier supprimé du working tree (`git status` : ` D DEVPLAN.md`) | **Retiré** de AGENTS |
| Charte « semaine-ia.fr » | `CLAUDE.md` | — | Non applicable dans AGENTS ; **à corriger dans CLAUDE.md** (ci-dessous) |

Restes hors AGENTS (non modifiés, décision à prendre) : `README.md` racine (arborescence + lien `apps/map-interactive/AGENTS.md`, lignes 16, 90 et 123), scripts `map:dev` et `install:map` du `package.json` racine, `package.json` (description avec encodage cassé, keyword `airtable`), `package-lock.json` coexistant avec `pnpm-lock.yaml`.

## Incohérences de `CLAUDE.md` (non modifié — à décider avec toi)

`CLAUDE.md` est chargé comme règle permanente par les agents : ses erreurs se propagent. Constats prouvés par `rg` :

| # | Dans `CLAUDE.md` | Réalité | Preuve |
|---|---|---|---|
| 1 | `apps/map-interactive/` « original standalone, DO NOT MODIFY », `pnpm map:dev` | dossier supprimé | `git ls-tree` ci-dessus |
| 2 | « Same UI as `map-interactive` » (frontend) | idem | CLAUDE.md:69 |
| 3 | Dates de l'événement : **mai 2026** | `app.config.json` : 2026-09-21 → 2026-09-27 ; repli backend 2026-09-25 → 2026-10-04 | `app.config.json`, `baserow-mapping.util.ts:72-73` |
| 4 | Design « semaine-ia.fr », couleurs `#003081`, `accent-coral`, `accent-magenta`, `surface-beige #ffeed1` | Tailwind utilise les couleurs LGSV (`primary` #3BAE5D…) ; section « Design System (LGSV) » contradictoire dans le même fichier | CLAUDE.md:118-120 vs 169 ; `tailwind.config.ts:12-29` |
| 5 | Couleur LGSV `primary: #3BAE5D` | `app.config.json` → `theme.colors.primary` = **`#AE3B5D`** (rose/bordeaux, chiffres permutés ?) : **à confirmer** (faute de frappe probable ; les repli Tailwind sont verts) | `app.config.json` (valeur lue par `node -e`), `tailwind.config.ts:12` |
| 6 | `BASEROW_TABLE_ID` | le code lit `BASEROW_EVENT_TABLE_ID` + `BASEROW_THEMATIQUES_TABLE_ID`, `BASEROW_FORMATS_TABLE_ID`, `BASEROW_PUBLICS_TABLE_ID` | `baserow.service.ts` ; `.env.example` |
| 7 | Types partagés : `EventType`, `EventFormat`, `TargetAudience`, `REGIONS`, labels | n'existent plus dans `shared/types/src/event.ts` | `rg "^export"` |
| 8 | Backend : « `?devMode=true` to bypass moderation filter » présenté comme feature | faille (accès public sans auth) | 03 §2 |
| 9 | Arborescence `make-map/…` sans `config/`, `docs/audit/`, `scripts/seed-baserow/`, `deploy/baserow-local/` | ajoutés | état du dépôt |
| 10 | « Backend is READ-ONLY on Baserow » | vrai pour l'application ; le script de seed local écrit (exception documentée) | `scripts/seed-baserow/seed.mjs` |
| 11 | « Status: Adapted from "Semaine de l'IA" » ; `Project Overview` centré LGSV | doc d'une seule carte, contraire à « N cartes » | — |

**Options pour `CLAUDE.md`** (décision attendue) : (A) le **réduire** à un lien vers `AGENTS.md` + architecture (recommandé : une seule source de vérité, moins de dérive) ; (B) le **corriger** point par point ; (C) le **laisser** (risque : les agents répètent les erreurs ci-dessus).

## Checklist « définition de terminé » (PR)

Reproduite dans l'`AGENTS.md` racine (section dédiée) — 10 cases : pas de valeur propre à une carte, pas de nom de champ Baserow hors mapping, textes via `texts.*`, features = flags off, cas dégradés, types partagés d'abord + build, lint + tests, env documentées, test avec une seconde config, docs à jour.

## Points à valider

1. Le ton **normatif** (« interdit », « refus en revue ») te convient-il ?
2. `CLAUDE.md` : option A, B ou C ?
3. Faut-il aussi corriger `README.md` racine et les scripts `map:dev` / `install:map` (hors AGENTS) ?
4. Nommer le flag de fonctionnalités `features` (proposition) — à confirmer avant de l'ajouter au type `AppConfig`.
