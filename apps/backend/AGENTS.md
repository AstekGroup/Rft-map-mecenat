# AGENTS.md — `@make-map/backend`

[← Instructions racine](../../AGENTS.md) · [Frontend](../frontend/AGENTS.md) · [Types](../../shared/types/AGENTS.md) · [Bilan de la refonte](../../docs/audit/SUIVI.md)

> Lire d'abord la section « Philosophie de la refonte » de l'[AGENTS.md racine](../../AGENTS.md).

## Contexte

**NestJS 11** : proxy **lecture seule** vers Baserow, transformation des enregistrements, géocodage BAN, cache, et service de la **config de la carte** (`app.config.json`).

## Commandes (depuis `apps/backend`)

```bash
pnpm dev          # nest start --watch — port 3000 par défaut
pnpm build
pnpm test         # Jest
```

Depuis la racine : `pnpm back:dev`. Attention : `pnpm lint` du backend lance ESLint avec `--fix` (il **modifie** les fichiers) et signale beaucoup de bruit CRLF — voir [01-lancement](../../docs/audit/01-lancement.md).

## API

| Endpoint | Description |
|---|---|
| `GET /api/config` | Config de la carte (thème, textes, dates, filtres) |
| `GET /api/events` | Liste des événements acceptés |
| `GET /api/events/:id` | Détail |
| `GET /api/events/partners`, `/themes`, `/formats`, `/publics` | Référentiels issus de Baserow |
| `GET /api/health` | Santé |

> `?devMode=true` contourne la modération. Il était public sans authentification (voir [03-validation](../../docs/audit/03-validation.md) §2) ; il n'est désormais honoré que si `ALLOW_DEV_MODE=true` **et** `NODE_ENV` ≠ `production` (`events.controller.ts`), sinon ignoré avec un avertissement. Ne pas l'étendre.

## Règles propres au backend

1. **Noms de champs uniquement via `baserow.fieldMapping`** de la config : **pas de valeur de repli en dur** (`fm.x || 'Ville du lieu'`). Un champ non mappé donne une valeur vide **et un avertissement journalisé**.
2. **Valider au démarrage** : config (clés requises, formats de dates/couleurs) et schéma Baserow (les champs du mapping existent dans la table). En cas d'écart : message explicite, mode dégradé défini, pas de 500 opaque.
3. **Modération fail-closed** : si `BASEROW_MODERATION_FIELD_ID` ou la valeur visible manque, ne **rien publier** (`BaserowService.fetchRecords` lève une erreur explicite si l'ID manque, hors `devMode`). Un champ de modération supprimé dans Baserow produit une erreur claire dans les logs (`ERROR_FILTER_FIELD_NOT_FOUND`), toujours un 500 côté client (message générique, volontairement).
4. **Aucune écriture sur Baserow** (`GET` uniquement).
5. **Pas de donnée propre à une carte dans le code** : dates par défaut, noms de régions, libellés, e-mails. Les dates de l'événement viennent de la config (le repli `2026-09-25 / 2026-10-04` est une dette).
6. **Config N cartes** : le chargement passe par `AppConfigService` (`APP_CONFIG_PATH` ou chemins candidats). Toute nouvelle clé de config est ajoutée au type `AppConfig` partagé.
7. **Cache** : TTL de 5 min par ressource ; il n'existe pas d'invalidation exposée — si l'ajouter, la protéger (jamais publique).

## Arborescence `src/`

| Module | Rôle |
|---|---|
| `config/` | Chargement et service de `app.config.json` |
| `baserow/` | Fetch paginé, types d'enregistrement, mapping champs → modèle |
| `geocoding/` | api-adresse.data.gouv.fr + cache mémoire |
| `events/` | Controller + service (orchestration, caches) |

## Variables

Copier `.env.example`. Lues par le code : `BASEROW_API_URL`, `BASEROW_API_TOKEN`, `BASEROW_EVENT_TABLE_ID`, `BASEROW_MODERATION_FIELD_ID`, `BASEROW_PARTNERS_TABLE_ID`, `BASEROW_THEMATIQUES_TABLE_ID`, `BASEROW_FORMATS_TABLE_ID`, `BASEROW_PUBLICS_TABLE_ID`, `PORT`, `CORS_ORIGIN`, `APP_CONFIG_PATH`. Le README mentionne `BASEROW_TABLE_ID` : **nom obsolète**.

Pour développer sans toucher à un Baserow réel : instance locale + données de test dans [docs/audit/02-baserow-seed.md](../../docs/audit/02-baserow-seed.md).
