#!/bin/bash

# Script pour générer le rapport de Pull Request
# Usage: ./generate-pr-report.sh

set -e

# Vérifier les variables requises
if [[ -z "$BUILD_STATUS" || -z "$LINT_STATUS" || -z "$TEST_STATUS" || -z "$SEMGREP_STATUS" || -z "$DOCKER_STATUS" ]]; then
    echo "❌ Variables manquantes pour générer le rapport PR"
    exit 1
fi

# Variables de déploiement (optionnelles)
DEPLOY_PREPROD_STATUS="${DEPLOY_PREPROD_STATUS:-skipped}"
DEPLOY_PROD_STATUS="${DEPLOY_PROD_STATUS:-skipped}"

# Déterminer le statut global
if [[ "$BUILD_STATUS" == "success" && "$LINT_STATUS" == "success" && "$TEST_STATUS" == "success" && "$SEMGREP_STATUS" == "success" && "$DOCKER_STATUS" == "success" ]]; then
    OVERALL_STATUS="✅ SUCCESS"
    STATUS_EMOJI="🎉"
else
    OVERALL_STATUS="❌ FAILED"
    STATUS_EMOJI="⚠️"
fi

# Générer le rapport avec sections repliables
cat << EOF > pr_report.md
## ${STATUS_EMOJI} Rapport de Build - Backend NestJS

### 📊 Statut global
**${OVERALL_STATUS}**

<details>
<summary>🔧 Détails du build</summary>

| Composant | Statut | Description |
|-----------|--------|------------|
| **Build** | $BUILD_STATUS | Build NestJS production |
| **Linter** | $LINT_STATUS | Vérification qualité de code ESLint |
| **Tests** | $TEST_STATUS | Tests unitaires et e2e |
| **Sécurité** | $SEMGREP_STATUS | Analyse de sécurité Semgrep |
| **Docker** | $DOCKER_STATUS | Build de l'image conteneur |
| **Deploy PREPROD** | $DEPLOY_PREPROD_STATUS | Déploiement environnement PREPROD |
| **Deploy PROD** | $DEPLOY_PROD_STATUS | Déploiement environnement PROD |

</details>

<details>
<summary>🐳 Image Docker</summary>

EOF

# Vérifier si Docker a réussi
if [[ "$DOCKER_STATUS" == "success" && "$IMAGE_TAG" != "N/A" ]]; then
cat << EOF >> pr_report.md
**Tag de l'image :** \`${IMAGE_TAG}\`

