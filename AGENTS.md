# AGENTS.md — racine (make-map)

Ce dépôt suit le format ouvert [AGENTS.md](https://agents.md/) : instructions dédiées aux agents de code, complémentaires au [README.md](./README.md) humain.

## Règles globales (tout le monorepo)

1. `**apps/map-interactive**` : référence historique — **ne pas modifier** sans décision explicite.
2. **Baserow** : **lecture seule** ; jeton uniquement côté backend (`BASEROW_API_TOKEN`).
3. **Langue** : interface et libellés en **français**.
4. **Git** : pas de push direct sur `main` ; branche + PR.
5. **Portée** : changements ciblés ; pas de refactor gratuit hors demande.

## Où travailler : fichiers AGENTS par zone

Les agents lisent en priorité l’`**AGENTS.md` le plus proche** du fichier modifié. Chaque lien ci-dessous approfondit la zone concernée.


| Zone                                  | Fichier                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| Frontend React + carte                | [apps/frontend/AGENTS.md](./apps/frontend/AGENTS.md)               |
| API NestJS + Baserow + géocodage      | [apps/backend/AGENTS.md](./apps/backend/AGENTS.md)                 |
| Types partagés `@make-map/types`      | [shared/types/AGENTS.md](./shared/types/AGENTS.md)                 |
| Déploiement Docker / Scaleway         | [deploy/AGENTS.md](./deploy/AGENTS.md)                             |
| Référence `map-interactive` (lecture) | [apps/map-interactive/AGENTS.md](./apps/map-interactive/AGENTS.md) |


## Commandes (depuis la racine)


| Objectif             | Commande                                 |
| -------------------- | ---------------------------------------- |
| Frontend + backend   | `pnpm dev`                               |
| Frontend seul        | `pnpm front:dev`                         |
| Backend seul         | `pnpm back:dev`                          |
| Build / lint / tests | `pnpm build` · `pnpm lint` · `pnpm test` |


Environnement : `apps/backend/.env.example` et `apps/frontend/.env.example`.

## Documentation associée

- [CLAUDE.md](./CLAUDE.md) — architecture, flux de données, arborescence détaillée
- [DEVPLAN.md](./DEVPLAN.md) — jalons (**ne pas modifier sans accord**)
- [PROJECT_VIBE_CONF.md](./PROJECT_VIBE_CONF.md) — type de projet (POC)