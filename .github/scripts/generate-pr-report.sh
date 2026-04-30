#!/bin/bash

# Script pour générer le rapport de Pull Request — Backend NestJS
# Usage: ./generate-pr-report.sh
# Harmonisé EPIC-20 #3 — baseline version frontend (status_emoji, liens détails, gating loop)

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Vérifier les variables gating obligatoires
# ─────────────────────────────────────────────────────────────
if [[ -z "${BUILD_STATUS:-}" || -z "${LINT_STATUS:-}" || -z "${TEST_STATUS:-}" || \
      -z "${SEMGREP_STATUS:-}" || -z "${DOCKER_STATUS:-}" ]]; then
    echo "❌ Variables manquantes pour générer le rapport PR"
    exit 1
fi

# ─────────────────────────────────────────────────────────────
# Variables optionnelles avec valeurs par défaut
# ─────────────────────────────────────────────────────────────
E2E_STATUS="${E2E_STATUS:-skipped}"
SONARQUBE_STATUS="${SONARQUBE_STATUS:-skipped}"
SCAN_IMAGE_STATUS="${SCAN_IMAGE_STATUS:-skipped}"
RELEASE_STATUS="${RELEASE_STATUS:-skipped}"
NOTIFY_STATUS="${NOTIFY_STATUS:-skipped}"
DEPLOY_PREPROD_STATUS="${DEPLOY_PREPROD_STATUS:-skipped}"
DEPLOY_PROD_STATUS="${DEPLOY_PROD_STATUS:-skipped}"
GITHUB_RUN_ID="${GITHUB_RUN_ID:-}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-}"

# ─────────────────────────────────────────────────────────────
# Helpers : emoji par résultat de job
# ─────────────────────────────────────────────────────────────
status_emoji() {
    case "$1" in
        success)   echo "✅" ;;
        failure)   echo "❌" ;;
        cancelled) echo "🚫" ;;
        skipped)   echo "⏭️" ;;
        *)         echo "⚠️" ;;
    esac
}

# Lien vers le run courant
run_url() {
    if [[ -n "$GITHUB_REPOSITORY" && -n "$GITHUB_RUN_ID" ]]; then
        echo "https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
    else
        echo "#"
    fi
}

# ─────────────────────────────────────────────────────────────
# Déterminer le statut global
# Gating : build, lint, test-unit, semgrep, docker
# Un job "skipped" ne casse PAS SUCCESS.
# "failure" ou "cancelled" sur un job gating => FAILED
# ─────────────────────────────────────────────────────────────
GLOBAL_FAILED=false
for gating_job in "$BUILD_STATUS" "$LINT_STATUS" "$TEST_STATUS" "$DOCKER_STATUS"; do
    if [[ "$gating_job" == "failure" || "$gating_job" == "cancelled" ]]; then
        GLOBAL_FAILED=true
        break
    fi
done

# Semgrep : ne casse le build que s'il a effectivement tourné et échoué
# (sur PR il est "skipped" — acceptable)
if [[ "$SEMGREP_STATUS" == "failure" || "$SEMGREP_STATUS" == "cancelled" ]]; then
    GLOBAL_FAILED=true
fi

# scan-image : informationnel — ne casse pas le statut global

if $GLOBAL_FAILED; then
    OVERALL_STATUS="❌ FAILED"
    STATUS_EMOJI="⚠️"
else
    OVERALL_STATUS="✅ SUCCESS"
    STATUS_EMOJI="🎉"
fi

RUN_LINK="$(run_url)"

