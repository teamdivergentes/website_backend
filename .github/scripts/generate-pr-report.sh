#!/bin/bash

# Script pour générer le rapport de Pull Request
# Usage: ./generate-pr-report.sh

set -euo pipefail

# Vérifier les variables requises
if [[ -z "$BUILD_STATUS" || -z "$LINT_STATUS" || -z "$TEST_STATUS" || -z "$SEMGREP_STATUS" || -z "$DOCKER_STATUS" ]]; then
    echo "Variables manquantes pour générer le rapport PR"
    exit 1
fi

# E2E status is optional (skipped on plain PR push)
E2E_STATUS="${E2E_STATUS:-skipped}"

# Variables de déploiement (optionnelles)
DEPLOY_PREPROD_STATUS="${DEPLOY_PREPROD_STATUS:-skipped}"
DEPLOY_PROD_STATUS="${DEPLOY_PROD_STATUS:-skipped}"

# GitHub context (optionnelles pour les liens de logs)
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-}"

# ---------------------------------------------------------------------------
# Fonction : convertit un résultat GitHub Actions en emoji + label
# ---------------------------------------------------------------------------
status_icon() {
    local s="$1"
    case "$s" in
        success)   echo "✅ success" ;;
        failure)   echo "❌ failure" ;;
        skipped)   echo "⏭️ skipped" ;;
        cancelled) echo "⚠️ cancelled" ;;
        *)         echo "⚠️ ${s}" ;;
    esac
}

# ---------------------------------------------------------------------------
# Statut global — jobs GATING :
#   build, lint, test-unit, semgrep, docker
# Un job skipped ne casse PAS le succès (skip légitime CI).
# Un job failure ou cancelled casse le succès.
# ---------------------------------------------------------------------------
OVERALL_STATUS="✅ SUCCESS"
STATUS_EMOJI="🎉"

for gating_job in "$BUILD_STATUS" "$LINT_STATUS" "$TEST_STATUS" \
                  "$SEMGREP_STATUS" "$DOCKER_STATUS"; do
    if [[ "$gating_job" == "failure" || "$gating_job" == "cancelled" ]]; then
        OVERALL_STATUS="❌ FAILED"
        STATUS_EMOJI="⚠️"
        break
    fi
done

# ---------------------------------------------------------------------------
# Lien vers les logs du run courant
# ---------------------------------------------------------------------------
RUN_URL="https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID:-}"

# ---------------------------------------------------------------------------
# Génération du rapport
# ---------------------------------------------------------------------------
cat << EOF > pr_report.md
## ${STATUS_EMOJI} Rapport de Build - Backend NestJS

### 📊 Statut global
**${OVERALL_STATUS}**

<details>
<summary>🔧 Détails du build</summary>

| Composant | Statut | Description |
|-----------|--------|------------|
| **Build** | $(status_icon "$BUILD_STATUS") | Build NestJS production — [logs]($RUN_URL) |
| **Linter** | $(status_icon "$LINT_STATUS") | Vérification qualité de code ESLint — [logs]($RUN_URL) |
| **Tests unitaires** | $(status_icon "$TEST_STATUS") | Tests unitaires Jest avec couverture — [logs]($RUN_URL) |
| **Tests E2E** | $(status_icon "$E2E_STATUS") | Tests E2E NestJS (supertest) — déclenché sur approbation PR ou push main — [logs]($RUN_URL) |
| **Sécurité (Semgrep)** | $(status_icon "$SEMGREP_STATUS") | Analyse SAST Semgrep — déclenché sur main/tag/dispatch — [logs]($RUN_URL) |
| **Docker** | $(status_icon "$DOCKER_STATUS") | Build et push de l'image conteneur GHCR — [logs]($RUN_URL) |
| **Deploy PREPROD** | $(status_icon "$DEPLOY_PREPROD_STATUS") | Déploiement environnement PREPROD — [logs]($RUN_URL) |
| **Deploy PROD** | $(status_icon "$DEPLOY_PROD_STATUS") | Déploiement environnement PROD — [logs]($RUN_URL) |

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
if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
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
<summary>🌙 Nightly checks (status from latest main push)</summary>

_Ces jobs ne tournent **pas** sur chaque PR pour économiser le runner. Affiché ici : leur dernier statut sur \`main\`._

EOF

# ---------------------------------------------------------------------------
# Helper : fetch le dernier run main où le job <name> n'est pas skipped
# Ecrit dans 3 variables globales : NC_STATUS, NC_DATE, NC_URL
# ---------------------------------------------------------------------------
fetch_last_nightly_job() {
    local job_name="$1"
    NC_STATUS="—"
    NC_DATE="—"
    NC_URL=""

    if [[ -z "${GITHUB_TOKEN:-}" || -z "$GITHUB_REPOSITORY" ]]; then
        return
    fi

    # Récupère les 10 derniers runs cicd.yml sur main
    local runs_json
    runs_json=$(curl -sS -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/workflows/cicd.yml/runs?branch=main&status=completed&per_page=10" 2>/dev/null || echo "")

    [[ -z "$runs_json" ]] && return

    local run_ids
    run_ids=$(echo "$runs_json" | jq -r '.workflow_runs[].id' 2>/dev/null || echo "")

    while IFS= read -r run_id; do
        [[ -z "$run_id" ]] && continue
        local jobs_json
        jobs_json=$(curl -sS -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/runs/$run_id/jobs" 2>/dev/null || echo "")
        [[ -z "$jobs_json" ]] && continue

        local matched
        matched=$(echo "$jobs_json" | jq -r --arg name "$job_name" \
            '.jobs[] | select(.name == $name) | select(.conclusion != "skipped" and .conclusion != null) | "\(.conclusion)|\(.completed_at)|\(.html_url)"' 2>/dev/null | head -1)

        if [[ -n "$matched" ]]; then
            NC_STATUS=$(echo "$matched" | cut -d'|' -f1)
            NC_DATE=$(echo "$matched" | cut -d'|' -f2 | cut -dT -f1)
            NC_URL=$(echo "$matched" | cut -d'|' -f3)
            return
        fi
    done <<< "$run_ids"
}

cat << EOF >> pr_report.md
| Job | Dernier run main | Statut | Action |
|---|---|---|---|
EOF

# mutation-test (push main only)
fetch_last_nightly_job "mutation-test"
NC_LINK="—"
[[ -n "$NC_URL" ]] && NC_LINK="[run]($NC_URL)"
cat << EOF >> pr_report.md
| Mutation testing (Stryker) | $NC_DATE | $(status_icon "$NC_STATUS") | $NC_LINK · cmd: \`/run-mutation\` |
EOF

# test-e2e (push, donc tourne aussi sur develop ; on cherche le dernier sur main)
fetch_last_nightly_job "test-e2e"
NC_LINK="—"
[[ -n "$NC_URL" ]] && NC_LINK="[run]($NC_URL)"
cat << EOF >> pr_report.md
| E2E (supertest) | $NC_DATE | $(status_icon "$NC_STATUS") | $NC_LINK · cmd: \`/run-e2e\` |

> Sur cette PR, ces jobs sont **skipped intentionnellement**. Tape \`/run-mutation\` ou \`/run-e2e\` en commentaire pour les déclencher à la demande.

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