**Tags disponibles :**
- **Tag SHA :** \`${IMAGE_TAG}\` (commit complet)
- **Tag workflow :** \`${WORKFLOW_TAG}\` (${TAG_SUFFIX})
- **Tag version :** \`${VERSION_TAG}\` (version + type + SHA)

**Commandes pour récupérer l'image :**
\`\`\`bash
# Dernière version du type (recommandé)
docker pull ${WORKFLOW_TAG}

# Version spécifique avec SHA
docker pull ${VERSION_TAG}

# Version complète avec SHA complet
docker pull ${IMAGE_TAG}
\`\`\`

**Commandes pour lancer l'image :**
\`\`\`bash
# Avec le tag workflow (recommandé)
docker run -d -p 3000:3000 \\
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \\
  -e JWT_SECRET="your-secret-key" \\
  --name backend ${WORKFLOW_TAG}

# Avec le tag version
docker run -d -p 3000:3000 \\
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \\
  -e JWT_SECRET="your-secret-key" \\
  --name backend ${VERSION_TAG}
\`\`\`

**Accès :** http://localhost:3000

**⚠️ Note importante :** La base de données doit être externe. Configurez l'URL PostgreSQL via la variable d'environnement \`DATABASE_URL\`.
EOF
else
cat << EOF >> pr_report.md
❌ **Build Docker échoué**

L'image Docker n'a pas pu être construite. Vérifiez les logs du job Docker pour plus de détails.

**Causes possibles :**
- Échec des dépendances précédentes (Build, Lint, Tests, Semgrep)
- Erreur dans le Dockerfile
- Problème de permissions

EOF
fi

cat << EOF >> pr_report.md

</details>

<details>
<summary>📋 Informations sur le build</summary>

- **Commit :** \`${GITHUB_SHA}\`
- **Branche :** \`${GITHUB_HEAD_REF}\`
- **Déclenché par :** ${GITHUB_ACTOR}
- **Date du build :** $(date -u '+%Y-%m-%d %H:%M:%S UTC')

</details>

<details>
<summary>🚀 Déploiement</summary>

EOF

# Vérifier si c'est une PR avec [DEPLOY] dans le titre
if [[ "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
  # Récupérer le titre de la PR depuis l'API GitHub
  if command -v jq >/dev/null 2>&1; then
    PR_TITLE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/repos/$GITHUB_REPOSITORY/pulls/$GITHUB_EVENT_NUMBER" | \
      jq -r '.title')
  else
    # Fallback si jq n'est pas disponible
    PR_TITLE=""
  fi
  
  if [[ "$PR_TITLE" == *"[DEPLOY]"* ]]; then
    # Récupérer les URLs des environnements depuis devsecops.yml
    PREPROD_URL=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "environments.preprod.url" 2>/dev/null || echo "preprod-api.teamdivergentes.fr")
    
    # Déterminer le statut du déploiement
    if [[ "$DEPLOY_PREPROD_STATUS" == "success" ]]; then
      DEPLOY_ICON="✅"
      DEPLOY_STATUS="SUCCÈS"
    elif [[ "$DEPLOY_PREPROD_STATUS" == "failure" ]]; then
      DEPLOY_ICON="❌"
      DEPLOY_STATUS="ÉCHEC"
    else
      DEPLOY_ICON="⏳"
      DEPLOY_STATUS="EN COURS"
    fi
    
    cat << EOF >> pr_report.md
${DEPLOY_ICON} **Déploiement PREPROD déclenché**

Cette PR contient \`[DEPLOY]\` dans le titre, le déploiement PREPROD a été automatiquement déclenché.

**Environnement PREPROD :**
- **URL :** [https://${PREPROD_URL}](https://${PREPROD_URL})
- **Status :** ${DEPLOY_STATUS} ($DEPLOY_PREPROD_STATUS)
- **Image :** \`${WORKFLOW_TAG}\`

**Accès API :** [https://${PREPROD_URL}](https://${PREPROD_URL})
**Methode :** Ansible workflow dispatch (tag: website)
EOF
  else
    cat << EOF >> pr_report.md
ℹ️ **Aucun déploiement automatique**

Pour déclencher un déploiement PREPROD, ajoutez \`[DEPLOY]\` dans le titre de cette PR.

**Exemples :**
- \`[DEPLOY] Ajout de nouvelles fonctionnalités\`
- \`Feature: Amélioration API [DEPLOY]\`
- \`[DEPLOY] Fix: Correction du bug critique\`
EOF
  fi
else
  cat << EOF >> pr_report.md
ℹ️ **Déploiement automatique via Ansible**

Le déploiement se fait automatiquement via Ansible workflow dispatch :
- **Push sur main** → Deploiement PREPROD (Ansible tag: website)
- **Tag v\*.** → Deploiement PROD (Ansible tag: website)
EOF
fi

cat << EOF >> pr_report.md

</details>

<details>
<summary>🗄️ Base de données</summary>

**Configuration requise :**

La base de données PostgreSQL est geree par Ansible (role postgresql).

**Variables d'environnement nécessaires :**
\`\`\`bash
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=3h
NODE_ENV=production
PORT=3000
\`\`\`

**Migration Prisma :**
Les migrations Prisma doivent être exécutées manuellement après le premier déploiement :
\`\`\`bash
npx prisma migrate deploy
\`\`\`

**Connexion à la base de données :**
La base de données est configuree via les variables Ansible Vault et deployee automatiquement.

</details>

---
*Ce rapport a été généré automatiquement par le pipeline CI/CD.*
EOF

echo "✅ Rapport PR généré: pr_report.md"

