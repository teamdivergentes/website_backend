# Enabler — Divergences supply-chain CI (trivy-action et docker/build-push-action)

## Origine

Detecte par audit VQO security supply-chain F5 le 2026-05-07. Les defauts sont **pre-existants** (pas introduits par F5) — traces ici comme dette technique a corriger en suivi de l'EPIC-upgrades.

## Contexte technique

### 1. Divergence `aquasecurity/trivy-action` frontend vs commentaire de securite

Le frontend (`frontend/.github/workflows/cicd.yml:857,867`) utilise `aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25` qui est en realite **v0.36.0**, alors que :

- Le commentaire indique `# v0.35.0 (verified safe)` — incorrect.
- Le commentaire de securite ligne 852-854 dit explicitement : "Only SHA 57a97c7 (v0.35.0) is verified safe. Do NOT update without verification" suite a une attaque supply-chain mars 2026 (advisory GHSA-69fq-xp46-6x23).
- Le backend, lui, est correctement sur v0.35.0 SHA `57a97c7e`.

**Hypothese** : un Dependabot a mis a jour le SHA en v0.36.0 sans actualiser le commentaire ni passer l'etape de verification documentee.

### 2. Divergence `docker/build-push-action` backend vs frontend

| Repo | SHA | Version reelle | Commentaire |
|------|-----|---------------|-------------|
| backend | `d08e5c354a6adb9ed34480a06d141179aa583294` | **v7.0.0** | `# v6.4.1` (incorrect) |
| frontend | `ca052bb54b8a9f7f4f...` | **v5.4.0** | `# v6.4.1` (incorrect) |

Les 2 SHAs sont legitimes mais les versions sont differentes (v5.4.0 vs v7.0.0) — comportement de build potentiellement different entre les 2 repos sans visibilite (commentaire identique trompeur).

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-revert-trivy-frontend-to-035-or-verify-036.md](us-revert-trivy-frontend-to-035-or-verify-036.md) | Fait (PR #164 mergee develop 2026-05-06) | A faire | A faire | A faire |
| [us-align-build-push-action-cross-repo.md](us-align-build-push-action-cross-repo.md) | Fait (PR backend #120 + frontend #173 mergees develop 2026-05-07 — aligne sur v7.0.0) | A faire | A faire | A faire |

## Criteres de validation enabler

- [ ] `aquasecurity/trivy-action` aligne sur la meme version safe sur backend et frontend.
- [ ] Commentaires `# vX.Y.Z` correspondent au SHA reel sur les 2 repos.
- [ ] `docker/build-push-action` aligne sur la meme version sur backend et frontend.
- [ ] Justification documentee pour chaque action (commentaire au-dessus du `uses:`).

## Effort estime

S (≈ 1 h) — chore(ci) simple sans test fonctionnel impacte.

## Dependances

Aucune (independant de F5 deja livree).
