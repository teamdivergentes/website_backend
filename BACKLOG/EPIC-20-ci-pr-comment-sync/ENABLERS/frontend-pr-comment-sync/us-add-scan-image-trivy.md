# US — Afficher le statut `scan-image` (Trivy) dans le commentaire PR frontend

## Rôle / Action / Bénéfice

> **En tant que** Expert Red Team / DevSecOps,
> **je veux** voir le résultat du scan Trivy de l'image Docker frontend dans le commentaire PR,
> **afin d'** être alerté sans aller dans GitHub Security tab.

## Critères d'acceptation

- [ ] `frontend/.github/workflows/cicd.yml` : le job `pr-report` ajoute `scan-image` à son `needs:`
- [ ] Variable `SCAN_IMAGE_STATUS: ${{ needs.scan-image.result || 'skipped' }}` exposée
- [ ] La table principale affiche `**Scan image (Trivy)** | $SCAN_IMAGE_STATUS | Vulnérabilités CRITICAL/HIGH (informationnel)`
- [ ] Section repliable « 🔍 Sécurité image (Trivy) » identique en structure à la version backend (cohérence) :
  - statut explicite
  - lien `https://github.com/${GITHUB_REPOSITORY}/security/code-scanning?query=tool%3ATrivy`
  - rappel « informationnel, ne bloque pas le merge »
- [ ] Statut global non dégradé si Trivy échoue (informationnel)

## Effort estimé

S (~30 min)

## Dépendances

- Aucune

## Note

Les sections backend et frontend doivent avoir le même format pour permettre l'harmonisation prévue dans l'enabler `pr-comment-harmonization-and-docs`.
