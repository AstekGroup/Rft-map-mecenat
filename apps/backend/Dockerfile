# ============================================================
# Multi-stage build pour le backend NestJS
# Utilise `pnpm deploy` pour créer un bundle isolé
# avec tous les node_modules résolus (pas de symlinks).
# ============================================================

# --- Stage 1 : Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les fichiers de config monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copier les packages nécessaires
COPY shared/types/ shared/types/
COPY apps/backend/ apps/backend/

# Installer pnpm et les dépendances
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --frozen-lockfile --filter @make-map/backend...

# Build TypeScript
RUN cd apps/backend && pnpm build

# Créer un bundle isolé avec pnpm deploy (résout tous les symlinks)
RUN pnpm deploy --filter @make-map/backend --prod /app/deployed

# --- Stage 2 : Production ---
FROM node:20-alpine
WORKDIR /app

# Copier le bundle isolé
COPY --from=builder /app/deployed/node_modules ./node_modules
COPY --from=builder /app/deployed/package.json ./

# Copier le dist buildé
COPY --from=builder /app/apps/backend/dist ./dist

# Config de la carte (app.config-<CARTE>.json), embarquée : une image = une carte.
# Pas de valeur par défaut : l'argument est obligatoire (le compose refuse un build sans APP_CONFIG_FILE).
ARG APP_CONFIG_FILE
COPY ${APP_CONFIG_FILE} /app/app.config.json
ENV APP_CONFIG_PATH=/app/app.config.json

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check (utilise 127.0.0.1 car localhost peut résoudre en IPv6 sur Alpine)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "dist/main.js"]
