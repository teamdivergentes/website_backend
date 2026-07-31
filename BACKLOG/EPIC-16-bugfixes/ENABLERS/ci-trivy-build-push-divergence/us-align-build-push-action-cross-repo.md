# US — Aligner docker/build-push-action sur la meme version backend ET frontend

## Role / Action / Benefice

> **En tant qu**'Expert DevSecOps,
> **je veux** que `docker/build-push-action` soit pinne sur la MEME version dans backend et frontend,
> **afin d'**eliminer les comportements de build divergents et le risque de surface d'attaque heterogene entre les 2 images Docker.

## Contexte

Audit VQO 2026-05-07 a detecte une divergence :

| Repo | SHA | Version reelle | Commentaire actuel |
|------|-----|---------------|--------------------|
| backend | `d08e5c354a6adb9ed34480a06d141179aa583294` | **v7.0.0** | `# v6.4.1` (FAUX) |
| frontend | `ca052bb54b8a9f7f4f...` | **v5.4.0** | `# v6.4.1` (FAUX) |

Les 2 SHAs sont legitimes mais les versions sont 2 majeures d'ecart (v5.4.0 vs v7.0.0). Les 2 commentaires affichent `# v6.4.1` qui ne correspond a aucun des 2 SHAs.

## Criteres d'acceptation

- [ ] Decision PO : version cible commune (recommande : `v7.0.0` deja utilisee par backend, plus recente, plus pedagogique).
- [ ] Backend : confirmer le SHA `d08e5c35...` (deja v7.0.0) et corriger le commentaire en `# v7.0.0`.
- [ ] Frontend : bumper de v5.4.0 (SHA `ca052bb5...`) vers v7.0.0 (SHA `d08e5c35...`) avec commentaire `# v7.0.0`.
- [ ] Le workflow Docker build sur frontend reste vert (verifier que les flags / inputs n'ont pas change entre v5 et v7).
- [ ] Aucun warning dans les logs CI.

## Notes techniques

- v6 a introduit `attestations: true` par defaut → verifier que cela n'introduit pas de side-effect sur le push GHCR.
- v7 a change la signature des outputs (`metadata` deprecie au profit de `imageId`) → si le frontend consomme `outputs.metadata`, prevoir une mise a jour des etapes downstream.
- L'image frontend est nginx-based, le bump est probablement transparent.

## Effort

S (≈ 30 min, dont 20 min pour valider via un run CI)

## Dependances

Aucune (independant de F5 deja livree).

## Statut Claude

A faire
