# DEVPLAN - La Grande Semaine Végétale

## Objectif
Adapter l'application interactive pour promouvoir une alimentation végétale accessible, dans le cadre de "La Grande Semaine Végétale". L'application affiche les événements (ateliers cuisine, dégustations, conférences) sur une carte interactive performante.

## Étapes de développement

### Phase 1 : Migration Branding & Design System (Mai 2026)
- [x] 1.1 Mise à jour de la charte graphique (Couleurs Green/Beige, Fonts Inter/Poppins)
- [x] 1.2 Adaptation des libellés et contenus (Remplacement Semaine IA -> Grande Semaine Végétale)
- [x] 1.3 Mise à jour de la documentation (README, DEVPLAN)
- [ ] 1.4 Adaptation des types d'événements (Ateliers cuisine, Dégustations, etc.)

### Phase 2 : Carte et Clustering (Hérité de Semaine IA)
- [x] 2.1 Intégration MapLibre GL JS
- [x] 2.2 Configuration react-map-gl
- [x] 2.3 Affichage carte de France centrée
- [x] 2.4 Clustering performant avec Supercluster

### Phase 3 : Interactions & Filtres (Hérité de Semaine IA)
- [x] 3.1 Popup détail événement
- [x] 3.2 Sidebar avec liste événements
- [x] 3.3 Synchronisation carte/liste
- [x] 3.4 Filtres par date, région, type d'événement et modalité
- [x] 3.5 Encarts DOM/TOM

### Phase 4 : Architecture Monorepo
- [x] 4.1 Setup monorepo TurboRepo + pnpm workspaces
- [x] 4.2 Backend NestJS (Proxy Airtable + Géocodage)
- [x] 4.3 Package partagé @make-map/types

### Phase 5 : Déploiement Scaleway
- [x] 5.1 Dockerisation (Frontend, Backend, Caddy)
- [x] 5.2 Script de déploiement automatisé
- [ ] 5.3 Déploiement final sur instance de production

## Progression
- **Date début adaptation** : 21 mai 2026
- **Statut** : Adaptation en cours 🔄
- **Dernière mise à jour** : 21 mai 2026
- **Changements clés** : 
  - Nouveau nom : La Grande Semaine Végétale
  - Charte graphique : Palette de verts (#3BAE5D, #1F7A3E, #A7D7B5)
  - Typographie : Inter & Poppins
  - Thématique : Alimentation durable et végétale
