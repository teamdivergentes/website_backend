#!/bin/bash

# Script de déploiement générique
# Usage: ./deploy.sh <environment> <image-name> <image-tag> <coolify-url> <coolify-api-key> <coolify-app-id>

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # reset

# Vérification des paramètres
if [ $# -ne 6 ]; then
    echo -e "${RED}❌ Usage: $0 <environment> <image-name> <image-tag> <coolify-url> <coolify-api-key> <coolify-app-id>${NC}"
    echo "   Exemple:"
    echo "     $0 PREPROD ghcr.io/org/app 1.0.0-abc123 https://coolify.example.com token app-id"
    exit 1
fi

ENVIRONMENT="$1"
IMAGE_NAME="$2"
IMAGE_TAG="$3"
COOLIFY_URL="$4"
COOLIFY_API_KEY="$5"
COOLIFY_APP_ID="$6"

# Extraire le tag de la version complète si nécessaire
if [[ "$IMAGE_TAG" == *":"* ]]; then
    # Si le tag contient déjà le nom de l'image, extraire seulement la partie tag
    IMAGE_TAG="${IMAGE_TAG##*:}"
fi

# Récupérer la configuration depuis devsecops.yml
if [[ -f "devsecops.yml" ]]; then
    TIMEOUT_MINUTES=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.timeout_minutes")
    CHECK_INTERVAL=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.check_interval_seconds")
    
    # Configuration curl
    CURL_CONNECT_TIMEOUT=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.curl.connect_timeout")
    CURL_MAX_TIME=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.curl.max_time")
    CURL_RETRY_COUNT=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.curl.retry_count")
    CURL_RETRY_DELAY=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.curl.retry_delay")
    CURL_RETRY_MAX_TIME=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.curl.retry_max_time")
    
    echo "📋 Configuration récupérée depuis devsecops.yml:"
    echo "   - Timeout: ${TIMEOUT_MINUTES} minutes"
    echo "   - Intervalle: ${CHECK_INTERVAL} secondes"
    echo "   - Curl timeout: ${CURL_CONNECT_TIMEOUT}s connexion, ${CURL_MAX_TIME}s max"
else
    echo "⚠️  Fichier devsecops.yml non trouvé, utilisation des valeurs par défaut"
    TIMEOUT_MINUTES=10
    CHECK_INTERVAL=15
    CURL_CONNECT_TIMEOUT=30
    CURL_MAX_TIME=60
    CURL_RETRY_COUNT=3
    CURL_RETRY_DELAY=2
    CURL_RETRY_MAX_TIME=120
fi

# Validation environnement
case "$ENVIRONMENT" in
    "PREPROD"|"PROD") ;;
    *)
        echo -e "${RED}❌ Environnement invalide: $ENVIRONMENT${NC}"
        echo "   Valeurs acceptées: PREPROD, PROD"
        exit 1
        ;;
esac

echo -e "${YELLOW}🚀 Déploiement $ENVIRONMENT${NC}"
echo "📦 Image: $IMAGE_NAME:$IMAGE_TAG"
echo "🏢 App ID: $COOLIFY_APP_ID"

# Étape 1: Mise à jour config Coolify
echo -e "${YELLOW}🔧 Mise à jour configuration...${NC}"
update_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  --connect-timeout $CURL_CONNECT_TIMEOUT \
  --max-time $CURL_MAX_TIME \
  --retry $CURL_RETRY_COUNT \
  --retry-delay $CURL_RETRY_DELAY \
  -X PATCH \
  "$COOLIFY_URL/api/v1/applications/$COOLIFY_APP_ID" \
  -H "Authorization: Bearer $COOLIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"docker_registry_image_name\": \"$IMAGE_NAME\",
    \"docker_registry_image_tag\": \"$IMAGE_TAG\",
    \"instant_deploy\": false
  }")

# Vérifier si curl a échoué pour la mise à jour
update_curl_exit_code=$?
if [ $update_curl_exit_code -ne 0 ]; then
    echo -e "${RED}❌ Erreur curl lors de la mise à jour config (code: $update_curl_exit_code)${NC}"
    exit 1
fi

http_status=$(echo "$update_response" | grep "HTTP_STATUS:" | cut -d: -f2)
if [ "$http_status" != "200" ]; then
    echo -e "${RED}❌ Erreur PATCH config (HTTP $http_status)${NC}"
    echo "$update_response"
    exit 1
fi
echo -e "${GREEN}✅ Configuration mise à jour${NC}"

# Étape 2: Déclencher le déploiement
echo -e "${YELLOW}🚀 Lancement du déploiement...${NC}"
deploy_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  --connect-timeout $CURL_CONNECT_TIMEOUT \
  --max-time $CURL_MAX_TIME \
  --retry $CURL_RETRY_COUNT \
  --retry-delay $CURL_RETRY_DELAY \
  -X GET \
  "$COOLIFY_URL/api/v1/deploy?uuid=$COOLIFY_APP_ID&force=false" \
  -H "Authorization: Bearer $COOLIFY_API_KEY")

