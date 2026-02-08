# 🔄 Workflow CICD Détaillé

## Vue d'ensemble

Ce document détaille le workflow CICD unifié avec toutes ses conditions, optimisations et flux de données.

## 🏗️ Architecture complète

```mermaid
graph TD
    A[Code Push/PR] --> B[Trigger CICD Workflow]
    B --> C[Build NestJS]
    C --> D{Build réussi?}
    
    %% Scans conditionnels
    D -->|✅ Oui| E[ESLint]
    D -->|✅ Oui| F[Tests Unit + E2E]
    D -->|✅ Oui| G[Semgrep Security]
    D -->|❌ Non| O[PR Report - FAILED]
    
    %% Vérification des scans
    E --> H{Tous les scans OK?}
    F --> H
    G --> H
    H -->|✅ Oui| I[Docker Build]
    H -->|❌ Non| O[PR Report - FAILED]
    
    %% Docker et Registry
    I --> J[Push to Registry]
    J --> K{Type de build}
    
    %% Déploiements conditionnels
    K -->|PR avec DEPLOY| L[Deploy PREPROD]
    K -->|main| M[Deploy PREPROD]
    K -->|tag v*| N[Deploy PROD]
    K -->|PR| O[PR Report]
    
    %% Flux de fin
    L --> O
    M --> P[Workflow Status - SUCCESS]
    N --> P
    O --> P
    
    %% Styles
    style A fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style B fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style C fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style D fill:#ffecb3,stroke:#f57c00,stroke-width:2px
    style H fill:#ffecb3,stroke:#f57c00,stroke-width:2px
    style I fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style J fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    style K fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style L fill:#ffeb3b,stroke:#f9a825,stroke-width:2px
    style M fill:#ffeb3b,stroke:#f9a825,stroke-width:2px
    style N fill:#4caf50,stroke:#2e7d32,stroke-width:2px
    style O fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style P fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

## 📋 Détail des conditions

### Conditions de déclenchement

| Job | Condition | Dépendances |
|-----|-----------|-------------|
| `build` | Toujours | - |
| `lint` | `needs.build.result == 'success'` | `build` |
| `test` | `needs.build.result == 'success'` | `build` |
| `semgrep` | `needs.build.result == 'success'` | `build` |
| `docker` | `needs.build.result == 'success' && needs.lint.result == 'success' && needs.test.result == 'success' && needs.semgrep.result == 'success'` | `build`, `lint`, `test`, `semgrep` |
| `deploy-preprod` | `needs.build.result == 'success' && needs.lint.result == 'success' && needs.test.result == 'success' && needs.semgrep.result == 'success' && needs.docker.result == 'success' && (main OU PR avec [DEPLOY])` | `build`, `lint`, `test`, `semgrep`, `docker` |
| `deploy-prod` | `needs.build.result == 'success' && needs.lint.result == 'success' && needs.test.result == 'success' && needs.semgrep.result == 'success' && needs.docker.result == 'success' && tag v*` | `build`, `lint`, `test`, `semgrep`, `docker` |
| `pr-report` | `github.event_name == 'pull_request'` | `build`, `lint`, `test`, `semgrep`, `docker`, `deploy-preprod`, `deploy-prod` |
| `workflow-status` | `always()` | Tous les jobs |

## 🎯 Flux de données

### Outputs des jobs

| Job | Outputs | Description |
|-----|---------|-------------|
| `docker` | `image-tag`, `workflow-tag`, `version-tag`, `tag-suffix` | Tags générés par `determine-tags.sh` |
| `pr-report` | `report-generated` | Indicateur de génération du rapport |
| `workflow-status` | - | Statut final du workflow |

## 🔄 Scénarios d'exécution

### Scénario 1 : PR normale
1. Build → Lint → Test → Semgrep → Docker → PR Report → Workflow Status

### Scénario 2 : PR avec [DEPLOY]
1. Build → Lint → Test → Semgrep → Docker → Deploy PREPROD → PR Report → Workflow Status

### Scénario 3 : Push sur main
1. Build → Lint → Test → Semgrep → Docker → Deploy PREPROD → Workflow Status

### Scénario 4 : Tag v*
1. Build → Lint → Test → Semgrep → Docker → Deploy PROD → Workflow Status

### Scénario 5 : Build échoue
1. Build (FAILED) → PR Report (avec statut d'échec) → Workflow Status (FAILED)

### Scénario 6 : Lint/Test/Semgrep échoue
1. Build → Lint/Test/Semgrep (FAILED) → PR Report (avec statut d'échec) → Workflow Status (FAILED)
