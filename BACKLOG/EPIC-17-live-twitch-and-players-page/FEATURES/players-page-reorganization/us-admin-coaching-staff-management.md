# US — Gestion admin du coaching staff par equipe

**Statut Claude : Fait Claude** — 2026-05-07

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** ajouter / modifier / supprimer / reordonner les membres du coaching staff d'une equipe depuis le panel admin,
> **afin de** maintenir a jour le staff visible sur le site public.

## Criteres d'acceptation

### Integration UI

- [ ] Sur la page admin de detail d'une equipe (`/admin/teams/:id`), apres la section des joueurs (`TeamMember`), ajouter une nouvelle section "Coaching staff".
- [ ] Bouton "+ Ajouter un coach" qui ouvre une modal de creation.
- [ ] Liste des coachs avec table identique a celle des joueurs : ordre (drag handle), avatar, nom, role, actions (✏ 🗑).
- [ ] Reordonnement par drag-drop (utiliser le pattern existant si present, sinon CDK Drag Drop Material).

### Modal create / edit

- [ ] Champs identiques au formulaire `TeamMember` :
  - Nom (obligatoire)
  - Vrai nom (optionnel)
  - Role (obligatoire, **input texte libre** : Head Coach, Drafter, Preparateur, Analyste, Manager…)
  - Image (drag-drop existant)
  - Biographie (textarea)
  - Slug (genere auto depuis le nom)
  - Position (numerique)
  - Reseaux sociaux (Json optionnel)
- [ ] Validation client : nom non vide, role non vide.
- [ ] Soumission → POST/PATCH `/api/admin/teams/:teamId/coaching-staff` (cf. enabler) → refresh liste.

### Permissions

- [ ] Bouton "+ Ajouter" et icones d'action visibles uniquement si `permissions.includes('coaching_staff:write')` / `:delete`.
- [ ] Permissions ajoutees automatiquement aux roles `admin` et `gestionnaire` via le seed.

### Tests

- [ ] Tests unitaires des composants (modal, list).
- [ ] Test E2E :
  - Login admin
  - Aller sur l'admin d'une equipe
  - Ajouter un coach (avec image)
  - Verifier qu'il apparait dans la liste admin et sur la page publique
  - Modifier le role
  - Reordonner
  - Supprimer

## Effort estime

**Revise 2026-05-07** : M (≈ 1 j) — la majorite de l'US est cote frontend. Le backend CRUD est deja en place (controller, service, DTOs, tests). Detail :

| Lot | Agent | Effort | Notes |
|-----|-------|--------|-------|
| Pre-req BDD : merge PR #117 (data migration permissions Twitch & Coaching) sur develop | `devsecops` ou Team Leader | 0.1 j | Indispensable pour que les admins existants en preprod/prod aient `coaching_staff:*` apres deploiement v1.4.0. |
| Pre-req backend : ajouter `include: { coachingStaff: { orderBy: { position: 'asc' } } }` dans `teams.service.findBySlug()` + spec | `backend-node` | 0.1 j | Necessaire pour que la page publique /structure/equipes/:slug recupere bien le coaching staff via le call principal (cf. critere ligne 11 de `us-frontend-coaching-staff-section.md`). |
| Service Angular `CoachingStaffApiService` (ou ajouter au `TeamsService`) avec methodes `list/create/update/delete/reorder` | `frontend-angular` | 0.2 j | |
| Composant section `coaching-staff-section` integre dans `/admin/teams/:id` (apres la section joueurs) | `frontend-angular` + `ui-ux` | 0.3 j | Calque sur `team-members-dialog/components/team-member-list`. |
| Dialog create / edit `coaching-staff-form-dialog` | `frontend-angular` + `ui-ux` | 0.2 j | Reutiliser `image-upload` + form patterns existants TeamMember. |
| Drag-drop reorder via CDK | `frontend-angular` | 0.05 j | Pattern probablement deja present cote `team-members-list`. |
| Tests TU (service + composants) | `frontend-angular` | 0.1 j | |
| Test E2E Playwright (login admin -> ajouter coach -> verifier liste admin + page publique -> reorder -> delete) | Expert QA / `frontend-angular` | 0.1 j | Cookie HttpOnly `dvg_auth_token` (cf. EPIC-16). |

## Dependances

- Bloque par : `us-prisma-coaching-staff-model.md` (Fait), `us-backend-coaching-staff-crud.md` (Fait).
- **Pre-requis identifies 2026-05-07** :
  - PR #117 (data migration permissions) a merger sur develop avant tag v1.4.0.
  - Fix backend `teams.service.findBySlug()` pour inclure `coachingStaff` (sinon la response publique de `/api/teams/:slug` ne contient pas le staff).

## Endpoints backend disponibles

Verifies presents dans `backend/src/coaching-staff/coaching-staff.controller.ts` :

| Methode | Path | Roles |
|---------|------|-------|
| GET | `/api/teams/:teamId/coaching-staff` | Public |
| GET | `/api/admin/teams/:teamId/coaching-staff` | admin, gestionnaire |
| POST | `/api/admin/teams/:teamId/coaching-staff` | admin, gestionnaire |
| PATCH | `/api/admin/teams/:teamId/coaching-staff/reorder` | admin, gestionnaire |
| PATCH | `/api/admin/coaching-staff/:id` | admin, gestionnaire |
| DELETE | `/api/admin/coaching-staff/:id` | admin, gestionnaire |

Tous proteges par `RolesGuard` + permissions seedees (`coaching_staff:read|write|delete`).
