#!/bin/bash

# Script de deploiement via Ansible workflow dispatch
# Usage: ./deploy.sh <environment> <ansible-tag>
#
# Variables d'environnement requises : DEPLOY_REPO, DEPLOY_TOKEN
#
# Declenche le workflow Ansible sur le repo VPS et suit son execution.
#
# Variables optionnelles :
#   IMAGE_REPO   : image GHCR a surveiller pour le rollback
#                  (defaut: ghcr.io/teamdivergentes/website_backend/dvg_web_backend)
#   ROLLBACK_MODE: si "true", desactive le smoke test post-deploiement
#                  (evite les boucles infinies rollback -> smoke -> rollback)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # reset

# Verification des parametres
if [ $# -ne 2 ]; then
    echo -e "${RED}Usage: $0 <environment> <ansible-tag>${NC}"
    echo "   Variables d'environnement requises : DEPLOY_REPO, DEPLOY_TOKEN"
    echo "   Exemple:"
    echo "     DEPLOY_REPO=teamdivergentes/vps_ansible DEPLOY_TOKEN=ghp_xxxx $0 PREPROD website"
    exit 1
fi

ENVIRONMENT="$1"
ANSIBLE_TAG="$2"
DEPLOY_REPO="${DEPLOY_REPO:?Variable DEPLOY_REPO non definie}"
DEPLOY_TOKEN="${DEPLOY_TOKEN:?Variable DEPLOY_TOKEN non definie}"
IMAGE_REPO="${IMAGE_REPO:-ghcr.io/teamdivergentes/website_backend/dvg_web_backend}"
ROLLBACK_MODE="${ROLLBACK_MODE:-false}"

# Configuration
TIMEOUT_MINUTES=10
POLL_INTERVAL=15
SMOKE_RETRIES=12
SMOKE_INTERVAL=10

if [[ -f "devsecops.yml" ]]; then
    TIMEOUT_MINUTES=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.timeout_minutes" 2>/dev/null || echo "10")
    POLL_INTERVAL=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "deployment.poll_interval_seconds" 2>/dev/null || echo "15")
fi

# Validation environnement
case "$ENVIRONMENT" in
    "PREPROD"|"PROD") ;;
    *)
        echo -e "${RED}Environnement invalide: $ENVIRONMENT${NC}"
        echo "   Valeurs acceptees: PREPROD, PROD"
        exit 1
        ;;
esac

GITHUB_API="https://api.github.com"
AUTH_HEADER="Authorization: Bearer $DEPLOY_TOKEN"
ACCEPT_HEADER="Accept: application/vnd.github.v3+json"

# Determiner le tag flottant cible selon l'environnement
IMAGE_TAG_NAME="PREPROD"
[[ "$ENVIRONMENT" == "PROD" ]] && IMAGE_TAG_NAME="RELEASE"

echo -e "${YELLOW}Deploiement $ENVIRONMENT via Ansible (Backend)${NC}"
echo "Tag Ansible: $ANSIBLE_TAG"
echo "Repo: $DEPLOY_REPO"
[[ "$ROLLBACK_MODE" == "true" ]] && echo -e "${YELLOW}Mode ROLLBACK actif - smoke test post-deploiement desactive${NC}"

# ===========================================================================
# Etape 1 : Capturer le digest de l'image actuellement deployee (pre-deploy)
# ===========================================================================
PREVIOUS_TAG=""

