#!/bin/bash

# Script pour ajouter les labels Docker avec les informations de build
# Usage: ./update-dockerfile-labels.sh <image-tag> <workflow-tag> <tag-suffix> <build-status> <lint-status> <test-status> <semgrep-status> <github-sha> <github-head-ref> <github-actor> <build-time> <github-repository>

set -euo pipefail

IMAGE_TAG="$1"
WORKFLOW_TAG="${2:-unknown}"
TAG_SUFFIX="${3:-sha}"
BUILD_STATUS="$4"
LINT_STATUS="${5:-unknown}"
TEST_STATUS="${6:-unknown}"
SEMGREP_STATUS="${7:-unknown}"
GITHUB_SHA="$8"
GITHUB_HEAD_REF="$9"
GITHUB_ACTOR="${10}"
BUILD_TIME="${11}"
GITHUB_REPOSITORY="${12}"

# Gérer le cas où GITHUB_HEAD_REF est vide (pour les tags)
if [[ -z "$GITHUB_HEAD_REF" ]]; then
    GITHUB_HEAD_REF="tag-release"
fi

# Vérifier que les paramètres requis sont fournis (les champs optionnels ont des valeurs par défaut)
if [[ -z "$IMAGE_TAG" || -z "$BUILD_STATUS" || -z "$GITHUB_SHA" || -z "$GITHUB_ACTOR" || -z "$BUILD_TIME" || -z "$GITHUB_REPOSITORY" ]]; then
    echo "❌ Usage: ./update-dockerfile-labels.sh <image-tag> <workflow-tag> <tag-suffix> <build-status> <lint-status> <test-status> <semgrep-status> <github-sha> <github-head-ref> <github-actor> <build-time> <github-repository>"
    exit 1
fi

# Vérifier chaque paramètre requis individuellement
if [[ -z "$IMAGE_TAG" ]]; then echo "❌ IMAGE_TAG est vide"; fi
if [[ -z "$BUILD_STATUS" ]]; then echo "❌ BUILD_STATUS est vide"; fi
if [[ -z "$GITHUB_SHA" ]]; then echo "❌ GITHUB_SHA est vide"; fi
if [[ -z "$GITHUB_ACTOR" ]]; then echo "❌ GITHUB_ACTOR est vide"; fi
if [[ -z "$BUILD_TIME" ]]; then echo "❌ BUILD_TIME est vide"; fi
if [[ -z "$GITHUB_REPOSITORY" ]]; then echo "❌ GITHUB_REPOSITORY est vide"; fi

if [[ -z "$IMAGE_TAG" || -z "$BUILD_STATUS" || -z "$GITHUB_SHA" || -z "$GITHUB_ACTOR" || -z "$BUILD_TIME" || -z "$GITHUB_REPOSITORY" ]]; then
    echo "❌ Un ou plusieurs paramètres requis sont vides"
    exit 1
fi

# Déterminer le statut global
if [[ "$BUILD_STATUS" == "success" && "$LINT_STATUS" == "success" && "$TEST_STATUS" == "success" && "$SEMGREP_STATUS" == "success" ]]; then
    STATUS_TEXT="SUCCESS"
else
    STATUS_TEXT="FAILED"
fi

# Créer les labels Docker
cat > dockerfile_labels.txt << EOF
# Labels Docker pour les métadonnées de build
LABEL org.opencontainers.image.title="DVG Web Backend"
LABEL org.opencontainers.image.description="Backend NestJS pour l'application DVG Web - Build ${TAG_SUFFIX} (${STATUS_TEXT})"
LABEL org.opencontainers.image.version="${WORKFLOW_TAG}"
LABEL org.opencontainers.image.revision="${GITHUB_SHA}"
LABEL org.opencontainers.image.source="https://github.com/${GITHUB_REPOSITORY}"
LABEL org.opencontainers.image.created="${BUILD_TIME}"
LABEL org.opencontainers.image.authors="${GITHUB_ACTOR}"
LABEL org.opencontainers.image.url="https://github.com/${GITHUB_REPOSITORY}"
LABEL org.opencontainers.image.documentation="https://github.com/${GITHUB_REPOSITORY}#readme"
LABEL org.opencontainers.image.licenses="UNLICENSED"
LABEL build.status="${STATUS_TEXT}"
LABEL build.type="${TAG_SUFFIX}"
LABEL build.image.tag="${IMAGE_TAG}"
LABEL build.workflow.tag="${WORKFLOW_TAG}"
LABEL build.branch="${GITHUB_HEAD_REF}"
LABEL build.commit="${GITHUB_SHA}"
LABEL build.actor="${GITHUB_ACTOR}"
LABEL build.nestjs="${BUILD_STATUS}"
LABEL build.lint="${LINT_STATUS}"
LABEL build.test="${TEST_STATUS}"
LABEL build.semgrep="${SEMGREP_STATUS}"
LABEL build.time="${BUILD_TIME}"
EOF

# Lire le Dockerfile existant
if [[ -f "Dockerfile" ]]; then
    # Supprimer les anciens labels s'ils existent (entre # Labels Docker et la ligne vide suivante)
    sed '/^# Labels Docker pour les métadonnées de build$/,/^$/d' Dockerfile > Dockerfile_temp
    
    # Ajouter les nouveaux labels après la ligne FROM node:20-alpine AS production
    awk '
    /^FROM node:[0-9]+-alpine AS production/ {
        print $0
        print ""
        while ((getline line < "dockerfile_labels.txt") > 0) {
            print line
        }
        close("dockerfile_labels.txt")
        next
    }
    { print }
    ' Dockerfile_temp > Dockerfile
    
    # Nettoyer
    rm Dockerfile_temp dockerfile_labels.txt
    echo "✅ Labels Docker ajoutés au Dockerfile"
else
    echo "❌ Dockerfile non trouvé"
    exit 1
fi

