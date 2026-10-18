# Project Vibe & Strategy - Make Map

## Vision & Purpose
Permettre à n'importe quel événement national ou local de publier sa **carte interactive** : **1 code, N cartes**. Une carte = un événement (dates, marque, titres, données propres). Ce qui diffère d'une carte à l'autre vit dans un fichier de config (`app.config.json`) et dans Baserow, jamais dans le code.

## MVP Carte Interactive
**Objectif** : permettre aux citoyens de trouver facilement des événements près de chez eux.

Application React pour afficher les événements sur une carte de France interactive, avec une UX moderne et performante. L'identité visuelle (palette, polices) et les textes de chaque carte viennent de sa config.

- **Type** : POC / MVP
- **Data source** : API Baserow (via backend proxy, lecture seule)
- **Hébergement** : Scaleway DEV1-S

## Tech Stack Strategy
- **Frontend** : React + Vite + MapLibre GL JS + Supercluster + Tailwind CSS
- **Backend** : NestJS + cache mémoire + Geocoding (API Adresse)
- **Deployment** : Docker + Docker Compose + Caddy (Reverse Proxy + HTTPS)

## Branding
La marque d'une carte (nom, ton, couleurs, polices, logo) n'est **pas** décrite ici : elle vit dans la config de la carte (`app.*`, `texts.*`, `theme.*`). Voir [docs/audit/PERIMETRE-CONFIG-BASEROW.md](docs/audit/PERIMETRE-CONFIG-BASEROW.md) pour savoir qui porte quoi, et [AGENTS.md](AGENTS.md) pour les règles de contribution.
