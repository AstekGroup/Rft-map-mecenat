# AGENTS.md — `@make-map/backend`

[← Instructions racine](../../AGENTS.md) · [Frontend](../frontend/AGENTS.md) · [Types](../../shared/types/AGENTS.md) · [CLAUDE.md](../../CLAUDE.md)

## Contexte

**NestJS 11** : proxy Baserow, transformation des enregistrements, géocodage BAN, cache.

## Commandes (depuis `apps/backend`)

```bash
pnpm dev          # nest start --watch — port 3000 par défaut
pnpm build
pnpm lint
pnpm test         # Jest
```

Depuis la racine : `pnpm back:dev`.

## API


| Endpoint              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `GET /api/events`     | Liste événements (query `devMode=true` possible) |
| `GET /api/events/:id` | Détail                                           |
| `GET /api/health`     | Santé                                            |


## Arborescence `src/`


| Module       | Rôle                                                           |
| ------------ | -------------------------------------------------------------- |
| `baserow/`  | Fetch paginé, types enregistrement, mapping champs FR → modèle |
| `geocoding/` | api-adresse.data.gouv.fr + cache mémoire                       |
| `events/`    | Controller + service (orchestration, cache TTL ~5 min)         |


## Règles métier

- **Lecture seule** sur Baserow ; secret dans `BASEROW_API_TOKEN` uniquement serveur.
- CORS : origines dev configurées dans `main.ts`.

## Variables

Copier `.env.example` : `BASEROW_`*, `PORT`.