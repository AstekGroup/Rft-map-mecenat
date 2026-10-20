# AGENTS.md — déploiement

[← Instructions racine](../AGENTS.md) · [README déploiement](./README.md) · [Suivi de la refonte](../docs/audit/SUIVI.md)

> Session 8 **faite** (branche `feat/deploiement-n-cartes`) : une carte par VPS, config embarquée dans les images, Baserow dédié initialisé au premier déploiement. Voir [SUIVI.md](../docs/audit/SUIVI.md).

## Contexte

**Docker Compose** + **Caddy** (HTTPS) + frontend statique (Nginx) + backend NestJS + **Baserow auto-hébergé**, sur instance type **Scaleway DEV1-M minimum** (4 Go : Baserow est trop lourd pour DEV1-S). **Un VPS = une carte = un Baserow.**

## Fichiers utiles

- [README.md](./README.md) — procédure complète (ajouter une carte, premier déploiement, mises à jour, secrets, sauvegarde).
- Script de déploiement : `pnpm deploy:v2 <CARTE>` (`scripts/deploy-v2.sh` ; argument = nom de carte, sélectionne `app.config-<CARTE>.json` **et** l'environnement envmap `prod-<carte>`).
- `scripts/baserow-init/init.mjs` — initialisation du Baserow **de production** (schéma seul, tables vides ; compte admin, inscriptions fermées, jeton lecture seule, écrit `deploy/instance/backend.env`). Partage `scripts/seed-baserow/schema.mjs` avec le seed local.
- `deploy/baserow-local/docker-compose.yml` — Baserow **local jetable** pour le développement (pas la production).

## Règles (cohérentes avec la refonte « 1 code / N cartes »)

1. **Une carte = une configuration de déploiement** (fichier de config + variables d'environnement), **pas un fork du code**. Les images backend et frontend **embarquent** le fichier de config de la carte (`ARG APP_CONFIG_FILE`, copié en `/app/app.config.json`, lu via `ENV APP_CONFIG_PATH`) : aucun volume, aucune valeur de repli dans le compose (build refusé sans `APP_CONFIG_FILE`).
2. **Variables `BASEROW_*` du backend** (liste dans [apps/backend/AGENTS.md](../apps/backend/AGENTS.md)) : **plus dans envmap ni `.env.prod`**. Elles sont générées sur le VPS par `baserow-init` (jeton lecture seule + IDs de tables) dans `deploy/instance/backend.env`, jamais versionné. envmap ne porte que `SCW_INSTANCE_IP`, `DOMAIN`, `BASEROW_DOMAIN`, `BASEROW_ADMIN_EMAIL` (+ `CORS_ORIGIN` optionnel), un environnement `prod-<carte>` par carte.
3. **Secrets de l'instance** : `deploy/instance/` (baserow.env, backend.env, instance.env) vit uniquement sur le VPS — hors rsync, hors git, jamais régénéré. Le garde-fou `instance.env` (`CARTE=<nom>`) fait refuser le déploiement d'une autre carte sur le même VPS.
4. **L'appel du backend vers Baserow est interne** (`http://baserow`, `BASEROW_EXTRA_ALLOWED_HOSTS=baserow` requis) ; les URLs des visuels/logos sont construites par Baserow depuis `BASEROW_PUBLIC_URL` (constaté sur la 2.4.1).
5. **Embarquement iframe (WordPress)** : l'iframe reste telle quelle. Aucun travail sur WordPress ni sur `frame-ancestors`.
6. **Build reproductible** : Dockerfiles en `--frozen-lockfile`, lockfile à jour. Builds réels exécutés en local (commit 3 de la session 8) ; déploiement sur un vrai VPS : **non vérifié**.
7. **Ne jamais exposer `devMode`** ni le jeton Baserow ; ne pas committer de secrets (mécanismes documentés : `envmap`, `deploy/instance/` non versionné).
8. Après un changement d'infra, mettre à jour **ce dossier** et le [README.md](./README.md).
