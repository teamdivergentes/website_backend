# US — DTOs + formulaire admin coaching staff : parite avec les joueurs

## Role / Action / Benefice

> **En tant qu**'admin / CM,
> **je veux** editer la nationalite, la date de naissance et les champs personnalises d'un coach depuis le formulaire admin,
> **afin de** publier une fiche complete sans contournement.

## Criteres d'acceptation

### Backend

- [ ] `CreateCoachingStaffDto` et `UpdateCoachingStaffDto` exposent les nouveaux champs (`nationality?: string`, `birthDate?: string`, `customFields?: Record<string, unknown>`).
- [ ] Validation `class-validator` : `@IsOptional()` + `@IsString()` / `@IsDateString()` / `@IsObject()`.
- [ ] `CoachingStaffDto` (reponse) renvoie egalement ces champs.
- [ ] Tests unitaires : un coach cree avec et sans nationalite est correctement persiste et serialise.

### Frontend (admin)

- [ ] Le formulaire admin de coaching staff (modal ou page) expose les memes champs editoriaux que le formulaire joueur (`nationality`, `birthDate`, eventuels champs personnalises).
- [ ] Reutilisation des composants formulaire existants (`<app-nationality-select>`, datepicker) — pas de duplication.
- [ ] Test unitaire : submit avec les nouveaux champs renvoie le bon payload.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Backend | A faire | A faire | A faire | A faire |
| Frontend admin | A faire | A faire | A faire | A faire |
