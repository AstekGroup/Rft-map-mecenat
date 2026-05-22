# Backend API - La Grande Semaine Végétale

Backend NestJS servant de proxy sécurisé pour l'API Airtable. Gère la transformation des données, le géocodage et le cache.

**Assistants IA** : [AGENTS.md](./AGENTS.md) dans ce dossier ; index global [AGENTS.md](../../AGENTS.md).

## Stack

| Technologie | Usage |
|-------------|-------|
| NestJS 11 | Framework API |
| TypeScript | Langage |
| @nestjs/config | Variables d'environnement |
| api-adresse.data.gouv.fr | Géocodage (API BAN) |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/events` | Liste tous les événements (géocodés, filtrés) |
| `GET /api/events?devMode=true` | Liste tous les événements (sans filtre modération) |
| `GET /api/events/:id` | Détail d'un événement par son ID Airtable |
| `GET /api/health` | Health check |

## Configuration

Copier `.env.example` en `.env` :

```bash
cp .env.example .env
```

Variables requises :

```env
AIRTABLE_API_KEY=votre_personal_access_token
AIRTABLE_BASE_ID=votre_base_id
AIRTABLE_TABLE_ID=votre_table_id
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
├── airtable/
│   ├── airtable.module.ts
│   ├── airtable.service.ts         # Fetch paginé + transformation
│   ├── airtable.types.ts           # Interface AirtableRecord
│   └── airtable-mapping.util.ts    # Mapping champs Airtable → types internes
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

- **Géocodage** : Cache mémoire (Map) permanent pendant la durée de vie du process
- **Événements** : Cache avec TTL de 5 minutes pour éviter de rappeler Airtable à chaque requête

## Sécurité

- Le token Airtable reste côté serveur (variable d'env `AIRTABLE_API_KEY`)
- CORS configuré pour accepter uniquement les origines autorisées
- Uniquement des opérations GET (lecture seule sur Airtable)
