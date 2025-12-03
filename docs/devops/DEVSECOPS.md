# 🚀 DevOps - Backend NestJS

## Vue d'ensemble

Cette section documente l'ensemble de l'infrastructure DevOps pour le backend NestJS, incluant la CI/CD, le déploiement avec base de données PostgreSQL externe.

## 📋 Table des matières

### 🔄 [CI/CD Pipeline](ci-cd-pipeline.md)
- Architecture du pipeline
- Workflows GitHub Actions
- Gestion des environnements
- Stratégies de déploiement

### 🐳 [Déploiement](deployment.md)
- Guide de déploiement
- Configuration des environnements
- Commandes Docker
- Dépannage


## 🏗️ Architecture DevOps

```mermaid
graph TB
    A[Code Push] --> B[CI Pipeline]
    B --> C[Build NestJS]
    B --> D[Tests Unit + E2E]
    B --> E[Linting]
    B --> F[Security Scan]
    C --> G[Docker Build]
    D --> G
    E --> G
    F --> G
    G --> H[Image Registry]
    H --> I[Deployment]
    I --> J[PREPROD + PostgreSQL]
    I --> K[PROD + PostgreSQL]
    
    L[PR Reports] --> M[Documentation]
    N[Prisma Migrations] --> M
    O[Security Alerts] --> M
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style H fill:#fff3e0
    style I fill:#e8f5e8
    style M fill:#fce4ec
```

## 🔧 Outils utilisés

| Catégorie | Outils | Description |
|-----------|--------|-------------|
| **CI/CD** | GitHub Actions | Pipeline d'intégration continue |
| **Build** | NestJS CLI, npm | Compilation et packaging |
| **Tests** | Jest, ESLint, Semgrep | Tests unitaires, e2e, qualité et sécurité |
| **Database** | PostgreSQL, Prisma | Base de données et ORM |
| **Containers** | Docker, Node.js | Containerisation et runtime |
| **Registry** | GitHub Container Registry | Stockage des images |
| **Deploy** | Coolify API | Déploiement automatique |
| **Monitoring** | GitHub API | Rapports et métriques |
