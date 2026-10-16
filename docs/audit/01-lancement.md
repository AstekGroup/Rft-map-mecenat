# 01 — Lancement local (étape 1)

Date : 2026-10-16 · Environnement : Windows, Node v22.21.0, pnpm 9.0.0 · Statuts : voir [SUIVI.md](SUIVI.md)

## Résultats des commandes

| Commande | Résultat | Statut | Preuve |
|---|---|---|---|
| `pnpm install` | OK, mais **modifie `pnpm-lock.yaml`** (lockfile non synchronisé : `lucide-react` `^1.46.0` dans `apps/frontend/package.json` vs `0.468.0` verrouillé ; entrée fantôme `apps/map-interactive`). Les `Dockerfile` utilisent `--frozen-lockfile` → build Docker probablement cassé | PARTIEL | `git diff pnpm-lock.yaml` ; `apps/*/Dockerfile` |
| `pnpm build` (turbo) | **ÉCHEC** : `@make-map/frontend#build`. Types OK, backend OK | PAS FAIT | JOURNAL (session 1) |
| `tsc` frontend | 4 erreurs, toutes à `apps/frontend/src/types/event.ts:12` : `@make-map/types` n'exporte plus `EventTheme`, `EventType`, `EventFormat`, `TargetAudience` (supprimés de `shared/types/src/event.ts` pendant la refonte, jamais nettoyés côté front) | PAS FAIT | `tsc -p tsconfig.json --noEmit` |
| `vite build` seul (sans `tsc`) | OK (bundle 1,4 Mo ; chunk > 500 ko) → le bug de types ne bloque que le script `build` | FAIT | JOURNAL |
| `nest build` backend | OK | FAIT | JOURNAL |
| Tests backend (`jest`) | **61/61 OK** (4 suites) | FAIT | JOURNAL |
| Tests frontend (`vitest`) | **58/58 OK** (4 suites) | FAIT | JOURNAL |
| `pnpm lint` backend (sans `--fix`) | **2115 problèmes** : 2051 sont du bruit de fin de ligne CRLF (Windows, `core.autocrlf=true`, pas de `.gitattributes` vu), ~63 réels (`no-unsafe-*` en cascade, liés à des types non résolus) | PARTIEL | JOURNAL |
| `pnpm lint` frontend | **ÉCHEC** : aucun `eslint.config.*` dans `apps/frontend` (ESLint 9) | PAS FAIT | JOURNAL |
| Script `lint` backend | contient `--fix` : le lancer modifie le code (risque pour l'hygiène des commits) | À corriger | `apps/backend/package.json` |
| Backend `node dist/main` sans `.env` | **Démarre** sur :3000 ; `GET /api/health` → 200 ; `GET /api/config` → 200 (profil `lgsv`, config chargée depuis `app.config.json` racine) ; `GET /api/events` (avec ou sans `devMode`) → **500** (`Configuration Baserow manquante`) ; `GET /api/events/themes` → 200 `[]` (échec silencieux) | PARTIEL | JOURNAL |
| Frontend dev (vérification navigateur) | Reporté à l'étape 3 (nécessite un backend alimenté) | NON VÉRIFIÉ | |

## Variables d'environnement réellement lues dans le code

| Variable | Lieu | Dans `.env.example` ? | Remarque |
|---|---|---|---|
| `BASEROW_API_URL`, `BASEROW_API_TOKEN` | `baserow.service.ts` | oui | |
| `BASEROW_EVENT_TABLE_ID` | `baserow.service.ts:203` | oui | README/CLAUDE.md disent `BASEROW_TABLE_ID` (faux) |
| `BASEROW_MODERATION_FIELD_ID` | `baserow.service.ts:204` | oui | Le filtre de modération s'appuie sur un **ID de champ** en env, alors que le reste du mapping est par nom dans `app.config.json` |
| `BASEROW_PARTNERS_TABLE_ID`, `BASEROW_THEMATIQUES_TABLE_ID`, `BASEROW_FORMATS_TABLE_ID`, `BASEROW_PUBLICS_TABLE_ID` | `baserow.service.ts:43-53,127` (nom construit dynamiquement : `'BASEROW_X_TABLE' + '_ID'`) | oui | Les noms de variables sont construits par concaténation → introuvables par grep |
| `APP_CONFIG_PATH` | `config.service.ts:19` | **non** | Seule façon de choisir un autre fichier de config (≠ profil) |
| `PORT`, `NODE_ENV`, `CORS_ORIGIN` | `main.ts` | `PORT` seul | `CORS_ORIGIN` seulement dans `deploy/` |
| `VITE_API_URL` | `services/api.ts:12` | oui | |
| `VITE_MAPTILER_KEY` | **aucune lecture dans `src/`** (seulement `Dockerfile`, `.env.example` doc, README) | doc | Variable morte : le README la dit requise, le code ne l'utilise pas (styles de carte via `MapStyleSelector.tsx`) |

## Chaîne de config (`app.config.json`)

- Un seul fichier, à la racine, `profile: "lgsv"`. Aucun mécanisme de sélection de profil : seul `APP_CONFIG_PATH` (backend) permet d'en charger un autre.
- Backend : `AppConfigService` (`apps/backend/src/config/config.service.ts`) charge le JSON au démarrage et l'expose via `GET /api/config`. Si absent, il journalise un warning et `config=null` ; les accesseurs `safe`/`eventDates` **lèvent une exception** ensuite (`fetchEvents` utilise `eventDates`).
- Frontend : `ConfigProvider` + `useConfig` (le contexte récupère la config via l'API). `index.html` est, lui, **réécrit au build** par `scripts/update-index-html.cjs`, qui lit `../../../app.config.json` en dur.
- Défaut du script : il **remplace des placeholders dans un fichier suivi par git** (`apps/frontend/index.html`), puis le réécrit. Il n'est donc **pas idempotent** : une fois remplacé, un second lancement avec une autre config ne change plus rien. `pnpm build` a produit ce diff (revert effectué avec `git checkout apps/frontend/index.html`).

## Constats de déploiement (statiques, non exécutés)

| Constat | Statut | Preuve |
|---|---|---|
| `deploy/docker-compose.prod.yml` et `deploy/.env.prod.example` passent encore des variables **Airtable** (`AIRTABLE_*`) ; aucune variable `BASEROW_*` | PAS FAIT (déploiement non migré) | `deploy/docker-compose.prod.yml:46-49` |
| `apps/backend/Dockerfile` ne copie pas `app.config.json` et `APP_CONFIG_PATH` n'est pas défini : en prod, `config=null` → exception à la 1re requête `events` | PAS FAIT (probable) | `apps/backend/Dockerfile` ; `.dockerignore` |
| `apps/frontend/Dockerfile` ne copie pas `app.config.json`, alors que `pnpm build` exécute `update-index-html.cjs` qui le lit → build Docker probablement en échec | PAS FAIT (probable) | `apps/frontend/Dockerfile:11-14` ; `scripts/update-index-html.cjs:5` |
| Build Docker non exécuté pour confirmer | NON VÉRIFIÉ | |

## Synthèse

- **Ça marche** : démarrage du backend, health, `/api/config`, tests unitaires (119 au total).
- **Ça ne marche pas** : `pnpm build` (types), lint front, déploiement Docker (Airtable + config absente), `/api/events` sans Baserow.
- **Contournement pour la suite** : lancer `vite build`/`vite dev` directement, ou corriger le réexport de types (hors périmètre de ce bilan, à mettre au backlog).
