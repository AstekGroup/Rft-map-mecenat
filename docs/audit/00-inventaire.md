# 00 — Inventaire (étape 0)

Date : 2026-10-16 · Branche : `audit/bilan-refonte` · Preuves : [JOURNAL.md](JOURNAL.md)

## Outillage

| Élément | Constat | Statut | Preuve |
|---|---|---|---|
| Node | v22.21.0 (README exige 18+) | FAIT | `node -v` |
| pnpm | 9.0.0 (= `packageManager`) | FAIT | `pnpm -v` |
| Docker CLI | 26.1.1 | FAIT | `docker --version` |
| Docker démon | arrêté au départ, démarré via Docker Desktop, répond ensuite (26.1.1) | FAIT | `docker info` (JOURNAL) |

## Structure du dépôt (racine = monorepo)

- `apps/frontend` (React/Vite, 71 fichiers sources au total front+back), `apps/backend` (NestJS), `shared/types`, `deploy/`, `scripts/` (`deploy.sh`, `deploy-v2.sh`), `resources/`, `.husky/`.
- Fichiers de config racine : `app.config.json` (profil unique `lgsv`), `.envmap.yaml`, `turbo.json`, `pnpm-workspace.yaml`.
- Modules backend : `baserow/`, `config/` (controller + service : nouveau vs l'ancienne doc), `events/`, `geocoding/`.
- Frontend : scripts `scripts/update-index-html.cjs` (lancé avant `dev` et `build`).
- Working tree : `DEVPLAN.md` supprimé (non commité), `astek-jnr-map COMPARATIF/` non suivi par git (copie pré-refonte, contient son propre `.git`).

## Écarts détectés dès l'inventaire

| Constat | Statut | Preuve |
|---|---|---|
| `package.json` racine : script `map:dev` et `install:map` visent `apps/map-interactive`, qui n'existe plus | PAS FAIT (script mort) | `apps/` ne contient que `backend` et `frontend` |
| `package-lock.json` coexiste avec `pnpm-lock.yaml` | À nettoyer | `Get-ChildItem` racine |
| Hook husky `pre-commit` lance `pnpm test` (tests back + front) | FAIT | `.husky/pre-commit` |
| Script racine `test` ne couvre pas `shared/types` | FAIT (limite) | `package.json` : `--filter=@make-map/backend --filter=@make-map/frontend` |
| `package.json` : description et keywords encodage cassé (`VÃ©gÃ©tale`), keyword `airtable` | PARTIEL | `package.json` |
| Doc (README/CLAUDE/AGENTS) cite `apps/map-interactive` et `DEVPLAN.md` (absents) | PAS FAIT (doc obsolète) | `AGENTS.md`, `README.md` |
| Variables d'env : README `BASEROW_TABLE_ID` vs `.env.example` `BASEROW_EVENT_TABLE_ID` + 3 tables de référence | NON VÉRIFIÉ (à croiser avec `process.env` en étape 1) | `apps/backend/.env.example` |
| Dates/couleurs : CLAUDE.md (mai 2026, #3BAE5D) vs `app.config.json` (sept. 2026, #AE3B5D) | PARTIEL (doc non à jour) | `app.config.json` |
| `app.config.json` : pas de bloc `features`, un seul profil | PAS FAIT (à confirmer étape 4) | `app.config.json` |
| Dossier imbriqué `astek-jnr-map/` mentionné dans le snapshot git initial | Absent au moment de l'audit | `Test-Path astek-jnr-map` = False |

## Risque restant

- Clé MapTiler requise pour la carte (étape 1/3).
