# Backend API - La Grande Semaine Végétale

Backend NestJS servant de proxy sécurisé pour l'API Baserow. Gère la transformation des données, le géocodage et le cache.

**Assistants IA** : [AGENTS.md](./AGENTS.md) dans ce dossier ; index global [AGENTS.md](../../AGENTS.md).

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
| `GET /api/config`              | Configuration de l'application à partir du fichier app.config.json |
| `GET /api/events`              | Liste tous les événements (géocodés, filtrés)                      |
| `GET /api/events?devMode=true` | Liste tous les événements (sans filtre modération)                 |
| `GET /api/events/:id`          | Détail d'un événement par son ID Baserow                           |
| `GET /api/events/partners`     | Liste des partenaires                                              |
| `GET /api/events/themes`       | Liste des thèmes                                                   |
| `GET /api/events/formats`      | Liste des formats                                                  |
| `GET /api/events/publics`      | Liste des publics cible                                            | |
| `GET /api/health`              | Health check                                                       |

## Configuration

Copier `.env.example` en `.env` :

```bash
cp .env.example .env
```

Variables requises :

```env
BASEROW_API_URL=votre_url_baserow
BASEROW_API_TOKEN=votre_token_baserow
BASEROW_EVENT_TABLE_ID=votre_id_table_evenements
BASEROW_PARTNERS_TABLE_ID=votre_id_table_partenaires
BASEROW_MODERATION_FIELD_ID=votre_id_champ_moderation_table_evenement
BASEROW_THEMATIQUES_TABLE_ID=votre_id_table_Thematiques
BASEROW_FORMATS_TABLE_ID=votre_id_table_Formats
BASEROW_PUBLICS_TABLE_ID=votre_id_table_Publics
PORT=3000
```

## Développement

```bash
# Depuis la racine du monorepo
pnpm back:dev

# Ou directement
cd apps/backend
pnpm dev
```

## Architecture

```
src/
├── baserow/
│   ├── baserow.module.ts
│   ├── baserow.service.ts         # Fetch paginé + transformation
│   ├── baserow.types.ts           # Interface BaserowRecord
│   └── baserow-mapping.util.ts    # Mapping champs Baserow → types internes
├── config/
│   ├── config.module.ts
│   ├── config.controller.ts        # REST endpoints
│   └── config.service.ts           # Chargement à partir du fichier app.config.json 
├── geocoding/
│   ├── geocoding.module.ts
│   ├── geocoding-cache.store.ts    # Cache persistant (fichier JSON, écriture atomique)
│   └── geocoding.service.ts        # API BAN + cache (résultats et échecs)
├── events/
│   ├── events.module.ts
│   ├── events.controller.ts        # REST endpoints
│   └── events.service.ts           # Orchestration + cache TTL 5min rafraîchi en arrière-plan
├── app.module.ts                   # Module racine
├── app.controller.ts               # Health check
└── main.ts                        # Bootstrap + CORS
```

## Cache

- **Géocodage** : cache **persistant** dans un fichier JSON (`GEOCODING_CACHE_PATH`, par défaut `.cache/geocoding.json` dans le répertoire du backend ; `/data/geocoding.json` sur un volume Docker en production). Clé = adresse + code postal + ville normalisés : une adresse modifiée dans Baserow est une nouvelle clé, géocodée au chargement suivant. Les échecs sont mémorisés (adresse introuvable : nouvelle tentative après 24 h ; erreur HTTP ou réseau : 1 h). Les adresses inutilisées depuis 30 jours sont retirées à l'écriture. Fichier absent, illisible (mis de côté en `.corrompu-<date>`) ou non inscriptible : le backend démarre quand même, en mémoire seule, avec un avertissement.
- **Événements** : cache avec TTL de 5 minutes (30 secondes tant qu'une table de référence est en erreur). Il est **rafraîchi en arrière-plan** : chargement au démarrage, puis vérification toutes les 30 secondes. Un visiteur reçoit toujours la liste déjà prête ; les requêtes simultanées sur un cache vide partagent un seul chargement. Si Baserow est injoignable, la liste précédente est conservée (nouvelle tentative toutes les 30 secondes) pendant **1 heure au plus**, puis l'API répond en erreur.
- **Délai de la modération** : un événement passé à la valeur de modération visible dans Baserow (ou retiré de celle-ci) n'apparaît (ou ne disparaît) qu'au rafraîchissement suivant, soit **environ 5 minutes plus tard (jusqu'à 5 min 30)**, ou dès le démarrage du backend. Il n'existe pas d'invalidation exposée.
- **Compression** : les réponses de l'API sont compressées en gzip (middleware `compression` dans `main.ts`), en local comme en production.

## Sécurité

- Le jeton Baserow reste côté serveur (variable d'env `BASEROW_API_TOKEN`)
- CORS configuré pour accepter uniquement les origines autorisées
- Uniquement des opérations GET (lecture seule sur Baserow)
