# Deploiement - Scaleway DEV1-S

Guide de deploiement de l'application Make Map sur une instance Scaleway DEV1-S avec Docker Compose.

Consignes déploiement pour assistants IA : [AGENTS.md](./AGENTS.md) ; index monorepo [AGENTS.md](../../AGENTS.md).

## Architecture

```
Instance Scaleway DEV1-S (2 vCPU, 2 Go RAM, ~11 EUR/mois)
├── Caddy (reverse proxy HTTPS, port 80/443)
│   ├── /       -> Frontend Nginx (port 3080)
│   └── /api/*  -> Backend NestJS (port 8080)
├── Frontend Nginx (fichiers statiques React)
└── Backend NestJS (proxy Baserow + Geocodage)
```

## Prerequis

1. **Instance Scaleway DEV1-S** creee avec Docker installe
2. **Cle SSH** configuree pour se connecter a l'instance
3. **envmap** configure avec les secrets de production
4. **Nom de domaine** pointe vers l'IP de l'instance (optionnel, sinon acces par IP)

## Premiere installation

### 1. Creer l'instance Scaleway

Via la console Scaleway ou la CLI :

```bash
scw instance server create \
  type=DEV1-S \
  image=ubuntu_jammy \
  name=make-map-prod \
  project-id=$SCW_PROJECT_ID
```

### 2. Installer Docker sur l'instance

```bash
ssh root@$IP "curl -fsSL https://get.docker.com | sh"
```

### 3. Configurer les secrets

```bash
envmap set --env prod SCW_INSTANCE_IP --prompt    # IP publique de l'instance
envmap set --env prod BASEROW_API_URL --prompt              # URL de l'instance Baserow
envmap set --env prod BASEROW_API_TOKEN --prompt            # Jeton de base de données Baserow
envmap set --env prod BASEROW_EVENT_TABLE_ID --prompt       # Table des événements
envmap set --env prod BASEROW_MODERATION_FIELD_ID --prompt  # Champ de modération
envmap set --env prod BASEROW_PARTNERS_TABLE_ID --prompt    # Table des partenaires
envmap set --env prod BASEROW_THEMATIQUES_TABLE_ID --prompt # Table des thématiques
envmap set --env prod BASEROW_FORMATS_TABLE_ID --prompt     # Table des formats
envmap set --env prod BASEROW_PUBLICS_TABLE_ID --prompt     # Table des publics
envmap set --env prod DOMAIN --prompt              # Domaine (ex: map.semaine-ia.fr)
```

### 4. Deployer

```bash
pnpm deploy:v2
```

## Mises a jour

Pour deployer une nouvelle version :

```bash
pnpm deploy:v2
```

Le script synchronise les fichiers, rebuild les containers Docker et les redemarre.

## Operations courantes

### Voir les logs

```bash
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml logs -f"
```

### Redemarrer les services

```bash
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml restart"
```

### Arreter les services

```bash
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml down"
```

### Voir l'etat des containers

```bash
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml ps"
```

## Variables d'environnement

Voir `deploy/.env.prod.example` pour la liste complete.

| Variable | Description | Exemple |
|----------|-------------|---------|
| `BASEROW_API_URL` | URL de l'instance Baserow | `https://baserow.example.org` |
| `BASEROW_API_TOKEN` | Jeton de base de données Baserow | `...` |
| `BASEROW_EVENT_TABLE_ID` | ID de la table des événements | `123` |
| `BASEROW_MODERATION_FIELD_ID` | ID du champ de modération | `456` |
| `BASEROW_PARTNERS_TABLE_ID` | ID de la table des partenaires | `124` |
| `BASEROW_THEMATIQUES_TABLE_ID` | ID de la table des thématiques | `125` |
| `BASEROW_FORMATS_TABLE_ID` | ID de la table des formats | `126` |
| `BASEROW_PUBLICS_TABLE_ID` | ID de la table des publics | `127` |
| `DOMAIN` | Nom de domaine | `map.semaine-ia.fr` |
| `CORS_ORIGIN` | Origines CORS autorisees | `*` |

## Cout

| Poste | Cout mensuel |
|-------|-------------|
| Instance DEV1-S | ~11 EUR |
| Stockage 20 Go SSD | inclus |
| Trafic sortant | inclus |
| **Total** | **~11 EUR/mois** |
