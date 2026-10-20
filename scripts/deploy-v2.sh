#!/bin/bash

# ============================================================
# Déploiement d'une CARTE sur son VPS : une carte = un VPS = un
# fichier de config app.config-<CARTE>.json = un Baserow dédié.
# Usage : pnpm deploy:v2 <CARTE>      (ex. pnpm deploy:v2 LGSV)
#
# Prérequis :
#   - app.config-<CARTE>.json à la racine du dépôt ;
#   - envmap --env prod-<carte> : SCW_INSTANCE_IP, DOMAIN, BASEROW_DOMAIN,
#     BASEROW_ADMIN_EMAIL (CORS_ORIGIN optionnel) ;
#   - instance Scaleway (DEV1-M ou plus : Baserow demande ~4 Go) avec Docker,
#     clé SSH configurée, DNS des deux domaines pointé vers l'instance.
#
# Au PREMIER déploiement, le script génère et stocke sur le VPS
# (deploy/instance/, hors rsync et hors git, jamais régénéré) la SECRET_KEY
# Baserow et le mot de passe admin, puis initialise le Baserow de la carte
# (schéma seul, tables vides : scripts/baserow-init/init.mjs) qui écrit
# backend.env (jeton LECTURE SEULE, IDs de tables, URL publique).
# Les déploiements suivants réutilisent ces secrets tels quels.
#
# Garde-fou : si deploy/instance/instance.env désigne une autre carte,
# le script refuse (un VPS = une carte, jamais de mélange de données).
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Déploiement Make Map - une carte par VPS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================================
# 1. La carte : argument obligatoire, fichier de config présent et lisible
# ============================================================
CARTE="${1:-}"
if [ -z "$CARTE" ]; then
    echo -e "${RED}Usage : pnpm deploy:v2 <CARTE>  (ex. pnpm deploy:v2 LGSV)${NC}"
    echo "Une carte = app.config-<CARTE>.json à la racine du dépôt."
    exit 1
fi
CONFIG_FILE="app.config-${CARTE}.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Config introuvable : ${CONFIG_FILE} (à la racine du dépôt)${NC}"
    exit 1
fi
if ! node -e "JSON.parse(require('fs').readFileSync('${CONFIG_FILE}','utf8'))"; then
    echo -e "${RED}${CONFIG_FILE} illisible (JSON invalide)${NC}"
    exit 1
fi
ENV_NAME="prod-$(echo "$CARTE" | tr '[:upper:]' '[:lower:]')"

# ============================================================
# 2. Secrets d'entrée : envmap --env prod-<carte>, sinon variables d'environnement
# ============================================================
get_value() {
    local key="$1" value=""
    if command -v envmap &> /dev/null && [ -f ".envmap.yaml" ]; then
        value=$(envmap get --env "${ENV_NAME}" "$key" --raw 2>/dev/null | tr -d '\001' || true)
    fi
    echo "${value:-${!key:-}}"
}

SCW_INSTANCE_IP=$(get_value SCW_INSTANCE_IP)
DOMAIN=$(get_value DOMAIN)
BASEROW_DOMAIN=$(get_value BASEROW_DOMAIN)
BASEROW_ADMIN_EMAIL=$(get_value BASEROW_ADMIN_EMAIL)
CORS_ORIGIN=$(get_value CORS_ORIGIN)

for key in SCW_INSTANCE_IP DOMAIN BASEROW_DOMAIN BASEROW_ADMIN_EMAIL; do
    if [ -z "$(get_value $key)" ]; then
        echo -e "${RED}${key} non défini${NC}"
        echo "Renseigner : envmap set --env ${ENV_NAME} ${key} --prompt"
        echo "(ou exporter la variable) ; voir deploy/README.md"
        exit 1
    fi
done

DEPLOY_USER="${DEPLOY_USER:-root}"
REMOTE_DIR="/opt/make-map"
INSTANCE_DIR="${REMOTE_DIR}/deploy/instance"
BASEROW_PUBLIC_URL="https://${BASEROW_DOMAIN}"
CORS_ORIGIN="${CORS_ORIGIN:-https://${DOMAIN}}"
SSH_CMD="ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${SCW_INSTANCE_IP}"

