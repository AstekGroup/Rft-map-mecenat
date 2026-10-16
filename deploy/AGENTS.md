# AGENTS.md — déploiement

[← Instructions racine](../AGENTS.md) · [README déploiement](./README.md) · [Bilan de la refonte](../docs/audit/SUIVI.md)

## Contexte

**Docker Compose** + **Caddy** (HTTPS) + frontend statique (Nginx) + backend NestJS, sur instance type **Scaleway DEV1-S**.

## Fichiers utiles

- [README.md](./README.md) — procédure complète (SSH, secrets, domaine).
- Scripts racine : `pnpm deploy:v2`, `pnpm deploy:scw` (`scripts/deploy-v2.sh`, `scripts/deploy.sh`).
- `deploy/baserow-local/docker-compose.yml` — Baserow **local jetable** pour le développement (pas la production).

## Règles (cohérentes avec la refonte « 1 code / N cartes »)

1. **Une carte = une configuration de déploiement** (fichier de config + variables d'environnement), **pas un fork du code**. Tout déploiement doit pouvoir fournir son `app.config.json` (volume ou `APP_CONFIG_PATH`) à l'image backend, et lancer le build front avec la même config (le script `update-index-html.cjs` en dépend).
2. **Variables Baserow, pas Airtable.** Les variables `AIRTABLE_*` encore présentes dans `docker-compose.prod.yml` / `.env.prod.example` sont **obsolètes** : à remplacer par `BASEROW_*` (voir liste dans [apps/backend/AGENTS.md](../apps/backend/AGENTS.md)).
3. **Embarquement iframe (WordPress)** : restreindre via `Content-Security-Policy: frame-ancestors <domaine WordPress>` dans le `Caddyfile` ; le commentaire de `nginx.conf` dit que c'est géré par Caddy alors qu'**aucun en-tête n'y est défini** (preuve : [03-validation](../docs/audit/03-validation.md) §4). Ne pas supposer que c'est en place.
4. **Build reproductible** : les Dockerfiles utilisent `--frozen-lockfile` ; le lockfile doit être à jour avant de déployer (il est périmé à ce jour). Un `docker build` réel n'a **pas** été exécuté dans le bilan (non vérifié).
5. **Ne jamais exposer `devMode`** ni le jeton Baserow ; ne pas committer de secrets (mécanismes documentés : `envmap`, fichiers `.env` non versionnés).
6. Après un changement d'infra, mettre à jour **ce dossier** et le [README.md](./README.md).