# ─────────────────────────────────────────────────────────────
# Récupérer le statut du workflow e2e-fullstack.yml (cross-workflow)
# Stratégie : gh api → dernier run du workflow sur le SHA de la PR
# Si non disponible, afficher SKIPPED sans bloquer.
# ─────────────────────────────────────────────────────────────
E2E_FULLSTACK_STATUS="skipped"
E2E_FULLSTACK_URL=""
if command -v gh >/dev/null 2>&1 && [[ -n "$GITHUB_REPOSITORY" && -n "${GITHUB_SHA:-}" ]]; then
    _fs_json=$(gh api \
        "repos/${GITHUB_REPOSITORY}/actions/workflows/e2e-fullstack.yml/runs?head_sha=${GITHUB_SHA}&per_page=1" \
        2>/dev/null || echo '{}')
    _fs_conclusion=$(echo "$_fs_json" | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
    _fs_run_id=$(echo "$_fs_json" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2 || true)

    if [[ -n "$_fs_conclusion" ]]; then
        E2E_FULLSTACK_STATUS="$_fs_conclusion"
    fi
    if [[ -n "$_fs_run_id" ]]; then
        E2E_FULLSTACK_URL="https://github.com/${GITHUB_REPOSITORY}/actions/runs/${_fs_run_id}"
    fi
fi

E2E_FULLSTACK_EMOJI="$(status_emoji "$E2E_FULLSTACK_STATUS")"

# ─────────────────────────────────────────────────────────────
# Helper : statut du dernier run main pour un job nightly
# Met NC_STATUS, NC_DATE, NC_URL en variables globales
# ─────────────────────────────────────────────────────────────
fetch_last_nightly_job() {
    local job_name="$1"
    local workflow="${2:-cicd.yml}"
    NC_STATUS="—"
    NC_DATE="—"
    NC_URL=""

    if ! command -v gh >/dev/null 2>&1 || [[ -z "$GITHUB_REPOSITORY" ]]; then
        return
    fi

    local runs_json
    runs_json=$(gh api \
        "repos/${GITHUB_REPOSITORY}/actions/workflows/${workflow}/runs?branch=main&status=completed&per_page=10" \
        2>/dev/null || echo '{}')

    local run_ids
    run_ids=$(echo "$runs_json" | grep -o '"id":[0-9]*' | head -10 | cut -d: -f2 || true)
    [[ -z "$run_ids" ]] && return

    while IFS= read -r run_id; do
        [[ -z "$run_id" ]] && continue
        local jobs_json
        jobs_json=$(gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${run_id}/jobs" 2>/dev/null || echo '{}')

        local matched
        matched=$(echo "$jobs_json" | jq -r --arg name "$job_name" \
            '.jobs[]? | select(.name == $name) | select(.conclusion != "skipped" and .conclusion != null) | "\(.conclusion)|\(.completed_at)|\(.html_url)"' \
            2>/dev/null | head -1)

        if [[ -n "$matched" ]]; then
            NC_STATUS=$(echo "$matched" | cut -d'|' -f1)
            NC_DATE=$(echo "$matched" | cut -d'|' -f2 | cut -dT -f1)
            NC_URL=$(echo "$matched" | cut -d'|' -f3)
            return
        fi
    done <<< "$run_ids"
}

# Pour un workflow entier (e2e-fullstack), fetch direct sans filtre par job
fetch_last_workflow_run() {
    local workflow="$1"
    NC_STATUS="—"
    NC_DATE="—"
    NC_URL=""

    if ! command -v gh >/dev/null 2>&1 || [[ -z "$GITHUB_REPOSITORY" ]]; then
        return
    fi

    local run_json
    run_json=$(gh api \
        "repos/${GITHUB_REPOSITORY}/actions/workflows/${workflow}/runs?branch=main&status=completed&per_page=1" \
        2>/dev/null || echo '{}')

    NC_STATUS=$(echo "$run_json" | jq -r '.workflow_runs[0].conclusion // "—"' 2>/dev/null || echo "—")
    NC_DATE=$(echo "$run_json" | jq -r '.workflow_runs[0].updated_at // "—"' 2>/dev/null | cut -dT -f1)
    NC_URL=$(echo "$run_json" | jq -r '.workflow_runs[0].html_url // ""' 2>/dev/null)
}

# ─────────────────────────────────────────────────────────────
# Construire les emojis du tableau principal
# ─────────────────────────────────────────────────────────────
BUILD_EMOJI="$(status_emoji "$BUILD_STATUS")"
LINT_EMOJI="$(status_emoji "$LINT_STATUS")"
TEST_EMOJI="$(status_emoji "$TEST_STATUS")"
E2E_EMOJI="$(status_emoji "$E2E_STATUS")"
SEMGREP_EMOJI="$(status_emoji "$SEMGREP_STATUS")"
SONARQUBE_EMOJI="$(status_emoji "$SONARQUBE_STATUS")"
DOCKER_EMOJI="$(status_emoji "$DOCKER_STATUS")"
SCAN_IMAGE_EMOJI="$(status_emoji "$SCAN_IMAGE_STATUS")"
RELEASE_EMOJI="$(status_emoji "$RELEASE_STATUS")"
NOTIFY_EMOJI="$(status_emoji "$NOTIFY_STATUS")"
DEPLOY_PREPROD_EMOJI="$(status_emoji "$DEPLOY_PREPROD_STATUS")"
DEPLOY_PROD_EMOJI="$(status_emoji "$DEPLOY_PROD_STATUS")"

# ─────────────────────────────────────────────────────────────
# Générer le rapport
# ─────────────────────────────────────────────────────────────
cat << EOF > pr_report.md
## ${STATUS_EMOJI} Rapport de Build - Backend NestJS

### 📊 Statut global
**${OVERALL_STATUS}**

<details>
<summary>🔧 Détails du build</summary>

| Composant | Statut | Description |
|-----------|--------|------------|
| **Build** | ${BUILD_EMOJI} \`${BUILD_STATUS}\` | Build NestJS production — [détails](${RUN_LINK}) |
| **Linter** | ${LINT_EMOJI} \`${LINT_STATUS}\` | Vérification qualité ESLint — [détails](${RUN_LINK}) |
| **Tests unitaires (Jest)** | ${TEST_EMOJI} \`${TEST_STATUS}\` | Tests Jest + couverture + drift Prisma — [détails](${RUN_LINK}) |
| **Sécurité (Semgrep)** | ${SEMGREP_EMOJI} \`${SEMGREP_STATUS}\` | Analyse SAST (push/main uniquement) — [détails](${RUN_LINK}) |
| **Qualité (SonarQube)** | ${SONARQUBE_EMOJI} \`${SONARQUBE_STATUS}\` | Quality Gate SonarQube — [détails](${RUN_LINK}) |
| **Docker** | ${DOCKER_EMOJI} \`${DOCKER_STATUS}\` | Build & push image GHCR — [détails](${RUN_LINK}) |
| **Scan image (Trivy)** | ${SCAN_IMAGE_EMOJI} \`${SCAN_IMAGE_STATUS}\` | Scan vulnérabilités CRITICAL/HIGH — [Security tab](https://github.com/${GITHUB_REPOSITORY}/security/code-scanning) |
| **Tests E2E (supertest)** | ${E2E_EMOJI} \`${E2E_STATUS}\` | Tests E2E NestJS isolé (conditionnel) — [détails](${RUN_LINK}) |
| **E2E Full-Stack** | ${E2E_FULLSTACK_EMOJI} \`${E2E_FULLSTACK_STATUS}\` | Tests E2E Docker Compose (workflow séparé) — ${E2E_FULLSTACK_URL:+[détails](${E2E_FULLSTACK_URL})}${E2E_FULLSTACK_URL:-*non déclenché*} |
| **Release** | ${RELEASE_EMOJI} \`${RELEASE_STATUS}\` | Semantic-release (push/main uniquement) — [détails](${RUN_LINK}) |
| **Notification Discord** | ${NOTIFY_EMOJI} \`${NOTIFY_STATUS}\` | Notification Discord post-déploiement — [détails](${RUN_LINK}) |
| **Deploy PREPROD** | ${DEPLOY_PREPROD_EMOJI} \`${DEPLOY_PREPROD_STATUS}\` | Déploiement PREPROD — [détails](${RUN_LINK}) |
| **Deploy PROD** | ${DEPLOY_PROD_EMOJI} \`${DEPLOY_PROD_STATUS}\` | Déploiement PROD — [détails](${RUN_LINK}) |

**Légende :** ✅ succès · ❌ échec · ⏭️ ignoré (skipped) · 🚫 annulé · ⚠️ inconnu

</details>

<details>
<summary>🐳 Image Docker</summary>

EOF

# Vérifier si Docker a réussi
if [[ "$DOCKER_STATUS" == "success" && "${IMAGE_TAG:-N/A}" != "N/A" ]]; then
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

**Note :** La base de données doit être externe. Configurez l'URL PostgreSQL via la variable d'environnement \`DATABASE_URL\`.
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
<summary>🎭 Tests E2E (supertest)</summary>

EOF

if [[ "$E2E_STATUS" == "success" ]]; then
cat << EOF >> pr_report.md
✅ **Tests E2E supertest passés.**

Les tests ont été exécutés contre une base PostgreSQL éphémère en CI.
[Voir les détails du run](${RUN_LINK})

EOF
elif [[ "$E2E_STATUS" == "failure" ]]; then
cat << EOF >> pr_report.md
❌ **Des tests E2E ont échoué.**

[Voir les détails du run](${RUN_LINK})

EOF
else
cat << EOF >> pr_report.md
⏭️ **Tests E2E non déclenchés** (conditionnel — s'exécutent sur push, approbation de PR ou commentaire \`/run-e2e\`).

Pour relancer manuellement, commenter \`/run-e2e\` sur cette PR.

EOF
fi

cat << EOF >> pr_report.md
</details>

<details>
<summary>🔁 E2E Full-Stack (Docker Compose)</summary>

EOF

if [[ -n "$E2E_FULLSTACK_URL" ]]; then
cat << EOF >> pr_report.md
${E2E_FULLSTACK_EMOJI} **Statut :** \`${E2E_FULLSTACK_STATUS}\`

Ce workflow orchestre une stack complète (PostgreSQL + backend NestJS + frontend Nginx) via \`docker-compose.e2e.yml\`.

**Run :** [Voir le run E2E Full-Stack](${E2E_FULLSTACK_URL})

EOF
else
cat << EOF >> pr_report.md
⏭️ **Workflow \`e2e-fullstack.yml\` non déclenché** ou résultat non disponible pour ce SHA.

Ce workflow s'exécute sur push/main, approbation de PR ou commentaire \`/run-e2e\`.
Il est indépendant du workflow CICD principal (cross-workflow).

EOF
fi

cat << EOF >> pr_report.md
</details>

<details>
<summary>🔍 Sécurité image (Trivy)</summary>

EOF

if [[ "$SCAN_IMAGE_STATUS" == "success" ]]; then
cat << EOF >> pr_report.md
✅ **Aucune vulnérabilité CRITICAL/HIGH non corrigée détectée.**

Les résultats SARIF sont publiés dans l'onglet Security de ce dépôt :
[GitHub Security tab](https://github.com/${GITHUB_REPOSITORY}/security/code-scanning)

EOF
elif [[ "$SCAN_IMAGE_STATUS" == "failure" ]]; then
cat << EOF >> pr_report.md
⚠️ **Trivy a détecté des vulnérabilités** (informationnel — non bloquant sur PR).

Consulter l'onglet Security pour le rapport SARIF complet :
[GitHub Security tab](https://github.com/${GITHUB_REPOSITORY}/security/code-scanning)

EOF
else
cat << EOF >> pr_report.md
⏭️ **Scan Trivy non exécuté** (requiert que le job Docker ait réussi).

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
- **Run CI :** [${GITHUB_RUN_ID}](${RUN_LINK})

</details>

<details>
<summary>🚀 Déploiement</summary>

EOF

# Vérifier si c'est une PR avec [DEPLOY] dans le titre
GITHUB_EVENT_NAME="${GITHUB_EVENT_NAME:-pull_request}"
if [[ "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
  if command -v jq >/dev/null 2>&1; then
    PR_TITLE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/repos/$GITHUB_REPOSITORY/pulls/$GITHUB_EVENT_NUMBER" | \
      jq -r '.title')
  else
    PR_TITLE=""
  fi

  if [[ "$PR_TITLE" == *"[DEPLOY]"* ]]; then
    PREPROD_URL=$(chmod +x ./.github/scripts/get-config-value.sh && ./.github/scripts/get-config-value.sh "environments.preprod.url" 2>/dev/null || echo "preprod-api.teamdivergentes.fr")

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
- **Image :** \`${WORKFLOW_TAG:-N/A}\`

**Accès :** [https://${PREPROD_URL}](https://${PREPROD_URL})
**Méthode :** Ansible workflow dispatch (tag: website)
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

La base de données PostgreSQL est gérée par Ansible (role postgresql).

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
La base de données est configurée via les variables Ansible Vault et déployée automatiquement.

</details>

<details>
<summary>🌙 Nightly checks (statut du dernier push main)</summary>

_Ces jobs sont **conditionnés** (push main, approval ou commande). Ils ne tournent **pas** sur chaque PR pour économiser le runner. Tu vois ici leur dernier statut sur \`main\`._

| Job | Dernier run main | Statut | Lien |
|---|---|---|---|
EOF

fetch_last_nightly_job "test-e2e"
cat << EOF >> pr_report.md
| E2E (supertest) | $NC_DATE | $(status_emoji "$NC_STATUS") $NC_STATUS | $([[ -n "$NC_URL" ]] && echo "[run]($NC_URL)" || echo "—") · cmd \`/run-e2e\` |
EOF

fetch_last_nightly_job "mutation-test"
cat << EOF >> pr_report.md
| Mutation testing (Stryker) | $NC_DATE | $(status_emoji "$NC_STATUS") $NC_STATUS | $([[ -n "$NC_URL" ]] && echo "[run]($NC_URL)" || echo "—") · cmd \`/run-mutation\` |
EOF

fetch_last_workflow_run "e2e-fullstack.yml"
cat << EOF >> pr_report.md
| E2E full-stack | $NC_DATE | $(status_emoji "$NC_STATUS") $NC_STATUS | $([[ -n "$NC_URL" ]] && echo "[run]($NC_URL)" || echo "—") |

> Pour relancer un job sur cette PR : commenter \`/run-e2e\` ou \`/run-mutation\`.

</details>

---
*Ce rapport a été généré automatiquement par le pipeline CI/CD.*
EOF

echo "✅ Rapport PR généré: pr_report.md"
