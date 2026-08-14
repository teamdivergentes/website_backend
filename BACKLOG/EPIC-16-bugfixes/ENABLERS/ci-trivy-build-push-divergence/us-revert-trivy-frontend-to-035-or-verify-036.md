# US — Aligner aquasecurity/trivy-action frontend sur v0.35.0 (verified safe) ou valider v0.36.0

## Role / Action / Benefice

> **En tant qu**'Expert Red Team,
> **je veux** que la version de `aquasecurity/trivy-action` utilisee dans le frontend corresponde **exactement** au SHA `verified safe` documente apres l'incident supply-chain mars 2026,
> **afin que** la regle de securite explicitement ecrite dans le workflow (`Only SHA 57a97c7 (v0.35.0) is verified safe. Do NOT update without verification`) soit reellement respectee.

## Contexte

Audit VQO 2026-05-07 a detecte que le frontend (`frontend/.github/workflows/cicd.yml:857,867`) utilise le SHA `ed142fd0673e97e23eac54620cfb913e5ce36c25` qui est en realite **v0.36.0**, alors que :

- Le commentaire affiche `# v0.35.0 (verified safe)` (INCORRECT).
- Le commentaire de securite au-dessus dit explicitement de NE PAS mettre a jour sans verification.
- Le backend est correctement sur v0.35.0 SHA `57a97c7e`.

Hypothese : un Dependabot a bumpe le SHA sans respecter la regle de securite. La PR de bump n'a probablement pas mentionne l'advisory.

## Criteres d'acceptation

- [ ] Soit revenir au SHA `57a97c7e...` (v0.35.0) coherent avec le backend — option par defaut.
- [ ] Soit verifier via l'advisory GHSA-69fq-xp46-6x23 et la chronologie supply-chain que v0.36.0 est safe, et corriger le commentaire en `# v0.36.0 (verified safe — vetted YYYY-MM-DD)`.
- [ ] Backend ET frontend utilisent le MEME SHA pour `aquasecurity/trivy-action`.
- [ ] Commentaires alignes avec la version reelle.
- [ ] Le workflow CI passe (build + scan trivy).

## Approche recommandee

```bash
# Frontend : revenir au SHA verified safe
sed -i 's|ed142fd0673e97e23eac54620cfb913e5ce36c25|57a97c7eaf5a1eb5cb2e9d6f6d7a1af4e29e6e1f|g' \
  frontend/.github/workflows/cicd.yml

# Verifier le SHA exact backend
grep aquasecurity backend/.github/workflows/cicd.yml | head -1
# uses: aquasecurity/trivy-action@<SHA_BACKEND>  # v0.35.0 (verified safe)

# Reutiliser exactement le meme SHA cote frontend
```

## Effort

XS (≈ 15 min)

## Dependances

Aucune.

## Statut Claude

Fait (PR #164 mergee develop 2026-05-06 — revert SHA frontend a 57a97c7e + ignore Dependabot sur trivy-action)
