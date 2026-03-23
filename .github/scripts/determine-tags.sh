#!/bin/bash

# Script pour déterminer les tags Docker basés sur le contexte du workflow
# Usage: ./determine-tags.sh

set -euo pipefail

# Configuration du registry
REGISTRY="ghcr.io"
ORGANIZATION="teamdivergentes"
REPOSITORY="website_backend"
IMAGE_NAME="dvg_web_backend"

# Version du projet - extraire depuis devsecops.yml
if [[ -f "devsecops.yml" ]]; then
    PROJECT_VERSION=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "project.version")
    echo "📋 Version extraite depuis devsecops.yml: $PROJECT_VERSION"
else
    echo "⚠️  Fichier devsecops.yml non trouvé"
    exit 1
fi

# Raccourcir le SHA pour les tags
SHORT_SHA=$(echo "$GITHUB_SHA" | cut -c1-7)

# Déterminer le tag basé sur le contexte
if [[ "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
    # Pour les PR, utiliser GITHUB_HEAD_REF (nom de la branche source)
    VERSION_FROM_BRANCH=$(echo "$GITHUB_HEAD_REF" | sed 's/[^a-zA-Z0-9._-]/-/g')
    TAG_SUFFIX="unstable-$VERSION_FROM_BRANCH"
    VERSION_TAG="$PROJECT_VERSION-unstable-$SHORT_SHA"
elif [[ "$GITHUB_REF" == "refs/heads/develop" ]]; then
    TAG_SUFFIX="dev"
    VERSION_TAG="$PROJECT_VERSION-dev-$SHORT_SHA"
elif [[ "$GITHUB_REF" == "refs/heads/main" ]]; then
    TAG_SUFFIX="PREPROD"
    VERSION_TAG="$PROJECT_VERSION-PREPROD-$SHORT_SHA"
elif [[ "$GITHUB_REF" == refs/tags/v* ]]; then  # Format: vXX.YY.ZZ
    TAG_SUFFIX="RELEASE"
    # Extraire la version du tag (ex: v1.2.3 -> 1.2.3)
    VERSION_FROM_TAG=$(echo "$GITHUB_REF" | sed 's/refs\/tags\/v//')
    VERSION_TAG="$VERSION_FROM_TAG-RELEASE"
else
    TAG_SUFFIX="unstable"
    VERSION_TAG="$PROJECT_VERSION-unstable-$SHORT_SHA"
fi

# Nettoyer les tags pour qu'ils soient valides selon les standards Docker
# Les tags Docker ne peuvent contenir que des caractères alphanumériques, points, tirets et underscores
TAG_SUFFIX=$(echo "$TAG_SUFFIX" | sed 's/[^a-zA-Z0-9._-]/-/g')
VERSION_TAG=$(echo "$VERSION_TAG" | sed 's/[^a-zA-Z0-9._-]/-/g')

# Construire les tags
IMAGE_TAG="$REGISTRY/$ORGANIZATION/$REPOSITORY/$IMAGE_NAME:$GITHUB_SHA"
WORKFLOW_TAG="$REGISTRY/$ORGANIZATION/$REPOSITORY/$IMAGE_NAME:$TAG_SUFFIX"
VERSION_TAG_FULL="$REGISTRY/$ORGANIZATION/$REPOSITORY/$IMAGE_NAME:$VERSION_TAG"

# Construire les noms d'image et tag de déploiement
IMAGE_NAME="$REGISTRY/$ORGANIZATION/$REPOSITORY/$IMAGE_NAME"
DEPLOY_TAG="$IMAGE_NAME:$VERSION_TAG"

# Exporter les variables
if [ -n "$GITHUB_OUTPUT" ]; then
    # Mode GitHub Actions
    echo "image-tag=$IMAGE_TAG" >> $GITHUB_OUTPUT
    echo "workflow-tag=$WORKFLOW_TAG" >> $GITHUB_OUTPUT
    echo "version-tag=$VERSION_TAG_FULL" >> $GITHUB_OUTPUT
    echo "tag-suffix=$TAG_SUFFIX" >> $GITHUB_OUTPUT
    echo "image-name=$IMAGE_NAME" >> $GITHUB_OUTPUT
    echo "deploy-tag=$DEPLOY_TAG" >> $GITHUB_OUTPUT
else
    # Mode test local
    echo "image-tag=$IMAGE_TAG"
    echo "workflow-tag=$WORKFLOW_TAG"
    echo "version-tag=$VERSION_TAG_FULL"
    echo "tag-suffix=$TAG_SUFFIX"
    echo "image-name=$IMAGE_NAME"
    echo "deploy-tag=$DEPLOY_TAG"
fi

echo "✅ Tags déterminés:"
echo "  - Image tag (SHA): $IMAGE_TAG"
echo "  - Workflow tag: $WORKFLOW_TAG"
echo "  - Version tag: $VERSION_TAG_FULL"
echo "  - Image name: $IMAGE_NAME"
echo "  - Deploy tag: $DEPLOY_TAG"
echo "  - Suffix: $TAG_SUFFIX"

