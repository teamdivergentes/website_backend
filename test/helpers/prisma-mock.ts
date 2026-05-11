import { PrismaService } from '../../src/prisma.service';

/**
 * Retourne un objet mock typé de toutes les méthodes Prisma utilisées dans les services.
 * Chaque méthode est un jest.fn() réinitialisé entre les tests.
 *
 * Usage :
 *   const prismaMock = createPrismaMock();
 *   { provide: PrismaService, useValue: prismaMock }
 *
 * Réinitialiser entre les tests :
 *   afterEach(() => jest.clearAllMocks());
 */

/** Type des méthodes CRUD Prisma partagées par tous les modèles. */
type PrismaModelMock = {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
  upsert: jest.Mock;
  aggregate: jest.Mock;
  updateMany: jest.Mock;
  deleteMany: jest.Mock;
  createMany: jest.Mock;
};

/** Sous-ensemble partiel de PrismaService mocké. */
export type PrismaMock = Pick<PrismaService, '$connect' | '$disconnect' | '$transaction'> & {
  user: PrismaModelMock;
  role: PrismaModelMock;
  config: PrismaModelMock;
  staffMember: PrismaModelMock;
  team: PrismaModelMock;
  teamMember: PrismaModelMock;
  game: PrismaModelMock;
  sponsor: PrismaModelMock;
  sponsorImage: PrismaModelMock;
  sponsorLink: PrismaModelMock;
  article: PrismaModelMock;
  articleType: PrismaModelMock;
  recruitmentPost: PrismaModelMock;
  twitchChannel: PrismaModelMock;
  coachingStaff: PrismaModelMock;
};

/** Crée un mock de modèle Prisma avec toutes les méthodes CRUD. */
function createModelMock(): PrismaModelMock {
  return {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  };
}

/**
 * Crée un mock complet du PrismaService couvrant tous les modèles du schéma Prisma.
 * Retourne un objet typé prêt à être injecté dans le module de test NestJS.
 */
export function createPrismaMock(): PrismaMock {
  return {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    user: createModelMock(),
    role: createModelMock(),
    config: createModelMock(),
    staffMember: createModelMock(),
    team: createModelMock(),
    teamMember: createModelMock(),
    game: createModelMock(),
    sponsor: createModelMock(),
    sponsorImage: createModelMock(),
    sponsorLink: createModelMock(),
    article: createModelMock(),
    articleType: createModelMock(),
    recruitmentPost: createModelMock(),
    twitchChannel: createModelMock(),
    coachingStaff: createModelMock(),
  };
}
