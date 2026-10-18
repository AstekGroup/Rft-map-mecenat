# Backend API - Make Map

Backend NestJS du monorepo « **1 code, N cartes** » : proxy sécurisé **en lecture seule** pour l'API Baserow, transformation des données, géocodage, cache, et service de la **config de la carte** (`app.config.json`). Rien de propre à un événement n'est dans le code : les noms de colonnes Baserow, les dates et l'identité viennent de la config.

**Assistants IA** : [AGENTS.md](./AGENTS.md) dans ce dossier ; index global [AGENTS.md](../../AGENTS.md). Qui porte quoi (config, Baserow, code, environnement) : [docs/audit/PERIMETRE-CONFIG-BASEROW.md](../../docs/audit/PERIMETRE-CONFIG-BASEROW.md) ; index de la documentation : [docs/README.md](../../docs/README.md).

## Stack

| Technologie | Usage |
|-------------|-------|
| NestJS 11 | Framework API |
| TypeScript | Langage |
| @nestjs/config | Variables d'environnement |
| api-adresse.data.gouv.fr | Géocodage (API BAN) |

## API Endpoints

| Endpoint                       | Description                                                        |
|--------------------------------|--------------------------------------------------------------------|
| `GET /api/config`              | Configuration de la carte à partir du fichier app.config.json      |
| `GET /api/events`              | Liste les événements acceptés par la modération (géocodés)         |
| `GET /api/events?devMode=true` | Liste tous les événements (sans filtre modération) ; ignoré sauf si `ALLOW_DEV_MODE=true` et hors production |
| `GET /api/events/:id`          | Détail d'un événement par son ID Baserow                           |
| `GET /api/events/partners`     | Liste des partenaires                                              |
| `GET /api/events/themes`       | Liste des thématiques                                              |
| `GET /api/events/formats`      | Liste des formats                                                  |
| `GET /api/events/publics`      | Liste des publics cible                                            |
| `GET /api/health`              | Health check (`ok` ou `degraded`, toujours HTTP 200)               |

## Configuration

Copier `.env.example` en `.env` :

```bash
cp .env.example .env
```

Variables lues par le code (liste de référence : `.env.example`) :

```env
# Baserow (requises)
BASEROW_API_URL=votre_url_baserow
BASEROW_API_TOKEN=votre_token_baserow
BASEROW_EVENT_TABLE_ID=votre_id_table_evenements
BASEROW_MODERATION_FIELD_ID=votre_id_champ_moderation_table_evenement
BASEROW_PARTNERS_TABLE_ID=votre_id_table_partenaires
BASEROW_THEMATIQUES_TABLE_ID=votre_id_table_thematiques
BASEROW_FORMATS_TABLE_ID=votre_id_table_formats
BASEROW_PUBLICS_TABLE_ID=votre_id_table_publics

# Serveur
PORT=3000                          # défaut : 3000
# CORS_ORIGIN=http://localhost:5173   # optionnel
# APP_CONFIG_PATH=C:/chemin/vers/app.config.json   # optionnel, chemin absolu recommandé ; sans lui : app.config.json à la racine du dépôt
# ALLOW_DEV_MODE=true                 # optionnel, local seulement ; ignoré si NODE_ENV=production
```

Sans `BASEROW_MODERATION_FIELD_ID`, **aucun événement n'est publié** (modération fail-closed). Une config invalide, ou un `APP_CONFIG_PATH` qui ne désigne aucun fichier, empêche le démarrage avec un message listant les erreurs.

Pour développer sans toucher à un Baserow réel : instance locale jetable et données de test dans [docs/audit/BASEROW-LOCAL.md](../../docs/audit/BASEROW-LOCAL.md).

## Développement

```bash
# Depuis la racine du monorepo
pnpm back:dev

# Ou directement
cd apps/backend
pnpm dev          # nest start --watch
pnpm build
pnpm test         # Jest
pnpm lint         # ESLint + Prettier, sans modifier les fichiers
pnpm lint:fix     # même contrôle avec --fix (correction volontaire)
```

## Architecture

```
src/
├── baserow/
│   ├── baserow.module.ts
│   ├── baserow.service.ts          # Fetch paginé + transformation + contrôle du schéma
│   ├── baserow.types.ts            # Interface BaserowRecord
│   ├── baserow.errors.ts           # Erreurs des tables de référence
│   ├── baserow-mapping.util.ts     # Mapping champs Baserow (via la config) → types internes
│   └── baserow-schema.util.ts      # Comparaison colonnes réelles / config
├── config/
│   ├── config.module.ts
│   ├── config.controller.ts        # GET /api/config
│   ├── config.service.ts           # Chargement du fichier app.config.json
│   ├── config-template.util.ts     # Gabarits {{app.name}}
│   └── config-validation.util.ts   # Validation de la config au démarrage
├── geocoding/
│   ├── geocoding.module.ts
│   └── geocoding.service.ts        # API BAN + cache mémoire
├── events/
│   ├── events.module.ts
│   ├── events.controller.ts        # REST endpoints
│   └── events.service.ts           # Orchestration + cache TTL 5min
├── app.module.ts                   # Module racine
├── app.controller.ts               # Health check
└── main.ts                         # Bootstrap + CORS
```

## Cache

- **Géocodage** : cache mémoire (Map) permanent pendant la durée de vie du process
- **Événements** : cache avec TTL de 5 minutes pour éviter de rappeler Baserow à chaque requête (30 secondes tant qu'une table de référence est en erreur)
- **Délai de la modération** : un événement passé à la valeur de modération visible dans Baserow (ou retiré de celle-ci) n'apparaît (ou ne disparaît) qu'à l'expiration du cache, soit **au plus 5 minutes plus tard**, ou immédiatement après un redémarrage du backend. Il n'existe pas d'invalidation exposée.

## Sécurité

- Le jeton Baserow reste côté serveur (variable d'env `BASEROW_API_TOKEN`)
- CORS : méthode GET seulement ; `CORS_ORIGIN` (liste séparée par des virgules) restreint les origines, absent ou `*` autorise toutes les origines
- Uniquement des opérations GET (lecture seule sur Baserow)