echo -e "  Carte :     ${GREEN}${CARTE} (${CONFIG_FILE})${NC}"
echo -e "  Instance : ${GREEN}${DEPLOY_USER}@${SCW_INSTANCE_IP}${NC}"
echo -e "  Domaine :  ${GREEN}${DOMAIN}${NC}"
echo -e "  Baserow :  ${GREEN}${BASEROW_DOMAIN}${NC}"
echo ""

# ============================================================
# 3. Synchroniser le code (deploy/instance/ est préservé : secrets de l'instance)
# ============================================================
echo -e "${YELLOW}[1/5] Synchronisation des fichiers...${NC}"

$SSH_CMD "mkdir -p ${REMOTE_DIR}/deploy/instance"

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.turbo' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '*.md' \
  --exclude '.cursor' \
  --exclude '.vscode' \
  --exclude 'coverage' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.*.local' \
  --exclude '.envmap.yaml' \
  --exclude 'deploy/instance' \
  ./ ${DEPLOY_USER}@${SCW_INSTANCE_IP}:${REMOTE_DIR}/

echo -e "  ${GREEN}Fichiers synchronisés (deploy/instance/ préservé)${NC}"
echo ""

# ============================================================
# 4. Garde-fou une carte par VPS + secrets du premier déploiement
# ============================================================
echo -e "${YELLOW}[2/5] Instance (une carte par VPS)...${NC}"

REMOTE_CARTE=$($SSH_CMD "grep -E '^CARTE=' ${INSTANCE_DIR}/instance.env 2>/dev/null | cut -d= -f2" || true)
if [ -n "$REMOTE_CARTE" ] && [ "$REMOTE_CARTE" != "$CARTE" ]; then
    echo -e "${RED}Refus : ce VPS héberge la carte ${REMOTE_CARTE} (deploy/instance/instance.env), pas ${CARTE}.${NC}"
    echo "Un VPS = une carte (jamais de mélange de données). Utiliser le VPS de ${REMOTE_CARTE}, ou un autre VPS pour ${CARTE}."
    exit 1
fi

FIRST_DEPLOY=0
if [ -z "$REMOTE_CARTE" ]; then
    FIRST_DEPLOY=1
    echo -e "  ${YELLOW}Premier déploiement : génération des secrets de l'instance...${NC}"
    if ! command -v openssl &> /dev/null; then
        echo -e "${RED}openssl est requis pour générer les secrets${NC}"
        exit 1
    fi
    SECRET_KEY=$(openssl rand -base64 48 | tr -d '\n')
    BASEROW_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=\n' | cut -c1-20)
    $SSH_CMD "cat > ${INSTANCE_DIR}/baserow.env << 'ENVEOF'
SECRET_KEY=${SECRET_KEY}
BASEROW_ADMIN_EMAIL=${BASEROW_ADMIN_EMAIL}
BASEROW_ADMIN_PASSWORD=${BASEROW_ADMIN_PASSWORD}
ENVEOF
cat > ${INSTANCE_DIR}/instance.env << 'ENVEOF'
CARTE=${CARTE}
ENVEOF
chmod 600 ${INSTANCE_DIR}/baserow.env ${INSTANCE_DIR}/instance.env"
    echo -e "  ${GREEN}Secrets générés sur le VPS (${INSTANCE_DIR}/baserow.env, jamais versionnés)${NC}"
else
    echo -e "  ${GREEN}Instance de la carte ${REMOTE_CARTE} (secrets réutilisés)${NC}"
fi

# ============================================================
# 5. .env.prod sur le serveur (les secrets générés restent dans deploy/instance/)
# ============================================================
echo -e "${YELLOW}[3/5] Variables d'environnement...${NC}"

