# US — Afficher le statut `scan-image` (Trivy) dans le commentaire PR backend

## Rôle / Action / Bénéfice

> **En tant que** Expert Red Team / DevSecOps,
> **je veux** voir le résultat du scan Trivy de l'image Docker backend dans le commentaire de la PR,
> **afin de** ne pas merger une image qui contient des CVE CRITICAL/HIGH non traités sans en être conscient.

## Critères d'acceptation

- [ ] `backend/.github/workflows/cicd.yml` : le job `pr-report` ajoute `scan-image` à son `needs:`
- [ ] `pr-report` expose `SCAN_IMAGE_STATUS: ${{ needs.scan-image.result || 'skipped' }}`
- [ ] La table principale du commentaire affiche `**Scan image (Trivy)** | $SCAN_IMAGE_STATUS | Vulnérabilités CRITICAL/HIGH (informationnel)`
- [ ] Section repliable `<details><summary>🔍 Sécurité image (Trivy)</summary>` ajoutée :
  - statut explicite (✅ aucun CVE bloquant / ⚠️ scan en échec / ⏭️ skipped car build Docker raté)
  - lien explicite vers le SARIF dans GitHub Security : `https://github.com/${GITHUB_REPOSITORY}/security/code-scanning?query=tool%3ATrivy`
  - rappel : « Trivy est informationnel (`exit-code: '0'`), il ne bloque pas le merge mais doit être lu »
- [ ] Le statut global du commentaire **n'est pas dégradé** si Trivy échoue (informationnel) — mais un emoji ⚠️ apparaît dans le résumé global
- [ ] Testé sur une PR : la section apparaît avec le bon statut et les bons liens

## Effort estimé

S (~1 h)

## Dépendances

- Aucune (autonome)

## Notes

- Trivy a actuellement `exit-code: '0'` dans `cicd.yml` : le scan ne bloque jamais. C'est volontaire (politique informationnelle, voir `# SECURITY: Trivy was compromised...`). Garder ce comportement, juste rendre visible.
