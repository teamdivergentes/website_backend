# US — Migration Prisma : ajouter `nationality`, `birthDate`, `customFields` a `coaching_staff`

## Role / Action / Benefice

> **En tant qu**'editeur de contenu admin,
> **je veux** disposer des memes champs editoriaux pour un coach que pour un joueur,
> **afin de** publier une fiche aussi riche (nationalite, date de naissance, donnees personnalisees).

## Criteres d'acceptation

- [ ] Nouvelle migration Prisma (datee + nommee `add_coach_editorial_fields`).
- [ ] Trois colonnes ajoutees a `coaching_staff` :
  - `nationality VARCHAR NULL`
  - `birth_date TIMESTAMP NULL`
  - `custom_fields JSONB NULL`
- [ ] Modele Prisma `CoachingStaff` mis a jour (camelCase Prisma, snake_case via `@map`).
- [ ] Migration testee en local : applique + rollback dry-run OK.
- [ ] Aucun impact sur les donnees existantes (champs optionnels, pas de default destructif).
- [ ] Test backend : `coaching-staff.service.spec.ts` couvre la creation avec et sans les nouveaux champs.

## Notes techniques

- **Ne jamais modifier** un `migration.sql` existant (regle CLAUDE.md) — toujours en creer un nouveau.
- S'inspirer du modele `TeamMember` qui a deja ces 3 champs.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| BDD | A faire | A faire | A faire | A faire |
| Backend | A faire | A faire | A faire | A faire |
