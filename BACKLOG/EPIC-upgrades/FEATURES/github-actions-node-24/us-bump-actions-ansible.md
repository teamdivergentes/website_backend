# US — Bumper les GitHub Actions du repo ansible_vps vers Node.js 24

> **Statut Claude (2026-05-09) : Fait.** Verification `grep "uses:"` du 2026-05-09 sur `.github/workflows/*.yml` confirme `actions/checkout@v6.0.2` et `actions/setup-python@v6.2.0` (Node.js 24 baseline). Aucune ref `v4.x` ni `v5.x` residuelle.

## Role / Action / Benefice

> **En tant que** Expert DevSecOps,
> **je veux** pinner et mettre a jour les actions JavaScript du workflow `deploy.yml` du repo `ansible_vps`,
> **afin que** le pipeline de deploiement Ansible respecte la baseline Node.js 24 et la regle de securite "pin par SHA".

## Perimetre fichiers

- `ansible_vps/.github/workflows/deploy.yml`
- `ansible_vps/.github/workflows/runner-check.yml`

## Constat

Le repo `ansible_vps` est presque a jour, mais :

- `actions/setup-python@v5` est utilise **avec un tag flottant** (lignes 62 et 89), ce qui viole la regle de pinning par SHA appliquee partout ailleurs.
- `actions/checkout@v6.0.2` est deja pinne correctement (rien a faire).

## Bumps a effectuer

| Fichier | Ligne | Action | Etat actuel | Cible |
|---------|-------|--------|------------|-------|
| `deploy.yml` | 62 | `actions/setup-python` | `@v5` (tag flottant) | derniere `v6.x` pinnee par SHA + commentaire |
| `deploy.yml` | 89 | `actions/setup-python` | `@v5` (tag flottant) | meme version pinnee |

## Criteres d'acceptation

- [ ] `grep "actions/setup-python@v" ansible_vps/.github/workflows/` ne retourne plus aucun tag — uniquement des SHA.
- [ ] La version cible est pinnee par SHA et accompagnee d'un commentaire `# vX.Y.Z`.
- [ ] Le workflow `deploy.yml` continue a executer le playbook Ansible sans erreur (lance en `workflow_dispatch` sur un run de test ou pendant un deploiement reel).
- [ ] Le warning `Node.js 20 actions are deprecated` ne s'affiche plus pour les actions `setup-python`.
- [ ] Python 3.x dispo sur le runner self-hosted (Python >= 3.8 requis par `setup-python@v6`).

## Notes techniques

- `actions/setup-python@v6` impose Python 3.8+ sur le runner — verifier l'OS du runner self-hosted DVG (deja 3.10+ documente dans la session 2026-04-25).
- Si le runner self-hosted ne dispose pas du toolcache Python pre-installe, l'action telechargera la version au premier run — tolerer un overhead de ~30 s.

## Effort

XS (≈ 30 min).

## Dependances

Aucune.
