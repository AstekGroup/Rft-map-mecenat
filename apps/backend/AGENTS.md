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
| `GET /api/health` | Santé : `ok` ou `degraded` (référentiel en erreur), toujours HTTP 200 |

> `?devMode=true` contourne la modération. Il n'est honoré que si `ALLOW_DEV_MODE=true` **et** `NODE_ENV` ≠ `production` (`events.controller.ts`), sinon ignoré avec un avertissement. Ne pas l'étendre.

## Règles propres au backend

1. **Noms de champs et valeurs de listes de choix uniquement via la config** : `baserow.fieldMapping` (colonnes des événements), `baserow.mapping.referenceFields` (colonnes des tables de référence), `baserow.mapping.modality` (valeurs de la liste « modalité »), `baserow.mapping.tariffFreeValue`, `baserow.moderationVisibleValue`. **Pas de valeur de repli en dur** (`fm.x || 'Ville du lieu'`). Un rôle absent de la config donne une valeur vide **et un avertissement journalisé une seule fois** (`BaserowService.readField`), une valeur de liste inconnue est signalée de la même façon. Ne pas lire `record['…']` avec un nom littéral : passer par `readField` ou par `mapReferenceRecord`.
2. **Valider au démarrage** (fait en session 4) : 
   - **Config** : `validateAppConfig` (`config-validation.util.ts`) liste toutes les erreurs d'un coup (clés requises, dates `AAAA-MM-JJ`, couleurs hexadécimales, rôles de `fieldMapping`, `mapping`) ; `AppConfigService` journalise chaque erreur et **refuse de démarrer** (`main.ts` affiche un message clair et sort avec le code 1). Un rôle ou une clé inconnue est un avertissement. `APP_CONFIG_PATH` vers un fichier absent est une erreur. Ajouter un rôle à `BaserowFieldMapping` impose de l'ajouter à la liste de la validation (le compilateur le vérifie).
   - **Schéma Baserow** : `BaserowService.checkSchema` (au démarrage, sans bloquer) et `checkRecordColumns` (à chaque chargement des événements) comparent les colonnes réelles à la config et journalisent, en erreur, chaque colonne absente avec son rôle, la colonne proche et les colonnes inutilisées (`baserow-schema.util.ts`). Table vide ou Baserow injoignable : avertissement, jamais d'exception.
   - **Table de référence en erreur ≠ table vide** (session 5) : une table illisible (HTTP, réseau) lève `ReferenceTableError` (`baserow.errors.ts`), journalisée en erreur et enregistrée dans `BaserowService.getReferenceStatus()`. Les événements restent servis (sans cette dimension, avec une erreur nommant la table) ; les 4 endpoints de référentiel répondent **502** au lieu d'une liste vide ; `GET /api/health` reste **HTTP 200** mais `status: "degraded"` + liste `references` (la sonde Docker ne doit pas redémarrer le conteneur pour un Baserow passager) ; le cache des événements tombe à 30 s tant qu'un référentiel est en erreur. Une table dont la variable d'environnement est absente reste un avertissement + liste vide (dette connue).
3. **Modération fail-closed** : si `BASEROW_MODERATION_FIELD_ID` ou la valeur visible manque, ne **rien publier** (`BaserowService.fetchRecords` lève une erreur explicite si l'ID manque, hors `devMode`). Un champ de modération supprimé dans Baserow produit une erreur claire dans les logs (`ERROR_FILTER_FIELD_NOT_FOUND`), toujours un 500 côté client (message générique, volontairement).
4. **Aucune écriture sur Baserow** (`GET` uniquement).
5. **Pas de donnée propre à une carte dans le code** : dates par défaut, libellés, e-mails. Les dates de l'événement viennent de la config, **sans repli** : si `app.eventDates.weekStart` / `weekEnd` manquent ou ne sont pas au format `AAAA-MM-JJ`, `computeIsDuringWeek` lève une erreur explicite (et la validation de la config les refuse déjà au démarrage). Les régions restent dans le code.
6. **Config N cartes** : le chargement passe par `AppConfigService` (`APP_CONFIG_PATH` ou chemins candidats). Toute nouvelle clé de config est ajoutée au type `AppConfig` partagé. Pas de flag `features.*`. **Gabarits** : toute chaîne de la config peut contenir `{{chemin.vers.la.valeur}}` (ex. `"Carte - {{app.name}}"`), résolu au chargement par `config-template.util.ts` (placeholder inconnu : chaîne vide + avertissement dans les logs). `APP_CONFIG_PATH` : un chemin **absolu** est recommandé (un chemin relatif est lu depuis le répertoire courant du backend, `apps/backend` via pnpm) ; un chemin qui ne désigne aucun fichier fait échouer le démarrage. La config est validée au chargement (règle 2).
7. **Règles de données des filtres** (session 5) : *pendant l'événement* (`isDuringWeek`) = **recoupement** de `[début, fin]` avec `[weekStart, weekEnd]` (même règle que le filtre de période personnalisée du front ; fin absente ou antérieure au début = jour de début). **Un seul format** par événement : `type` = le premier lié, et un avertissement agrégé (`warnOnce`, 3 exemples + « et N autre(s) ») nomme les événements qui en portent plusieurs. **Ordre des options** = ordre de l'API Baserow (ordre manuel des lignes de la table) : ne jamais trier alphabétiquement.
8. **Cache** : TTL de 5 min par ressource ; il n'existe pas d'invalidation exposée — si l'ajouter, la protéger (jamais publique). Un événement accepté en modération apparaît donc au bout de 5 minutes ou au redémarrage (documenté dans `README.md` et `apps/backend/README.md`).
9. **Cas dégradés des événements** (session 6 ; chacun est signalé par **un message agrégé** `warnOnce` : nombre, colonne de la config, 3 exemples, répété seulement si la liste change) : **sans date de début valide** → l'événement n'est pas publié (filtré dans `fetchEvents`, jamais d'`Invalid Date`) ; **fin avant début** (comparaison des instants) → `endDate`/`endTime` ignorés, événement conservé ; **capacité** = entier positif (nombre ou texte numérique, `parseCapacity`), sinon ignorée (`0` et vide = « non renseignée », sans message ; texte, négatif, décimal = message) ; **date et heure lues toutes deux à Paris** (`parseDateTime`, indépendant du fuseau du serveur) ; **sans titre** → repli générique « Événement sans titre ». Ajouter un cas = un champ dans `TransformIssues` + un test dans `baserow.service.degraded.spec.ts`.

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
