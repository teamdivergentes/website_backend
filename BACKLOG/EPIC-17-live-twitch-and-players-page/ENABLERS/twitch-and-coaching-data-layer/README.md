# Enabler — Couche donnees Twitch & Coaching staff

## Contexte technique

Toutes les features de l'EPIC-17 reposent sur deux nouveaux modeles Prisma et une integration externe (API Twitch Helix). Cet enabler fournit les fondations BDD/API qui doivent etre posees **avant** d'attaquer les features publiques et admin.

## Decisions structurantes

### Modele `TwitchChannel`

Modele **standalone** (pas integre a `TeamMember`) pour permettre des streamers non lies a une team (ambassadeurs, partenaires).

```prisma
model TwitchChannel {
  id            Int          @id @default(autoincrement())
  username      String       @unique         // pseudo Twitch (ex: "pendulelapin7")
  displayName   String?                      // nom affiche (fallback: username)
  gameLabel     String?                      // jeu (display only, pour offline)
  description   String?                      // courte description optionnelle
  active        Boolean      @default(true)
  position      Int          @default(0)
  teamMemberId  Int?
  teamMember    TeamMember?  @relation(fields: [teamMemberId], references: [id], onDelete: SetNull)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@map("twitch_channels")
}
```

> Le statut `live` n'est **pas en BDD** : il est recupere en temps reel via l'API Twitch Helix avec un cache backend de 60 s.

### Modele `CoachingStaff`

Modele **separe** lie a `Team` (concept distinct de `TeamMember`, vocabulaire de role different).

```prisma
model CoachingStaff {
  id          Int      @id @default(autoincrement())
  teamId      Int
  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  name        String
  realName    String?
  role        String                         // Head Coach, Drafter, Preparateur, Analyste, Manager...
  image       String?
  biography   String?
  position    Int      @default(0)
  socials     Json?
  slug        String?  @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("coaching_staff")
}
```

### Integration API Twitch Helix

- **Variables d'env backend** : `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`
- App access token obtenu via `POST https://id.twitch.tv/oauth2/token` (cache memoire jusqu'a expiration)
- Status live : `GET https://api.twitch.tv/helix/streams?user_login=...` (jusqu'a 100 logins par requete)
- Cache backend : 60 s (NestJS `@nestjs/cache-manager` ou Map maison)
- **Spike technique optionnel** : evaluation EventSub pour passer en push si le polling 60 s s'avere insuffisant (decision en cours d'EPIC, hors scope MVP)

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-prisma-twitch-channel-model.md](us-prisma-twitch-channel-model.md) | Fait | A faire | A faire | A faire |
| [us-prisma-coaching-staff-model.md](us-prisma-coaching-staff-model.md) | Fait | A faire | A faire | A faire |
| [us-twitch-helix-service.md](us-twitch-helix-service.md) | Fait | A faire | A faire | A faire |
| [us-backend-twitch-channels-crud.md](us-backend-twitch-channels-crud.md) | Fait | A faire | A faire | A faire |
| [us-backend-coaching-staff-crud.md](us-backend-coaching-staff-crud.md) | Fait | A faire | A faire | A faire |
| [us-data-migration-system-roles-permissions.md](us-data-migration-system-roles-permissions.md) | Fait (PR #117 mergee develop 2026-05-06) | A faire | A faire | A faire |

## Etat CI — PR #60 (2026-04-30) run 25166446062

- **Branche** : `feat/epic-17-backend-services` — rebased proprement sur `origin/develop`
- **SHA tip** : `4f94609` (test(twitch+coaching): add coverage to pass DVG-Strict QG)
- **Methode** : cherry-pick des 11 commits EPIC-17 sur develop HEAD (`b46f333`) — sans merge commits ni jobs CI obsoletes
- **validate-migrations** : absent (retire depuis #90 — non reintroduit). CI propre.
- **Tests** : 467 passes, 0 echec (35 suites). lint : PASS. build : PASS.
- **Issues critiques Sonar** : S2871 (localeCompare) + S3776 (cognitive complexity) — corrigees dans `48aa706`
- **Couverture new code EPIC-17** : >80% sur les 3 services + controllers (100% stmts)

### Sonar QG — BLOQUE (hors scope PR)

| Job CI | Statut |
|--------|--------|
| build | PASS |
| lint | PASS |
| test-unit | PASS |
| sonarqube | FAIL — coverage overall 57% < 80% |
| workflow-status | PASS |

**Cause** : Le QG `DVG-Strict` exige `coverage (overall) >= 80%`. La couverture globale est 57% — probleme herite pre-EPIC-17 (53.1% en baseline 2026-04-26). Les 15 tests controllers EPIC-17 ajoutent +4 points mais sont insuffisants. Corriger exige de couvrir 40+ fichiers sans specs — scope EPIC-19.

**Décision PO requise** : abaisser temporairement le seuil overall sur SonarQube DVG-Strict (ex: 55%) pour debloquer EPIC-17, ou attendre EPIC-19.
