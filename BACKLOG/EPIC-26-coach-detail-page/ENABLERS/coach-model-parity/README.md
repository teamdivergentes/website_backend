# Enabler — Parite modele `CoachingStaff` / `TeamMember`

## Contexte technique

Le modele Prisma `CoachingStaff` possede deja `slug`, `biography`, `image`, `role`, `socials`, mais il manque trois champs editoriaux par rapport a `TeamMember` :

- `nationality` (String?)
- `birthDate` (DateTime?)
- `customFields` (Json?)

Pour que la page detail coach reprenne fidelement la richesse editoriale de la fiche joueur, il faut aligner les schemas. La migration doit etre **non destructive** (champs optionnels, pas de backfill obligatoire).

## Direction technique

- Migration Prisma additive sur `coaching_staff` : ajout des 3 colonnes nullables.
- Mise a jour du DTO `CoachingStaffDto` + `CreateCoachingStaffDto` + `UpdateCoachingStaffDto`.
- Mise a jour du composant admin coaching staff (formulaire) pour pouvoir editer ces champs (parite avec le form joueurs).
- Mise a jour des tests unitaires backend (service + controller + spec DTO).

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [Migration Prisma : ajouter nationality, birthDate, customFields a coaching_staff](us-prisma-add-fields-coachingstaff.md) | A faire | A faire | A faire | A faire |
| [Mettre a jour DTOs + form admin coaching staff](us-dto-admin-form-coach-parity.md) | A faire | A faire | A faire | A faire |
