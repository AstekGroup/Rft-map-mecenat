# AGENTS.md — racine (make-map)

Ce dépôt suit le format ouvert [AGENTS.md](https://agents.md/) : instructions dédiées aux agents de code, complémentaires au [README.md](./README.md) humain. Les agents lisent en priorité l'`AGENTS.md` **le plus proche** du fichier modifié (liens en bas).

## Philosophie de la refonte (à respecter pour tout changement)

Ce dépôt est **1 seul code pour N cartes** d'événements (une carte = un événement : dates, marque, textes, fonctionnalités propres). Il remplace des copies du projet adaptées à la main, qui ont dérivé. Chaque changement doit rapprocher le code de ce modèle, jamais l'en éloigner.

1. **Un code, N cartes.** Aucune branche, copie de dossier ni `if (carte === …)` par événement. Ce qui diffère d'une carte à l'autre vit dans **le fichier de config de la carte** (`app.config.json`, `profile`) ou dans **Baserow**, jamais dans le code.
2. **Tout ce qui varie passe par la config** : identité (nom, URL, e-mail de contact, logo), **textes** (toutes les clés `texts.*`, pas de libellé en dur dans les composants), **dates** de l'événement, **design** (couleurs, polices, rayons, ombres), paramètres de carte (centre, zoom, styles, clustering), **filtres affichés**, **fonctionnalités**.
3. **Toute nouvelle fonctionnalité est un flag de config** (`features.<nom>`), **désactivé par défaut**, documenté dans le type `AppConfig` (`shared/types/src/app-config.ts`). Une fonctionnalité propre à un seul événement n'entre pas « en dur » dans le cœur.
4. **Aucun nom de champ Baserow en dehors du mapping.** Les noms de colonnes sont dans `baserow.fieldMapping` de la config ; pas de valeur de repli française dans le code (`fm.x || 'Ville du lieu'` est interdit). Les identifiants de tables restent dans l'environnement du backend.
5. **Les référentiels viennent de Baserow** (formats, publics, thématiques, partenaires : libellés, couleurs, pictos). Pas de liste de libellés métier dans le code.
6. **Dégradation propre, jamais de casse silencieuse.** Un champ renommé, une table absente, une config incomplète ou un champ de modération manquant ne doivent ni faire planter la carte (HTTP 500), ni la rendre publique par défaut, ni vider des données **sans avertissement**. Valider la config et le schéma au démarrage, journaliser clairement, appliquer un repli explicite.
7. **Codé en dur = refus en revue.** Voir la checklist ci-dessous. Si un compromis est inévitable, l'inscrire dans `docs/audit/07-plan-de-suite.md` (dette tracée) plutôt que le cacher.

> **Écart connu entre ces règles et le code actuel** : la refonte est **partielle**. Le code contient encore de la marque LGSV, des textes, des couleurs, des régions et des noms de champs en dur (liste prouvée avec `fichier:ligne` dans [docs/audit/04-cartographie.md](./docs/audit/04-cartographie.md)). Ne pas copier ces patterns existants : ce sont des dettes, pas des modèles.

## Règles globales (tout le monorepo)

1. **Baserow** : **lecture seule** depuis l'application (le backend ne fait que des `GET`) ; jeton uniquement côté backend (`BASEROW_API_TOKEN`), jamais dans le front ni dans le dépôt. Exception documentée : les scripts de `scripts/seed-baserow/` écrivent dans une instance **Docker locale jetable** (ne jamais les pointer vers un Baserow réel).
2. **Modération** : un événement n'est public que s'il porte la valeur de modération configurée (`baserow.moderationVisibleValue`). En cas de doute (champ manquant, valeur vide), **masquer**, ne pas publier. Le mode `devMode` ne doit pas être accessible publiquement en production.
3. **Langue** : interface et libellés **en français** ; code, commentaires techniques et noms d'identifiants peuvent rester en anglais.
4. **Git** : pas de push direct sur `main` ; une branche courte, une PR, suppression de la branche après merge. Noms en `kebab-case`, sans doublons (`modif_audience_filters` et `modify-audiences-filters` existaient en double).
5. **Portée** : changements ciblés ; pas de refactor gratuit hors demande.
6. **Preuves** : pour une affirmation sur l'état du projet, donner un `fichier:ligne` ou une commande exécutée ; sinon écrire « non vérifié ».

## Définition de terminé (checklist de PR)

- [ ] Aucune valeur propre à une carte dans le code : couleur, police, texte visible, date, e-mail/URL, nom de marque (`rg -i "lgsv|semaine|végétal|#[0-9a-f]{6}"` sur les fichiers modifiés).
- [ ] Aucun nom de champ Baserow ajouté hors `fieldMapping` ; aucun libellé de référentiel métier en dur.
- [ ] Nouveau texte → clé dans `texts.*` (type `AppConfig` + `app.config.json`), avec repli lisible si la clé manque.
- [ ] Nouvelle fonctionnalité → flag `features.*` **désactivé par défaut**, documenté, avec test des deux états.
- [ ] Cas dégradés couverts : donnée absente, champ renommé, config incomplète, API en erreur (pas de `Invalid Date`, pas de clé brute affichée, pas de 500 inutile).
- [ ] Types partagés (`shared/types`) mis à jour **avant** les consommateurs ; `pnpm build` de la racine passe.
- [ ] `pnpm lint` et `pnpm test` passent (voir « Commandes » : les scripts actuels ont des limites connues).
- [ ] Aucune variable d'environnement morte ou non documentée ; `.env.example` à jour.
- [ ] Si le changement touche la marque/config : vérifié avec **une seconde config** (voir `docs/audit/fixtures/`), sans toucher au code.
- [ ] Docs concernées mises à jour (README de la zone, `docs/audit/SUIVI.md` si c'est un item du backlog).

## Où travailler : fichiers AGENTS par zone

| Zone | Fichier |
| --- | --- |
| Frontend React + carte | [apps/frontend/AGENTS.md](./apps/frontend/AGENTS.md) |
| API NestJS + Baserow + géocodage | [apps/backend/AGENTS.md](./apps/backend/AGENTS.md) |
| Types partagés `@make-map/types` (dont le type `AppConfig`) | [shared/types/AGENTS.md](./shared/types/AGENTS.md) |
| Déploiement Docker / Scaleway | [deploy/AGENTS.md](./deploy/AGENTS.md) |
| Bilan de la refonte, constats prouvés, backlog | [docs/audit/](./docs/audit/) (commencer par `SUIVI.md`) |

## Commandes (depuis la racine)

| Objectif | Commande |
| --- | --- |
| Frontend + backend | `pnpm dev` |
| Frontend seul / backend seul | `pnpm front:dev` · `pnpm back:dev` |
| Build / lint / tests | `pnpm build` · `pnpm lint` · `pnpm test` |
| Baserow local jetable + données de test | voir [docs/audit/02-baserow-seed.md](./docs/audit/02-baserow-seed.md) |

Limites connues (preuves dans [docs/audit/01-lancement.md](./docs/audit/01-lancement.md)) : `pnpm build` peut échouer sur le frontend (types partagés) ; le lint frontend n'est pas configuré ; `pnpm lint` du backend utilise `--fix` (modifie les fichiers) ; `pnpm test` ne couvre pas `shared/types`. Ne pas contourner ces échecs sans le dire.

Environnement : `apps/backend/.env.example` et `apps/frontend/.env.example` (le backend lit `BASEROW_API_URL`, `BASEROW_API_TOKEN`, `BASEROW_EVENT_TABLE_ID`, `BASEROW_MODERATION_FIELD_ID`, `BASEROW_PARTNERS_TABLE_ID`, `BASEROW_THEMATIQUES_TABLE_ID`, `BASEROW_FORMATS_TABLE_ID`, `BASEROW_PUBLICS_TABLE_ID`, `PORT`, `CORS_ORIGIN`, `APP_CONFIG_PATH`).

## Documentation associée

- [docs/audit/SUIVI.md](./docs/audit/SUIVI.md) — état du bilan de la refonte, décisions, prochaine action.
- [CLAUDE.md](./CLAUDE.md) — architecture et flux de données (**contient des informations périmées**, voir [docs/audit/06-agents.md](./docs/audit/06-agents.md) ; en cas de conflit, ce fichier-ci et le code font foi).
- [PROJECT_VIBE_CONF.md](./PROJECT_VIBE_CONF.md) — type de projet.