if [[ "$ROLLBACK_MODE" != "true" ]]; then
    echo -e "${CYAN}Capture du tag actuel avant deploiement...${NC}"

    GHCR_PATH="${IMAGE_REPO#ghcr.io/}"
    GHCR_ORG=$(echo "$GHCR_PATH" | cut -d'/' -f1)
    GHCR_PACKAGE=$(echo "$GHCR_PATH" | cut -d'/' -f2-)
    GHCR_PACKAGE_ENCODED=$(echo "$GHCR_PACKAGE" | sed 's|/|%2F|g')

    packages_response=$(curl -s \
        "$GITHUB_API/orgs/$GHCR_ORG/packages/container/$GHCR_PACKAGE_ENCODED/versions?per_page=10" \
        -H "$AUTH_HEADER" \
        -H "$ACCEPT_HEADER" || echo "")

    if [[ -n "$packages_response" ]]; then
        PREVIOUS_TAG=$(echo "$packages_response" | \
            jq -r --arg tag "$IMAGE_TAG_NAME" \
            '[.[] | select(.metadata.container.tags[] == $tag)] | .[0].name // empty' \
            2>/dev/null || echo "")

        if [[ -n "$PREVIOUS_TAG" && "$PREVIOUS_TAG" != "null" ]]; then
            echo -e "${GREEN}Tag actuel capture: $PREVIOUS_TAG${NC}"
        else
            echo -e "${YELLOW}Avertissement: impossible de recuperer le tag actuel (premiere mise en prod ?)${NC}"
            PREVIOUS_TAG=""
        fi
    else
        echo -e "${YELLOW}Avertissement: API GHCR inaccessible, rollback automatique desactive${NC}"
        PREVIOUS_TAG=""
    fi
fi

# ===========================================================================
# Etape 2 : Enregistrer le timestamp et le correlation ID
# ===========================================================================
BEFORE_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CORRELATION_ID="${GITHUB_RUN_ID:-local}-${ENVIRONMENT}-$(date +%s)"
echo "Correlation ID: $CORRELATION_ID"

# ===========================================================================
# Etape 3 : Declencher le workflow Ansible
# ===========================================================================
echo -e "${YELLOW}Declenchement du workflow Ansible...${NC}"

DEPLOY_IMAGE_TAG="${DEPLOY_IMAGE_TAG:-}"
DISPATCH_PAYLOAD="{\"ref\": \"main\", \"inputs\": {\"tags\": \"$ANSIBLE_TAG\", \"correlation_id\": \"$CORRELATION_ID\""
if [[ -n "$DEPLOY_IMAGE_TAG" ]]; then
    DISPATCH_PAYLOAD="${DISPATCH_PAYLOAD}, \"image_tag\": \"$DEPLOY_IMAGE_TAG\""
    echo "Image tag specifique: $DEPLOY_IMAGE_TAG"
fi
DISPATCH_PAYLOAD="${DISPATCH_PAYLOAD}}}"

trigger_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
    -X POST \
    "$GITHUB_API/repos/$DEPLOY_REPO/actions/workflows/deploy.yml/dispatches" \
    -H "$AUTH_HEADER" \
    -H "$ACCEPT_HEADER" \
    -d "$DISPATCH_PAYLOAD")

http_status=$(echo "$trigger_response" | grep "HTTP_STATUS:" | cut -d: -f2)

if [ "$http_status" != "204" ]; then
    echo -e "${RED}Erreur declenchement workflow (HTTP $http_status)${NC}"
    echo "$trigger_response" | grep -v "HTTP_STATUS:"
    exit 1
fi
echo -e "${GREEN}Workflow Ansible declenche${NC}"

# ===========================================================================
# Etape 4 : Attendre que le run apparaisse
# ===========================================================================
echo "Attente de la creation du run..."
RUN_ID=""
RUN_URL=""
for attempt in $(seq 1 12); do
    sleep 5
    runs_response=$(curl -s \
        "$GITHUB_API/repos/$DEPLOY_REPO/actions/workflows/deploy.yml/runs?created=>=$BEFORE_TIME&per_page=5" \
        -H "$AUTH_HEADER" \
        -H "$ACCEPT_HEADER")

    RUN_ID=$(echo "$runs_response" | jq -r '.workflow_runs[0].id // empty')

    if [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ]; then
        RUN_URL=$(echo "$runs_response" | jq -r '.workflow_runs[0].html_url // empty')
        break
    fi

    echo "  [$attempt/12] Run pas encore visible..."
done

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
    echo -e "${RED}Impossible de trouver le run Ansible apres 60s${NC}"
    exit 1
