import { PrismaClient } from '../generated/prisma';

/**
 * Tests d'intégrité pour les modèles TwitchChannel et CoachingStaff.
 *
 * Couvre :
 *   - TwitchChannel.username unique
 *   - TwitchChannel.teamMemberId SET NULL on delete TeamMember
 *   - CoachingStaff.teamId CASCADE on delete Team
 *   - CoachingStaff.slug unique mais nullable (deux records slug = null coexistent)
 */
describe('TwitchChannel + CoachingStaff — integrity', () => {
  let prisma: PrismaClient;

  // IDs des enregistrements créés durant les tests (nettoyage garanti)
  let testTeamId: number;
  let testMemberId: number;
  let twitchId1: number;
  let twitchId2: number;
  let coachId1: number;
  let coachId2: number;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    // Nettoyage dans l'ordre FK
    await prisma.twitchChannel.deleteMany({
      where: { username: { startsWith: '__test_integrity__' } },
    });
    await prisma.coachingStaff.deleteMany({
      where: { name: { startsWith: '__test_integrity__' } },
    });
    // Les teamMember + team sont supprimés en cascade via le test CASCADE,
    // mais on nettoie au cas où un test aurait échoué avant la suppression.
    await prisma.teamMember
      .deleteMany({ where: { name: { startsWith: '__test_integrity__' } } })
      .catch(() => undefined);
    await prisma.team
      .deleteMany({ where: { slug: { startsWith: '__test_integrity__' } } })
      .catch(() => undefined);
    await prisma.$disconnect();
  });

  // ─── Setup commun ─────────────────────────────────────────────────────────

  beforeEach(async () => {
    // Créer une team et un member de test frais
    const team = await prisma.team.create({
      data: {
        name: '__test_integrity__ Team',
        slug: `__test_integrity__team-${Date.now()}`,
        game: 'LoL',
      },
    });
    testTeamId = team.id;

    const member = await prisma.teamMember.create({
      data: {
        name: '__test_integrity__ Player',
        role: 'ADC',
        teamId: testTeamId,
      },
    });
    testMemberId = member.id;
  });

  afterEach(async () => {
    // Supprimer TwitchChannels et CoachingStaff liés aux fixtures de ce test
    await prisma.twitchChannel
      .deleteMany({ where: { teamMemberId: testMemberId } })
      .catch(() => undefined);
    await prisma.twitchChannel
      .deleteMany({ where: { username: { startsWith: '__test_integrity__' } } })
      .catch(() => undefined);
    await prisma.coachingStaff
      .deleteMany({ where: { teamId: testTeamId } })
      .catch(() => undefined);
    // TeamMember puis Team (cascade ne s'applique pas en sens inverse ici)
    await prisma.teamMember
      .deleteMany({ where: { teamId: testTeamId } })
      .catch(() => undefined);
    await prisma.team.delete({ where: { id: testTeamId } }).catch(() => undefined);
  });

  // ─── Test 1 : TwitchChannel.username unique ────────────────────────────────

  it('TwitchChannel.username doit être unique', async () => {
    const username = `__test_integrity__streamer-${Date.now()}`;

    const ch = await prisma.twitchChannel.create({
      data: { username, displayName: 'Test Streamer' },
    });
    twitchId1 = ch.id;

    await expect(
      prisma.twitchChannel.create({ data: { username } }),
    ).rejects.toThrow();

    await prisma.twitchChannel.delete({ where: { id: twitchId1 } });
  });

  // ─── Test 2 : TwitchChannel.teamMemberId SET NULL on delete TeamMember ─────

  it('TwitchChannel.teamMemberId doit être mis à NULL quand le TeamMember est supprimé', async () => {
    const ch = await prisma.twitchChannel.create({
      data: {
        username: `__test_integrity__linked-${Date.now()}`,
        teamMemberId: testMemberId,
      },
    });
    twitchId2 = ch.id;

    // Supprimer le membre
    await prisma.teamMember.delete({ where: { id: testMemberId } });

    const after = await prisma.twitchChannel.findUnique({ where: { id: twitchId2 } });
    expect(after).not.toBeNull();
    expect(after!.teamMemberId).toBeNull();

    await prisma.twitchChannel.delete({ where: { id: twitchId2 } });
    // Empêcher le afterEach de tenter une suppression sur un member déjà supprimé
    testMemberId = -1;
  });

  // ─── Test 3 : CoachingStaff.teamId CASCADE on delete Team ─────────────────

  it('CoachingStaff doit être supprimé en CASCADE quand la Team est supprimée', async () => {
    const coach = await prisma.coachingStaff.create({
      data: {
        name: '__test_integrity__ Coach',
        role: 'Head Coach',
        teamId: testTeamId,
      },
    });
    coachId1 = coach.id;

    // Supprimer la team (cascade)
    await prisma.teamMember.deleteMany({ where: { teamId: testTeamId } });
    await prisma.team.delete({ where: { id: testTeamId } });

    const after = await prisma.coachingStaff.findUnique({ where: { id: coachId1 } });
    expect(after).toBeNull();

    // Signaler au afterEach que la team est déjà supprimée
    testTeamId = -1;
    testMemberId = -1;
  });

  // ─── Test 4 : CoachingStaff.slug nullable — deux NULL coexistent ───────────

  it('CoachingStaff.slug nullable : deux enregistrements avec slug = null doivent coexister', async () => {
    const c1 = await prisma.coachingStaff.create({
      data: {
        name: '__test_integrity__ CoachA',
        role: 'Drafter',
        teamId: testTeamId,
        slug: null,
      },
    });
    coachId1 = c1.id;

    const c2 = await prisma.coachingStaff.create({
      data: {
        name: '__test_integrity__ CoachB',
        role: 'Manager',
        teamId: testTeamId,
        slug: null,
      },
    });
    coachId2 = c2.id;

    const rows = await prisma.coachingStaff.findMany({
      where: { teamId: testTeamId, slug: null },
    });
    expect(rows.length).toBeGreaterThanOrEqual(2);

    await prisma.coachingStaff.deleteMany({ where: { id: { in: [coachId1, coachId2] } } });
  });

  // ─── Test 5 : CoachingStaff.slug unique sur valeurs non-NULL ─────────────

  it('CoachingStaff.slug doit être unique sur les valeurs non-null', async () => {
    const slug = `__test_integrity__coach-slug-${Date.now()}`;

    const c1 = await prisma.coachingStaff.create({
      data: { name: '__test_integrity__ CoachX', role: 'Coach', teamId: testTeamId, slug },
    });
    coachId1 = c1.id;

    await expect(
      prisma.coachingStaff.create({
        data: { name: '__test_integrity__ CoachY', role: 'Coach', teamId: testTeamId, slug },
      }),
    ).rejects.toThrow();

    await prisma.coachingStaff.delete({ where: { id: coachId1 } });
  });
});
