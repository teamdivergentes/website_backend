# Helpers de test - Backend NestJS DVG

Ce dossier contient les utilitaires réutilisables pour les tests unitaires et
d'intégration du backend Team Divergentes.

## Structure

```
test/helpers/
  prisma-mock.ts       – Mock complet du PrismaService
  test-app.ts          – Démarrage INestApplication avec mocks
  factories/
    article.factory.ts
    game.factory.ts
    recruitment.factory.ts
    sponsor.factory.ts
    team.factory.ts
    user.factory.ts
```

---

## prisma-mock.ts

`createPrismaMock()` retourne un objet typé `PrismaMock` avec tous les modèles
Prisma mockés (chaque méthode CRUD est un `jest.fn()`).

```typescript
import { createPrismaMock } from '../../test/helpers/prisma-mock';

const prismaMock = createPrismaMock();

beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      MyService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  }).compile();
  service = module.get(MyService);
});

afterEach(() => jest.clearAllMocks());
```

Modèles disponibles : `user`, `role`, `config`, `staffMember`, `team`,
`teamMember`, `game`, `sponsor`, `sponsorImage`, `sponsorLink`, `article`,
`articleType`, `recruitmentPost`, `twitchChannel`, `coachingStaff`.

Chaque modèle expose : `findMany`, `findUnique`, `findFirst`, `create`,
`update`, `delete`, `count`, `upsert`, `aggregate`, `updateMany`,
`deleteMany`, `createMany`.

---

## test-app.ts

`createTestApp()` démarre un `INestApplication` complet avec `ValidationPipe`
global et PrismaService mocké. Adapté aux tests qui ont besoin d'un vrai
contexte HTTP (supertest).

```typescript
import { createTestApp } from '../../test/helpers/test-app';

let app: INestApplication;
let prismaMock: PrismaMock;

beforeAll(async () => {
  const result = await createTestApp({
    moduleMetadata: { imports: [GamesModule] },
  });
  app = result.app;
  prismaMock = result.prismaMock;
});

afterAll(() => app.close());
```

---

## Factories

Chaque factory expose une ou plusieurs fonctions `create*Record(overrides?)`.
Toutes acceptent un `Partial<Model>` en argument pour surcharger les valeurs
par défaut. Les `id` sont auto-incrémentés par module — appeler `reset*IdCounter()`
dans `beforeEach` si l'ordre d'ID doit être prévisible.

```typescript
import { createGameRecord } from '../../test/helpers/factories/game.factory';

const game = createGameRecord({ key: 'valorant', name: 'Valorant' });
// { id: 1, key: 'valorant', name: 'Valorant', active: true, ... }

const inactiveGame = createGameRecord({ active: false });
// { id: 2, active: false, ... }
```

Factories disponibles :

| Fichier               | Fonctions exportées                                    |
|-----------------------|--------------------------------------------------------|
| `user.factory.ts`     | `createUserRecord`, `createUserWithRole`               |
| `game.factory.ts`     | `createGameRecord`                                     |
| `team.factory.ts`     | `createTeamRecord`, `createTeamMemberRecord`           |
| `sponsor.factory.ts`  | `createSponsorRecord`, `createSponsorImageRecord`, `createSponsorLinkRecord` |
| `article.factory.ts`  | `createArticleRecord`, `createArticleTypeRecord`       |
| `recruitment.factory.ts` | `createRecruitmentPostRecord`                       |

---

## Couverture de code

La configuration Jest se trouve dans `jest.config.ts` à la racine du projet.

```bash
npm run test:cov   # Génère coverage/lcov.info + coverage/index.html
npm run test       # Tests sans coverage
```

Les seuils actuels sont proches de la baseline mesurée le 2026-04-28.
Voir le `TODO(EPIC-19)` dans `jest.config.ts` pour la montée progressive.
