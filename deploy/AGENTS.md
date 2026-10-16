# AGENTS.md — déploiement

[← Instructions racine](../AGENTS.md) · [README déploiement](./README.md) · [Suivi de la refonte](../docs/audit/SUIVI.md)

> Le déploiement est traité **en dernier** (session 8 du [plan](../docs/audit/PLAN-SESSIONS.md)). Ne pas y toucher avant, hors mise à jour des variables d'environnement (session 2).

## Contexte

**Docker Compose** + **Caddy** (HTTPS) + frontend statique (Nginx) + backend NestJS, sur instance type **Scaleway DEV1-S**.

## Fichiers utiles

- [README.md](./README.md) — procédure complète (SSH, secrets, domaine).
- Scripts racine : `pnpm deploy:v2`, `pnpm deploy:scw` (`scripts/deploy-v2.sh`, `scripts/deploy.sh`).
- `deploy/baserow-local/docker-compose.yml` — Baserow **local jetable** pour le développement (pas la production).

## Règles (cohérentes avec la refonte « 1 code / N cartes »)

1. **Une carte = une configuration de déploiement** (fichier de config + variables d'environnement), **pas un fork du code**. Tout déploiement doit pouvoir fournir son `app.config.json` (volume ou `APP_CONFIG_PATH`) à l'image backend, et lancer le build front avec la même config (le script `update-index-html.cjs` en dépend). Les images n'embarquent pas encore `app.config.json` : session 8.
2. **Variables `BASEROW_*`** (liste dans [apps/backend/AGENTS.md](../apps/backend/AGENTS.md)) dans `docker-compose.prod.yml`, `.env.prod.example`, `.envmap.yaml` et `scripts/deploy-v2.sh`. Aucun test de déploiement n'a été fait.
3. **Embarquement iframe (WordPress)** : l'iframe reste telle quelle. Aucun travail sur WordPress ni sur `frame-ancestors` dans ce plan.
4. **Build reproductible** : les Dockerfiles utilisent `--frozen-lockfile` ; le lockfile est à jour. Aucun `docker build` réel n'a été exécuté à ce jour (non vérifié) : session 8.
5. **Ne jamais exposer `devMode`** ni le jeton Baserow ; ne pas committer de secrets (mécanismes documentés : `envmap`, fichiers `.env` non versionnés).
6. Après un changement d'infra, mettre à jour **ce dossier** et le [README.md](./README.md).
