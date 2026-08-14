# Feature F4 — Upgrade Node 20-alpine → 25-alpine (Docker)

## Repos

`backend` + `frontend`

## Branche git

`chore/node-25-docker` (creee dans chaque repo).

## Contexte

Dependabot remonte Node 25-alpine pour les images Docker. Build CI rouge sur les deux repos. Le passage Node 20 → 25 est un saut de 5 versions majeures, a tester en parallele sur les images backend (Nest) et frontend (build Angular + Nginx serve).

A noter : la PR self-hosted runner (#54 backend / #97 frontend) modifie aussi le pipeline Docker — coordonner les deux pour eviter les conflits.

PRs a fermer apres merge :

| Repo | PR | Bump |
|------|----|------|
| backend | #11 | node 20-alpine → 25-alpine (Dockerfile) |
| frontend | #36 | node 20-alpine → 25-alpine (Dockerfile) |

A noter : la PR backend #11 est en `DIRTY` (conflit) → un rebase manuel sera necessaire.

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-bump-node-backend-docker.md](us-bump-node-backend-docker.md) | Fait | A faire | A faire | A faire |
| [us-bump-node-frontend-docker.md](us-bump-node-frontend-docker.md) | Fait | A faire | A faire | A faire |

## Risques

- Node 25 est une version `Current`, pas LTS → verifier que c'est acceptable (ou bloquer sur 22 LTS).
- `engines.node` du `package.json` peut bloquer.
- Dependances natives (Sharp, bcrypt) peuvent necessiter une rebuild → tester `npm ci --build-from-source`.

## Charge estimee

S (≈ 3 h).