$SSH_CMD "cat > ${REMOTE_DIR}/deploy/.env.prod << 'ENVEOF'
APP_CONFIG_FILE=${CONFIG_FILE}
DOMAIN=${DOMAIN}
BASEROW_DOMAIN=${BASEROW_DOMAIN}
BASEROW_PUBLIC_URL=${BASEROW_PUBLIC_URL}
CORS_ORIGIN=${CORS_ORIGIN}
ENVEOF"

echo -e "  ${GREEN}.env.prod créé${NC}"
echo ""

# ============================================================
# 6. Baserow + initialisation (premier déploiement : schéma seul)
# ============================================================
echo -e "${YELLOW}[4/5] Baserow de la carte...${NC}"

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

# Premier démarrage de Baserow : 2 à 3 minutes (baserow-init attend la santé)
$SSH_CMD "cd ${REMOTE_DIR}/deploy && ${COMPOSE} up -d baserow"

if [ "$FIRST_DEPLOY" = "1" ] || ! $SSH_CMD "test -f ${INSTANCE_DIR}/backend.env"; then
    echo -e "  Initialisation du Baserow (schéma seul, jeton lecture seule)...${NC}"
    if ! $SSH_CMD "cd ${REMOTE_DIR}/deploy && ${COMPOSE} --profile init run --rm baserow-init"; then
        echo -e "${RED}Initialisation échouée${NC}"
        echo "Logs : ssh ${DEPLOY_USER}@${SCW_INSTANCE_IP} 'cd ${REMOTE_DIR}/deploy && ${COMPOSE} logs baserow'"
        exit 1
    fi
else
    echo -e "  ${GREEN}Baserow déjà initialisé (backend.env présent)${NC}"
fi

# ============================================================
# 7. Build et démarrage de tous les services
# ============================================================
echo -e "${YELLOW}[5/5] Build et démarrage des containers...${NC}"

$SSH_CMD "cd ${REMOTE_DIR}/deploy && \
    ${COMPOSE} up -d --build --remove-orphans && \
    ${COMPOSE} restart caddy"

echo -e "  ${GREEN}Containers démarrés${NC}"
echo ""

# ============================================================
# 8. Health check (backend : HTTP 200 même dégradé, la sonde ne redémarre pas le conteneur)
# ============================================================
echo -e "${YELLOW}Vérification du déploiement...${NC}"

echo -e "  Attente du backend..."
for i in $(seq 1 30); do
    if $SSH_CMD "cd ${REMOTE_DIR}/deploy && ${COMPOSE} exec -T backend wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/api/health 2>/dev/null" 2>/dev/null; then
        echo -e "  ${GREEN}Backend OK${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Backend non disponible après 30 tentatives${NC}"
        echo -e "Vérifiez les logs : ssh ${DEPLOY_USER}@${SCW_INSTANCE_IP} 'cd ${REMOTE_DIR}/deploy && ${COMPOSE} logs'"
        exit 1
    fi
    sleep 2
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Déploiement de ${CARTE} terminé !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "  Carte :    ${BLUE}https://${DOMAIN}${NC}"
echo -e "  API :      ${BLUE}https://${DOMAIN}/api/events${NC}"
echo -e "  Health :   ${BLUE}https://${DOMAIN}/api/health${NC}"
echo -e "  Baserow :  ${BLUE}https://${BASEROW_DOMAIN}${NC}"

if [ "$FIRST_DEPLOY" = "1" ]; then
    echo ""
    echo -e "  ${YELLOW}Premier déploiement :${NC}"
    echo -e "  - admin Baserow : ${BASEROW_ADMIN_EMAIL}"
    echo -e "  - mot de passe : ssh ${DEPLOY_USER}@${SCW_INSTANCE_IP} 'cat ${INSTANCE_DIR}/baserow.env'"
    echo -e "  - référentiels et événements à saisir dans Baserow (tables laissées vides)"
fi

echo ""
echo -e "  Logs : ssh ${DEPLOY_USER}@${SCW_INSTANCE_IP} 'cd ${REMOTE_DIR}/deploy && ${COMPOSE} logs -f'"
echo ""
