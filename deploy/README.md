# Déploiement — une carte par VPS

Guide de déploiement de l'application Make Map : **un VPS = une carte = un fichier de config = un Baserow dédié auto-hébergé**.

Consignes déploiement pour assistants IA : [AGENTS.md](./AGENTS.md) ; index monorepo [AGENTS.md](../AGENTS.md).

## Architecture

```
Instance Scaleway DEV1-M minimum (4 Go RAM ; Baserow demande ~4 Go)
├── Caddy (reverse proxy HTTPS, ports 80/443)
│   ├── https://<DOMAIN>          → Frontend Nginx (3080) + /api/* → Backend NestJS (8080)
│   └── https://<BASEROW_DOMAIN>   → Baserow (80, interface de l'équipe)
├── Frontend Nginx (fichiers statiques React, config de la carte embarquée au build)
├── Backend NestJS (proxy Baserow + géocodage ; appel interne http://baserow)
├── Baserow 2.4.1 (événements et référentiels de la carte, volume baserow_data)
└── baserow-init (profile « init » : schéma seul au premier déploiement)
```

- **Une image = une carte** : le fichier `app.config-<CARTE>.json` est copié dans les images backend et frontend au build (`APP_CONFIG_FILE`). Aucune valeur de repli : sans ce fichier, le build échoue.
- **Les secrets générés restent sur le VPS**, dans `deploy/instance/` (hors rsync, hors git, jamais régénérés) : voir « Secrets » ci-dessous.

## Ajouter une carte

1. Créer `app.config-<CARTE>.json` à la racine du dépôt (copier `app.config.json` et adapter : identité, titres, dates, design, mapping Baserow).
2. Importer ce fichier dans `shared/types/tests/app-config.contract.test-d.ts` (contrat de config, voir le commentaire du fichier).
3. Dupliquer un environnement envmap : `envmap set --env prod-<carte> ...` (voir « Prérequis » ci-dessous, mêmes clés).
4. Créer un VPS (DEV1-M minimum), y installer Docker, faire pointer le DNS des **deux** domaines vers son IP.
5. Déployer : `pnpm deploy:v2 <CARTE>`.

## Prérequis (par carte)

| Élément | Détail |
|---|---|
| Instance Scaleway | **DEV1-M minimum** (4 Go : Baserow est trop lourd pour DEV1-S), Docker installé (`curl -fsSL https://get.docker.com \| sh`) |
| Clé SSH | configurée pour `root@<IP>` (ou `DEPLOY_USER` exporté) |
| DNS | `<DOMAIN>` (la carte) et `<BASEROW_DOMAIN>` (Baserow) pointent vers l'IP |
| envmap `prod-<carte>` | `SCW_INSTANCE_IP`, `DOMAIN`, `BASEROW_DOMAIN`, `BASEROW_ADMIN_EMAIL` (+ `CORS_ORIGIN` optionnel) |

```bash
envmap set --env prod-lgsv SCW_INSTANCE_IP --prompt
envmap set --env prod-lgsv DOMAIN --prompt              # ex: map.lgsv.example.org
envmap set --env prod-lgsv BASEROW_DOMAIN --prompt       # ex: baserow.lgsv.example.org
envmap set --env prod-lgsv BASEROW_ADMIN_EMAIL --prompt  # compte admin Baserow de l'instance
```

## Premier déploiement

```bash
pnpm deploy:v2 <CARTE>
```

Le script :

