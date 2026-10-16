# AGENTS.md — `@make-map/backend`

[← Instructions racine](../../AGENTS.md) · [Frontend](../frontend/AGENTS.md) · [Types](../../shared/types/AGENTS.md) · [Suivi de la refonte](../../docs/audit/SUIVI.md)

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
| `GET /api/config` | Config de la carte (thème, textes, dates) |
| `GET /api/events` | Liste des événements acceptés |
| `GET /api/events/:id` | Détail |
| `GET /api/events/partners`, `/themes`, `/formats`, `/publics` | Référentiels issus de Baserow |
| `GET /api/health` | Santé |

> `?devMode=true` contourne la modération. Il n'est honoré que si `ALLOW_DEV_MODE=true` **et** `NODE_ENV` ≠ `production` (`events.controller.ts`), sinon ignoré avec un avertissement. Ne pas l'étendre.

## Règles propres au backend

1. **Noms de champs et valeurs de listes de choix uniquement via la config** : `baserow.fieldMapping` (colonnes des événements), `baserow.mapping.referenceFields` (colonnes des tables de référence), `baserow.mapping.modality` (valeurs de la liste « modalité »), `baserow.mapping.tariffFreeValue`, `baserow.moderationVisibleValue`. **Pas de valeur de repli en dur** (`fm.x || 'Ville du lieu'`). Un rôle absent de la config donne une valeur vide **et un avertissement journalisé une seule fois** (`BaserowService.readField`), une valeur de liste inconnue est signalée de la même façon. Ne pas lire `record['…']` avec un nom littéral : passer par `readField` ou par `mapReferenceRecord`.
2. **Valider au démarrage** : config (clés requises, formats de dates/couleurs) et schéma Baserow (les champs du mapping existent dans la table). En cas d'écart : message explicite, mode dégradé défini, pas de 500 opaque. Une table de référence en erreur ne doit pas être confondue avec une table vide.
3. **Modération fail-closed** : si `BASEROW_MODERATION_FIELD_ID` ou la valeur visible manque, ne **rien publier** (`BaserowService.fetchRecords` lève une erreur explicite si l'ID manque, hors `devMode`). Un champ de modération supprimé dans Baserow produit une erreur claire dans les logs (`ERROR_FILTER_FIELD_NOT_FOUND`), toujours un 500 côté client (message générique, volontairement).
4. **Aucune écriture sur Baserow** (`GET` uniquement).
5. **Pas de donnée propre à une carte dans le code** : dates par défaut, libellés, e-mails. Les dates de l'événement viennent de la config, **sans repli** : si `app.eventDates.weekStart` / `weekEnd` manquent ou ne sont pas au format `AAAA-MM-JJ`, `computeIsDuringWeek` lève une erreur explicite (la validation complète de la config au démarrage est prévue en session 4). Les régions restent dans le code.
6. **Config N cartes** : le chargement passe par `AppConfigService` (`APP_CONFIG_PATH` ou chemins candidats). Toute nouvelle clé de config est ajoutée au type `AppConfig` partagé. Pas de flag `features.*`. **Gabarits** : toute chaîne de la config peut contenir `{{chemin.vers.la.valeur}}` (ex. `"Carte - {{app.name}}"`), résolu au chargement par `config-template.util.ts` (placeholder inconnu : chaîne vide + avertissement dans les logs). `APP_CONFIG_PATH` : un chemin **absolu** est recommandé (un chemin relatif est lu depuis le répertoire courant du backend, `apps/backend` via pnpm).
7. **Cache** : TTL de 5 min par ressource ; il n'existe pas d'invalidation exposée — si l'ajouter, la protéger (jamais publique). Un événement accepté en modération apparaît donc au bout de 5 minutes ou au redémarrage.

## Arborescence `src/`

| Module | Rôle |
|---|---|
| `config/` | Chargement et service de `app.config.json` |
| `baserow/` | Fetch paginé, types d'enregistrement, mapping champs → modèle |
| `geocoding/` | api-adresse.data.gouv.fr + cache mémoire |
| `events/` | Controller + service (orchestration, caches) |

## Variables

Copier `.env.example`. Lues par le code : `BASEROW_API_URL`, `BASEROW_API_TOKEN`, `BASEROW_EVENT_TABLE_ID`, `BASEROW_MODERATION_FIELD_ID`, `BASEROW_PARTNERS_TABLE_ID`, `BASEROW_THEMATIQUES_TABLE_ID`, `BASEROW_FORMATS_TABLE_ID`, `BASEROW_PUBLICS_TABLE_ID`, `PORT`, `CORS_ORIGIN`, `APP_CONFIG_PATH`, `ALLOW_DEV_MODE`. Le README mentionne `BASEROW_TABLE_ID` : **nom obsolète**.

Pour développer sans toucher à un Baserow réel : instance locale + données de test dans [docs/audit/02-baserow-seed.md](../../docs/audit/02-baserow-seed.md).