# Vérifier si curl a échoué pour le déploiement
deploy_curl_exit_code=$?
if [ $deploy_curl_exit_code -ne 0 ]; then
    echo -e "${RED}❌ Erreur curl lors du déclenchement déploiement (code: $deploy_curl_exit_code)${NC}"
    exit 1
fi

http_status=$(echo "$deploy_response" | grep "HTTP_STATUS:" | cut -d: -f2)
if [ "$http_status" != "200" ]; then
    echo -e "${RED}❌ Erreur déclenchement déploiement (HTTP $http_status)${NC}"
    echo "$deploy_response"
    exit 1
fi

deploy_response_clean=$(echo "$deploy_response" | grep -v "HTTP_STATUS:")
deployment_uuid=$(echo "$deploy_response_clean" | jq -r '.deployments[0].deployment_uuid // empty')

if [ -z "$deployment_uuid" ]; then
    echo -e "${RED}❌ Impossible de récupérer l'UUID du déploiement${NC}"
    echo "$deploy_response_clean"
    exit 1
fi
echo -e "${GREEN}🆔 Déploiement lancé (UUID: $deployment_uuid)${NC}"

# Étape 3: Suivi du déploiement

MAX_RETRIES=$((TIMEOUT_MINUTES * 60 / CHECK_INTERVAL))

echo "⏱️ Timeout: ${TIMEOUT_MINUTES}min | Vérification toutes les ${CHECK_INTERVAL}s"

for i in $(seq 1 $MAX_RETRIES); do
    # Ajouter des timeouts et retries pour curl
    app_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
      --connect-timeout $CURL_CONNECT_TIMEOUT \
      --max-time $CURL_MAX_TIME \
      --retry $CURL_RETRY_COUNT \
      --retry-delay $CURL_RETRY_DELAY \
      --retry-max-time $CURL_RETRY_MAX_TIME \
      -X GET \
      "$COOLIFY_URL/api/v1/deployments/$deployment_uuid" \
      -H "Authorization: Bearer $COOLIFY_API_KEY")

    curl_exit_code=$?
    
    # Vérifier si curl a échoué
    if [ $curl_exit_code -ne 0 ]; then
        echo -e "[$i/$MAX_RETRIES] ${RED}Erreur curl (code: $curl_exit_code)${NC}"
        # Backoff progressif : 15s, 30s, 45s, etc.
        wait_time=$((CHECK_INTERVAL + (i * 5)))
        echo "⏳ Attente ${wait_time}s avant retry (backoff progressif)..."
        sleep $wait_time
        continue
    fi

    http_status=$(echo "$app_response" | grep "HTTP_STATUS:" | cut -d: -f2)
    app_response_clean=$(echo "$app_response" | grep -v "HTTP_STATUS:")

    if [ "$http_status" != "200" ]; then
        echo -e "[$i/$MAX_RETRIES] ${RED}Erreur HTTP $http_status${NC}"
        # Backoff progressif pour les erreurs HTTP aussi
        wait_time=$((CHECK_INTERVAL + (i * 5)))
        echo "⏳ Attente ${wait_time}s avant retry (backoff progressif)..."
        sleep $wait_time
        continue
    fi

    status=$(echo "$app_response_clean" | jq -r '.status')
    echo "[$i/$MAX_RETRIES] Statut: $status"

    case "$status" in
        success|finished)
            echo -e "${GREEN}✅ Déploiement $ENVIRONMENT réussi !${NC}"
            app_url=$(echo "$app_response_clean" | jq -r '.fqdn // .url // empty')
            [ -n "$app_url" ] && echo "🌐 URL: https://$app_url"
            exit 0
            ;;
        running)
            echo "⏳ Déploiement en cours (running)..."
            ;;
        running:unhealthy)
            echo -e "${YELLOW}⚠️ Déploiement running mais unhealthy - problème de santé détecté${NC}"
            echo -e "${YELLOW}⚠️ Déploiement $ENVIRONMENT en warning (statut: $status)${NC}"
            # Utiliser exit code 2 pour indiquer un warning (non-bloquant)
            exit 2
            ;;
        failed|error|cancelled|canceling|timeout)
            echo -e "${RED}❌ Déploiement échoué (statut: $status)${NC}"
            echo "$app_response_clean" | jq -r '.error // .message // "Pas de détail"'
            exit 1
            ;;
        queued|pending|in_progress|building|deploying|starting|restarting)
            echo "⏳ Déploiement en cours..."
            ;;
        *)
            echo -e "${YELLOW}⚠️ Statut inconnu: $status${NC}"
            ;;
    esac

    sleep $CHECK_INTERVAL
done

echo -e "${RED}⏱️ Timeout atteint après ${TIMEOUT_MINUTES} minutes${NC}"
exit 1

