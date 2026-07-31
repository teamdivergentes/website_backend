# US — Permettre la reprise quand l'image :RELEASE est absente

**Priorité** : 🟡 3
**Fichier** : `.github/workflows/cicd.yml` (backend + frontend)

## Rôle / Action / Bénéfice

**En tant qu'** opérateur,
**je veux** pouvoir reconstruire une image `:RELEASE` manquante depuis GitHub Actions,
**afin de** ne pas avoir à me connecter en SSH sur le VPS pour rétablir la production.

## Problème constaté

Le garde-fou `check-tag-run` (EPIC-24) détecte correctement le cas où le « tag run » ne démarre pas, et oriente l'opérateur :

> `L'operateur peut relancer via workflow_dispatch + deploy_tag.`

Mais ce chemin de reprise **skippe volontairement le rebuild** :

> `# le rebuild est sauté (l'image :RELEASE existe déjà sur GHCR)`

et **vérifie même que l'image existe** (`Verify RELEASE image exists on GHCR`), échouant sinon. Il est donc inutilisable précisément dans le cas où `:RELEASE` n'a jamais été construite ou a été supprimée — ce qui est exactement l'incident 2.

La seule commande qui reconstruit réellement `:RELEASE` est :

```bash
gh workflow run cicd.yml --ref vX.Y.Z
```

(`determine-tags.sh` détecte `refs/tags/v*` → `TAG_SUFFIX=RELEASE`), mais elle n'est documentée nulle part.

## Critères d'acceptation

- [ ] Le chemin `workflow_dispatch + deploy_tag` détecte l'absence de l'image sur GHCR et, dans ce cas, **effectue le rebuild** au lieu d'échouer (au lieu du `exit 1` actuel).
- [ ] Le comportement existant est préservé quand l'image **est** présente (pas de rebuild inutile).
- [ ] La commande de reprise `gh workflow run cicd.yml --ref vX.Y.Z` est documentée en commentaire dans `cicd.yml` **et** dans le message d'erreur / la notification de `check-tag-run`.
- [ ] Appliqué de façon symétrique dans les 2 repos.

## Contexte de l'incident (pour la doc)

Le 2026-07-22, `:RELEASE` ayant été supprimée par le cleanup GHCR, aucun chemin GitHub Actions ne permettait de la restaurer : il a fallu se connecter au VPS et re-pousser l'image locale. C'est ce trou que cette US comble.
