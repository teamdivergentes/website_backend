#!/bin/bash

# Script de deploiement via Ansible workflow dispatch
# Usage: ./deploy.sh <environment> <ansible-tag> <deploy-repo> <deploy-token>
#
# Declenche le workflow Ansible sur le repo VPS et suit son execution.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # reset

# Verification des parametres
if [ $# -ne 4 ]; then
    echo -e "${RED}Usage: $0 <environment> <ansible-tag> <deploy-repo> <deploy-token>${NC}"
    echo "   Exemple:"
    echo "     $0 PREPROD website teamdivergentes/vps_ansible ghp_xxxx"
    exit 1
fi

ENVIRONMENT="$1"
ANSIBLE_TAG="$2"
DEPLOY_REPO="$3"
DEPLOY_TOKEN="$4"

# Configuration
TIMEOUT_MINUTES=10
POLL_INTERVAL=15

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

echo -e "${YELLOW}Deploiement $ENVIRONMENT via Ansible${NC}"
echo "Tag Ansible: $ANSIBLE_TAG"
echo "Repo: $DEPLOY_REPO"

# Etape 1: Enregistrer le timestamp avant le declenchement
BEFORE_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Etape 2: Declencher le workflow Ansible
echo -e "${YELLOW}Declenchement du workflow Ansible...${NC}"
trigger_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
    -X POST \
    "$GITHUB_API/repos/$DEPLOY_REPO/actions/workflows/deploy.yml/dispatches" \
    -H "$AUTH_HEADER" \
    -H "$ACCEPT_HEADER" \
    -d "{\"ref\": \"main\", \"inputs\": {\"tags\": \"$ANSIBLE_TAG\"}}")

http_status=$(echo "$trigger_response" | grep "HTTP_STATUS:" | cut -d: -f2)

if [ "$http_status" != "204" ]; then
    echo -e "${RED}Erreur declenchement workflow (HTTP $http_status)${NC}"
    echo "$trigger_response" | grep -v "HTTP_STATUS:"
    exit 1
fi
echo -e "${GREEN}Workflow Ansible declenche${NC}"

# Etape 3: Attendre que le run apparaisse
echo "Attente de la creation du run..."
RUN_ID=""
for attempt in $(seq 1 12); do
    sleep 5
    runs_response=$(curl -s \
        "$GITHUB_API/repos/$DEPLOY_REPO/actions/workflows/deploy.yml/runs?created=>=$BEFORE_TIME&per_page=5" \
        -H "$AUTH_HEADER" \
        -H "$ACCEPT_HEADER")

    RUN_ID=$(echo "$runs_response" | jq -r '.workflow_runs[0].id // empty')

    if [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ]; then
        break
    fi

    echo "  [$attempt/12] Run pas encore visible..."
done

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
    echo -e "${RED}Impossible de trouver le run Ansible apres 60s${NC}"
    exit 1
fi

RUN_URL=$(echo "$runs_response" | jq -r '.workflow_runs[0].html_url // empty')
echo -e "${GREEN}Run trouve: #$RUN_ID${NC}"
[ -n "$RUN_URL" ] && echo "URL: $RUN_URL"

# Etape 4: Suivre l'execution
MAX_RETRIES=$((TIMEOUT_MINUTES * 60 / POLL_INTERVAL))
echo "Suivi du deploiement (timeout: ${TIMEOUT_MINUTES}min, poll: ${POLL_INTERVAL}s)"

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
                echo -e "${GREEN}Deploiement $ENVIRONMENT reussi !${NC}"
                exit 0
                ;;
            failure)
                echo -e "${RED}Deploiement $ENVIRONMENT echoue${NC}"
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

echo -e "${RED}Timeout atteint apres ${TIMEOUT_MINUTES} minutes${NC}"
[ -n "$RUN_URL" ] && echo "Verifiez: $RUN_URL"
exit 1
