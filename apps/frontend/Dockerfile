# ============================================================
# Multi-stage build pour le frontend React + Nginx
# ============================================================

# --- Stage 1 : Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les fichiers de config monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copier les packages nécessaires
COPY shared/types/ shared/types/
COPY apps/frontend/ apps/frontend/

# Installer pnpm et les dépendances
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --frozen-lockfile --filter @make-map/frontend...

# Config de la carte (app.config-<CARTE>.json), embarquée : une image = une carte.
# Le script d'index.html la lit via APP_CONFIG_PATH ; pas de valeur par défaut, l'argument est obligatoire.
ARG APP_CONFIG_FILE
COPY ${APP_CONFIG_FILE} /app/app.config.json
ENV APP_CONFIG_PATH=/app/app.config.json

# Variables de build (injectées dans le bundle JS par Vite)
# VITE_API_URL vide = appels relatifs (/api/events), proxiés par Caddy
ARG VITE_API_URL=""

ENV VITE_API_URL=${VITE_API_URL}

# Build production
RUN cd apps/frontend && pnpm build

# --- Stage 2 : Nginx pour servir les fichiers statiques ---
FROM nginx:alpine

# Copier les fichiers buildés
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Configuration Nginx : SPA fallback (toutes les routes -> index.html)
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3080

CMD ["nginx", "-g", "daemon off;"]
