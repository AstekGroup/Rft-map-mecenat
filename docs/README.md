# Documentation de la refonte

Tout ce dossier décrit l'état **courant** du projet. Une photo datée qui n'est plus vraie est supprimée (l'historique reste dans git), pas conservée à côté.

| Document | Rôle | Quand le lire |
|---|---|---|
| [verdict.md](verdict.md) | Vérification du 2026-10-19 : la philosophie est-elle respectée, où en est-on | Pour l'état global |
| [audit/SUIVI.md](audit/SUIVI.md) | État d'avancement, décisions en vigueur, points ouverts, prochaine action | **Début et fin de chaque session** |
| [audit/PLAN-FIN-REFONTE.md](audit/PLAN-FIN-REFONTE.md) | Plan actif pour finir la refonte (hors déploiement), avec cases à cocher | Début de session |
| [audit/PLAN-SESSIONS.md](audit/PLAN-SESSIONS.md) | Workflow Git, décisions, historique des sessions 0 à 8 | Pour le workflow Git et le contexte |
| [audit/PERIMETRE-CONFIG-BASEROW.md](audit/PERIMETRE-CONFIG-BASEROW.md) | Qui porte quoi : config, Baserow, code, environnement ; règles des filtres | Avant d'ajouter une clé de config ou un champ |
| [audit/BASEROW-LOCAL.md](audit/BASEROW-LOCAL.md) | Baserow local jetable, seed, cas limites, tests de robustesse | Pour lancer le projet en local |
| [audit/JOURNAL.md](audit/JOURNAL.md) | Journal daté des commandes et preuves, session par session (ajout seulement) | Pour retrouver une preuve |
| [audit/fixtures/](audit/fixtures/) | Seconde config de référence (`app.config.second-map.json`) et son générateur | Tests « deux cartes », vérification manuelle |

Consignes pour les agents : [../AGENTS.md](../AGENTS.md) (racine) et les `AGENTS.md` de chaque zone.

**Règle de maintenance** : en fin de session, mettre à jour `audit/SUIVI.md` et `audit/PLAN-FIN-REFONTE.md` ; ajouter les preuves dans `audit/JOURNAL.md` ; si un document devient faux, le corriger ou le supprimer dans la même PR.