fi

echo -e "${GREEN}Run trouve: #$RUN_ID${NC}"
[ -n "$RUN_URL" ] && echo "URL: $RUN_URL"

# ===========================================================================
# Etape 5 : Suivre l'execution du workflow Ansible
# ===========================================================================
MAX_RETRIES=$((TIMEOUT_MINUTES * 60 / POLL_INTERVAL))
echo "Suivi du deploiement (timeout: ${TIMEOUT_MINUTES}min, poll: ${POLL_INTERVAL}s)"

ANSIBLE_SUCCESS=false
for i in $(seq 1 $MAX_RETRIES); do
    run_response=$(curl -s \
        "$GITHUB_API/repos/$DEPLOY_REPO/actions/runs/$RUN_ID" \
        -H "$AUTH_HEADER" \
        -H "$ACCEPT_HEADER")

    status=$(echo "$run_response" | jq -r '.status')
    conclusion=$(echo "$run_response" | jq -r '.conclusion // empty')

    if [ "$status" = "completed" ]; then
        case "$conclusion" in
            success)
                echo -e "${GREEN}Deploiement $ENVIRONMENT reussi (Ansible OK)${NC}"
                ANSIBLE_SUCCESS=true
                break
                ;;
            failure)
                echo -e "${RED}Deploiement $ENVIRONMENT echoue (Ansible)${NC}"
                [ -n "$RUN_URL" ] && echo "Details: $RUN_URL"
                exit 1
                ;;
            cancelled)
                echo -e "${YELLOW}Deploiement $ENVIRONMENT annule${NC}"
                exit 1
                ;;
            *)
                echo -e "${RED}Deploiement $ENVIRONMENT termine avec: $conclusion${NC}"
                [ -n "$RUN_URL" ] && echo "Details: $RUN_URL"
                exit 1
                ;;
        esac
    fi

    echo "[$i/$MAX_RETRIES] Statut: $status..."
    sleep $POLL_INTERVAL
done

if [ "$ANSIBLE_SUCCESS" != "true" ]; then
    echo -e "${RED}Timeout atteint apres ${TIMEOUT_MINUTES} minutes${NC}"
    [ -n "$RUN_URL" ] && echo "Verifiez: $RUN_URL"
    exit 1
fi

# ===========================================================================
# Etape 6 : Smoke test post-deploiement
# (desactive en mode rollback pour eviter les boucles infinies)
# ===========================================================================
if [[ "$ROLLBACK_MODE" == "true" ]]; then
    echo -e "${GREEN}Rollback Ansible complete. Smoke test desactive (mode rollback).${NC}"
    exit 0
fi

echo -e "${CYAN}Verification post-deploiement (smoke test)...${NC}"

# Le backend NestJS expose /health sur le domaine API
HEALTH_URL="https://preprod-api.teamdivergentes.fr/health"
[[ "$ENVIRONMENT" == "PROD" ]] && HEALTH_URL="https://api.teamdivergentes.fr/health"

echo "Health check URL: $HEALTH_URL"

SMOKE_PASSED=false
for attempt in $(seq 1 $SMOKE_RETRIES); do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$HEALTH_URL" 2>/dev/null || echo "0")
    if [[ "$HTTP_STATUS" == "200" ]]; then
        echo -e "${GREEN}Health check OK (HTTP 200)${NC}"
        SMOKE_PASSED=true
        break
    fi
    echo "  [$attempt/$SMOKE_RETRIES] HTTP $HTTP_STATUS - nouvelle tentative dans ${SMOKE_INTERVAL}s..."
    sleep $SMOKE_INTERVAL
done

