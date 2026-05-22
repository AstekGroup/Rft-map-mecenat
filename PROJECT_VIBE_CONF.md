# Project Vibe & Strategy - La Grande Semaine Végétale

## Vision & Purpose
Promouvoir une alimentation végétale accessible, gourmande et durable à travers une série d'événements nationaux.

## MVP Carte Interactive - La Grande Semaine Végétale
**Objectif** : Permettre aux citoyens de trouver facilement des événements près de chez eux.

Application React standalone pour afficher les événements sur une carte de France interactive. Le design reprend la charte graphique LGSV (Palette de verts, typographie Poppins/Inter) tout en proposant une UX moderne et performante.

- **Client** : La Grande Semaine Végétale
- **Type** : POC / MVP
- **Data source** : API Airtable (via backend proxy)
- **Hébergement** : Scaleway DEV1-S

## Tech Stack Strategy
- **Frontend** : React + Vite + MapLibre GL JS + Supercluster + Tailwind CSS
- **Backend** : NestJS + Cache-manager + Geocoding (API Adresse)
- **Deployment** : Docker + Docker Compose + Caddy (Reverse Proxy + HTTPS)

## Branding Guidelines (LGSV)
- **Ton** : Pédagogique, accessible, écologique, engageant.
- **Couleurs** : Vert Principal (#3BAE5D), Vert Foncé (#1F7A3E), Beige (#F2EDE4).
- **Typography** : Poppins (Titres), Inter (Corps).