1. valide la carte (`app.config-<CARTE>.json` présent et lisible) et les secrets envmap ;
2. rsync le code vers `/opt/make-map` (**`deploy/instance/` est préservé** : secrets de l'instance) ;
3. **garde-fou une carte par VPS** : si `deploy/instance/instance.env` désigne une autre carte, il refuse ;
4. au premier déploiement, génère sur le VPS la `SECRET_KEY` Baserow et le mot de passe admin (`openssl`) ;
5. démarre Baserow puis lance `baserow-init` : **schéma seul** (5 tables vides, colonnes suivant la config), compte admin, inscriptions publiques fermées, jeton **lecture seule**, écrit `deploy/instance/backend.env` ;
6. build et démarre tous les services, redémarre Caddy, vérifie la santé du backend.

À la fin, le script affiche les URLs de la carte, de l'API, et (premier déploiement) l'e-mail admin et où lire le mot de passe. **Les référentiels et les événements sont ensuite saisis dans Baserow** (aucune ligne n'est créée par l'init) ; seuls les filtres dont la table est vide se masquent d'eux-mêmes côté carte.

## Mises à jour

```bash
pnpm deploy:v2 <CARTE>
```

Le script réutilise tels quels les secrets de `deploy/instance/`. L'init n'est relancé que si `backend.env` est absent ; relancé manuellement (`docker compose --profile init run --rm baserow-init`), il est **idempotent** et refuse en mode strict toute colonne existante incompatible (création seule, jamais de modification ni suppression).

## Opérations courantes (sur le VPS)

Toutes les commandes `docker compose` passent par `--env-file .env.prod` (écrit par le script de déploiement, jamais à la main) :

```bash
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml --env-file .env.prod ps"
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f"           # tous les services
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f backend"   # un service
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml --env-file .env.prod restart"
ssh root@$IP "cd /opt/make-map/deploy && docker compose -f docker-compose.prod.yml --env-file .env.prod down"               # sans -v (garder les données)
```

## Secrets (où ils vivent)

| Fichier | Où | Contenu | Qui l'écrit |
|---|---|---|---|
| `.envmap.yaml` / envmap | poste local | `SCW_INSTANCE_IP`, `DOMAIN`, `BASEROW_DOMAIN`, `BASEROW_ADMIN_EMAIL` | à la main (une entrée par carte) |
| `deploy/.env.prod` | VPS | `APP_CONFIG_FILE`, `DOMAIN`, `BASEROW_DOMAIN`, `BASEROW_PUBLIC_URL`, `CORS_ORIGIN` | `scripts/deploy-v2.sh` (aucun secret) |
| `deploy/instance/baserow.env` | VPS (chmod 600) | `SECRET_KEY` Baserow, e-mail + mot de passe admin | `deploy-v2.sh` au **premier** déploiement, jamais régénéré |
| `deploy/instance/backend.env` | VPS | `BASEROW_API_URL` (**interne** : `http://baserow`), `BASEROW_API_TOKEN` (lecture seule), IDs de tables et du champ de modération | `scripts/baserow-init/init.mjs` |
| `deploy/instance/instance.env` | VPS | `CARTE=<nom>` (garde-fou une carte par VPS) | `deploy-v2.sh` au premier déploiement |

Récupérer le mot de passe admin Baserow : `ssh root@$IP "cat /opt/make-map/deploy/instance/baserow.env"`.

`deploy/instance/` est ignoré par git et exclu du rsync : **perdre le VPS = perdre les données** (voir Sauvegarde).

## Variables d'environnement

Voir [`.env.prod.example`](./.env.prod.example) : variables de `deploy/.env.prod` (écrit par le script) et ce qui vit uniquement sur le VPS. Les variables `BASEROW_*` du backend ne sont **plus** dans envmap ni `.env.prod` : elles sont générées sur le VPS par l'init (jeton lecture seule + IDs). Liste complète côté backend : [../apps/backend/.env.example](../apps/backend/.env.example).

## Sauvegarde

- Les données de la carte vivent dans le **volume Docker `baserow_data`** du VPS : au minimum, activer les **snapshots Scaleway** de l'instance (ou de son volume).
- Une sauvegarde applicative plus fine (export Baserow) reste à définir (non fait).

## Coût

| Poste | Coût mensuel |
|---|---|
| Instance DEV1-M (4 Go) | ~23 EUR |
| Stockage SSD | inclus |
| Trafic sortant | inclus |
| **Total par carte** | **~23 EUR/mois** |

## Non vérifié

- Déploiement réel sur un VPS Scaleway (testé en local : compose complet, build des deux images, init, Caddy) ; garde-fou « autre carte » vérifié par lecture du script, pas en conditions réelles.
- Montée de version de Baserow (image `baserow/baserow:2.4.1` figée dans le compose).