# ===========================================================================
# Etape 7 : Rollback automatique si smoke test echoue
# ===========================================================================
if [[ "$SMOKE_PASSED" != "true" ]]; then
    echo -e "${RED}Smoke test echoue apres $SMOKE_RETRIES tentatives${NC}"

    if [[ -z "$PREVIOUS_TAG" ]]; then
        echo -e "${RED}Impossible de rollback: tag precedent non capture (premiere mise en prod ?)${NC}"
        echo "::error::Smoke test echoue - rollback impossible (tag precedent inconnu)"
        exit 1
    fi

    echo -e "${YELLOW}Lancement du rollback vers le tag: $PREVIOUS_TAG${NC}"
    echo "::warning::Smoke test echoue - rollback automatique vers $PREVIOUS_TAG"

    if [[ "$PREVIOUS_TAG" =~ ^sha256: ]]; then
        ROLLBACK_IMAGE_TAG="${IMAGE_REPO}@${PREVIOUS_TAG}"
    else
        ROLLBACK_IMAGE_TAG="${IMAGE_REPO}:${PREVIOUS_TAG}"
    fi

    echo "Image de rollback: $ROLLBACK_IMAGE_TAG"

    ROLLBACK_CORRELATION_ID="${GITHUB_RUN_ID:-local}-ROLLBACK-${ENVIRONMENT}-$(date +%s)"
    ROLLBACK_PAYLOAD="{\"ref\": \"main\", \"inputs\": {\"tags\": \"$ANSIBLE_TAG\", \"correlation_id\": \"$ROLLBACK_CORRELATION_ID\", \"image_tag\": \"$ROLLBACK_IMAGE_TAG\", \"rollback_mode\": \"true\"}}"

    ROLLBACK_BEFORE_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    rollback_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
        -X POST \
        "$GITHUB_API/repos/$DEPLOY_REPO/actions/workflows/deploy.yml/dispatches" \
        -H "$AUTH_HEADER" \
        -H "$ACCEPT_HEADER" \
        -d "$ROLLBACK_PAYLOAD")

    rollback_http_status=$(echo "$rollback_response" | grep "HTTP_STATUS:" | cut -d: -f2)

    if [ "$rollback_http_status" != "204" ]; then
        echo -e "${RED}Echec du declenchement du rollback (HTTP $rollback_http_status)${NC}"
        echo "$rollback_response" | grep -v "HTTP_STATUS:"
        echo "::error::Smoke test echoue ET rollback impossible - intervention manuelle requise"
        exit 1
    fi

    echo -e "${YELLOW}Workflow de rollback declenche${NC}"

    # Attendre l'apparition du run de rollback (informatif uniquement)
    ROLLBACK_RUN_ID=""
    ROLLBACK_RUN_URL=""
    for attempt in $(seq 1 12); do
        sleep 5
        rollback_runs=$(curl -s \
            "$GITHUB_API/repos/$DEPLOY_REPO/actions/workflows/deploy.yml/runs?created=>=$ROLLBACK_BEFORE_TIME&per_page=5" \
            -H "$AUTH_HEADER" \
            -H "$ACCEPT_HEADER")

        ROLLBACK_RUN_ID=$(echo "$rollback_runs" | jq -r '.workflow_runs[0].id // empty')

        if [ -n "$ROLLBACK_RUN_ID" ] && [ "$ROLLBACK_RUN_ID" != "null" ]; then
            ROLLBACK_RUN_URL=$(echo "$rollback_runs" | jq -r '.workflow_runs[0].html_url // empty')
            break
        fi
        echo "  [$attempt/12] Run de rollback pas encore visible..."
    done

    if [ -n "$ROLLBACK_RUN_ID" ] && [ "$ROLLBACK_RUN_ID" != "null" ]; then
        echo -e "${YELLOW}Run de rollback: #$ROLLBACK_RUN_ID${NC}"
        [ -n "$ROLLBACK_RUN_URL" ] && echo "URL: $ROLLBACK_RUN_URL"
    fi

    echo "::error::Deploiement $ENVIRONMENT echoue (smoke test KO) - rollback vers $PREVIOUS_TAG en cours"
    exit 1
fi

echo -e "${GREEN}Deploiement $ENVIRONMENT reussi avec smoke test OK${NC}"
exit 0
