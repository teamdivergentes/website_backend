import { PrismaClient } from '../../generated/prisma';

/**
 * Donnees de demonstration : equipes, matchs, trophees, sponsors, staff,
 * recrutement, chaines Twitch, coaching.
 *
 * Reservees au developpement et a la preprod. Elles remplissent les pages pour
 * que la recette porte sur des ecrans vivants plutot que sur des listes vides.
 * Le catalogue boutique n'en fait pas partie : c'est le vrai catalogue qu'on
 * valide avant ouverture, il vit dans le socle.
 *
 * Comme le socle, ce jeu ne reecrit rien : tout est cree si absent. Seule
 * exception assumee, la date du match « a venir » de demonstration, rafraichie
 * pour qu'elle reste dans le futur — sans quoi la page des matchs finirait par
 * n'afficher que du passe.
 */
export async function seedDemo(prisma: PrismaClient): Promise<void> {
  // Create initial staff members
  const staffMembers = [
    {
      name: 'Vilvi',
      role: 'President',
      category: 'ADMIN' as const,
      position: 0,
    },
    {
      name: 'Ficello',
      role: 'Vice-Président',
      category: 'ADMIN' as const,
      position: 0,
    },
    {
      name: 'Julien',
      role: 'Trésorier',
      category: 'ADMIN' as const,
      position: 0,
    },
    {
      name: 'Tano',
      role: 'Membre',
      category: 'ADMIN' as const,
      position: 0,
    },
    {
      name: 'Maxime',
      role: 'Membre',
      category: 'ADMIN' as const,
      position: 0,
    },
    {
      name: 'Hugo',
      role: 'Membre',
      category: 'ADMIN' as const,
      position: 0,
    },
    {
      name: 'Maxime',
      role: 'Responsable Developpement',
      category: 'HEADSTAFF' as const,
      position: 0,
    },
    {
      name: 'Gé0tank',
      role: 'Responsable Esportif',
      category: 'HEADSTAFF' as const,
      position: 0,
    },
    {
      name: 'Emerode',
      role: 'Responsable Communication',
      category: 'HEADSTAFF' as const,
      position: 0,
    },
    {
      name: 'Alice',
      role: 'Responsable Ressources Humaines',
      category: 'HEADSTAFF' as const,
      position: 0,
    },
  ];

  for (const member of staffMembers) {
    const existing = await prisma.staffMember.findFirst({
      where: { name: member.name, category: member.category },
    });

    if (!existing) {
      await prisma.staffMember.create({
        data: member,
      });
    }
  }

  console.log('Staff members created:', staffMembers.length);

  // Équipes minimales pour les specs E2E publiques (bandeau matchs, palmarès) et
  // les specs admin qui ont besoin d'au moins une équipe sélectionnable.
  // `dvg-lol-academy` est le slug attendu par les tests E2E de structure/equipes.
  const teamsSeed = [
    { name: 'DVG LoL Academy', slug: 'dvg-lol-academy', game: 'lol', position: 0 },
    { name: 'DVG Valorant', slug: 'dvg-valorant', game: 'valorant', position: 1 },
  ];

  const teamsBySlug = new Map<string, { id: number; name: string }>();
  for (const t of teamsSeed) {
    const team = await prisma.team.upsert({
      where: { slug: t.slug },
      update: {},
      create: { name: t.name, slug: t.slug, game: t.game, position: t.position, active: true },
    });
    teamsBySlug.set(t.slug, { id: team.id, name: team.name });
  }

  console.log('Teams created:', teamsSeed.length);

  // Palmarès et matchs de démonstration pour dvg-lol-academy : nécessaires pour que
  // e2e/tests/public/match-strip.e2e.spec.ts et critical-public-flows.e2e.spec.ts
  // aient des données à exercer (bandeau matchs + palmarès avec troncature).
  const lolAcademy = teamsBySlug.get('dvg-lol-academy')!;

  // Cinq trophées (> 4) pour que le lien « Voir tout le palmarès » soit exercé,
  // avec un 1er, un 2e, un 3e et deux placements hors podium.
  const trophiesSeed = [
    { competition: 'LFL Division 2 — Split Été', placement: 1, date: new Date('2025-07-14T22:00:00.000Z') },
    { competition: 'Coupe de France Esport — LoL', placement: 2, date: new Date('2025-02-20T22:00:00.000Z') },
    { competition: 'LFL Division 2 — Split Hiver', placement: 3, date: new Date('2024-11-05T22:00:00.000Z') },
    { competition: 'LFL Division 2 — Split Printemps', placement: 4, date: new Date('2024-05-12T22:00:00.000Z') },
    { competition: 'Open Amateur LoL', placement: 7, date: new Date('2023-09-18T22:00:00.000Z') },
  ];

  for (const trophy of trophiesSeed) {
    const existing = await prisma.trophy.findFirst({
      where: { teamId: lolAcademy.id, competition: trophy.competition, placement: trophy.placement },
    });
    if (!existing) {
      await prisma.trophy.create({
        data: { ...trophy, teamId: lolAcademy.id, teamLabel: lolAcademy.name, active: true },
      });
    }
  }

  console.log('Trophies created for dvg-lol-academy:', trophiesSeed.length);

  // Un match à venir (date calculée par rapport à `new Date()` pour ne jamais
  // "périmer") et trois matchs passés avec scores (au moins une victoire et une
  // défaite), pour que les pastilles de forme montrent plusieurs issues.
  const upcomingScheduledAt = new Date();
  upcomingScheduledAt.setDate(upcomingScheduledAt.getDate() + 3);
  const upcomingOpponent = 'Zenith Academy';

  const existingUpcoming = await prisma.match.findFirst({
    where: {
      teamId: lolAcademy.id,
      opponentName: upcomingOpponent,
      scoreDvg: null,
      scoreOpponent: null,
    },
  });

  if (existingUpcoming) {
    // Rafraîchit la date pour qu'elle reste dans le futur même si le seed est
    // rejoué longtemps après la création initiale.
    await prisma.match.update({
      where: { id: existingUpcoming.id },
      data: { scheduledAt: upcomingScheduledAt },
    });
  } else {
    await prisma.match.create({
      data: {
        teamId: lolAcademy.id,
        teamNameSnapshot: lolAcademy.name,
        opponentName: upcomingOpponent,
        scheduledAt: upcomingScheduledAt,
        competition: 'LFL Division 2',
        streamUrl: 'https://www.twitch.tv/teamdivergentes',
        active: true,
      },
    });
  }

  const pastMatchesSeed = [
    // Victoire
    {
      opponentName: 'Nova Esports',
      scheduledAt: new Date('2025-06-01T18:00:00.000Z'),
      scoreDvg: 2,
      scoreOpponent: 1,
    },
    // Défaite
    {
      opponentName: 'Pulse Gaming',
      scheduledAt: new Date('2025-05-10T18:00:00.000Z'),
      scoreDvg: 0,
      scoreOpponent: 2,
    },
    // Match nul (variété supplémentaire)
    {
      opponentName: 'Fenix Esports',
      scheduledAt: new Date('2025-04-15T18:00:00.000Z'),
      scoreDvg: 1,
      scoreOpponent: 1,
    },
  ];

  for (const match of pastMatchesSeed) {
    const existing = await prisma.match.findFirst({
      where: { teamId: lolAcademy.id, opponentName: match.opponentName },
    });
    if (!existing) {
      await prisma.match.create({
        data: {
          teamId: lolAcademy.id,
          teamNameSnapshot: lolAcademy.name,
          opponentName: match.opponentName,
          scheduledAt: match.scheduledAt,
          competition: 'LFL Division 2',
          scoreDvg: match.scoreDvg,
          scoreOpponent: match.scoreOpponent,
          active: true,
        },
      });
    }
  }

  console.log('Matches created for dvg-lol-academy: 1 à venir + 3 passés');

  // Create initial sponsors
  const sponsors = [
    {
      name: 'Pulsar Corp',
      slug: 'pulsar-corp',
      description:
        "Pulsar Corp est une micro entreprise de graphisme qui se distingue par son approche innovante et creative. Pilotee par un talentueux graphiste passionne, elle propose des services sur mesure, transformant chaque projet en une oeuvre d'art visuelle.",
      imageLayout: 'LAYOUT_1' as const,
      position: 0,
      active: true,
    },
    {
      name: 'Monster Energy',
      slug: 'monster-energy',
      description:
        "Nous sommes fiers d'annoncer notre partenariat avec Monster Energy, une marque emblematique connue pour ses boissons energetiques qui repoussent les limites de l'ordinaire.",
      imageLayout: 'LAYOUT_2' as const,
      position: 1,
      active: true,
    },
    {
      name: 'SecretLab',
      slug: 'secretlab',
      description:
        "Nous sommes ravis d'annoncer notre partenariat avec Secretlab, la marque de chaises gaming et de bureau de renommee mondiale, reputee pour son confort et sa qualite inegales.",
      imageLayout: 'LAYOUT_3' as const,
      position: 2,
      active: true,
    },
  ];

  for (const sponsor of sponsors) {
    const existing = await prisma.sponsor.findUnique({
      where: { slug: sponsor.slug },
    });

    if (!existing) {
      await prisma.sponsor.create({
        data: sponsor,
      });
    }
  }

  console.log('Sponsors created:', sponsors.length);

  // Create initial recruitment posts
  const recruitmentPosts = [
    {
      title: 'Développeur',
      type: 'Bénévole',
      description: "Participaer dans le développement d'une application Mobile",
      active: true,
      position: 0,
      slug: 'developpeur',
      location: 'Télétravail',
      duration: 'Long terme',
      missions: [
        "Développer et maintenir les sites et applications web de l'association",
        "Gérer l'infrastructure technique : déploiement, serveurs, sauvegardes, sécurité",
        'Optimiser les performances : rapidité, accessibilité, SEO technique',
        "Collaborer avec l'équipe pour traduire les besoins en solutions techniques",
      ].join('\n'),
      skills: [
        'Frontend: Angular',
        'Backend: TypeScript / NestJS',
        'PostgreSQL : conception, gestion et optimisation',
      ].join('\n'),
      requirements: [
        'Formation ou expérience significative en développement web',
        'Autonomie et capacité à travailler en équipe à distance',
        "Sens de l'organisation et respect des délais",
        'Intérêt pour le secteur associatif et/ou le gaming/esport',
        "Curiosité, proactivité et envie d'apprendre",
        "Esprit d'équipe et adaptabilité",
      ].join('\n'),
      benefits: [
        "Une expérience enrichissante au sein d'une équipe passionnée",
        "Flexibilité totale dans l'organisation du temps de travail",
        'Possibilité de développer vos compétences sur des projets concrets',
        'Attestation de bénévolat sur demande',
        'Intégration dans une communauté gaming/esport dynamique',
      ].join('\n'),
    },
  ];

  for (const post of recruitmentPosts) {
    const existing = await prisma.recruitmentPost.findFirst({
      where: { slug: post.slug },
    });

    if (!existing) {
      await prisma.recruitmentPost.create({
        data: post,
      });
    }
  }

  console.log('Recruitment posts created:', recruitmentPosts.length);

  // Create sample TwitchChannels
  const twitchChannels = [
    {
      username: 'pendulelapin7',
      displayName: 'Pendulelapin7',
      gameLabel: 'League of Legends',
      description: 'Joueur pro DVG LoL',
      active: true,
      position: 0,
      // teamMemberId : résolu dynamiquement ci-dessous
    },
    {
      username: 'teamdivergentes',
      displayName: 'Team Divergentes',
      gameLabel: null,
      description: 'Chaîne officielle de la structure Team Divergentes',
      active: true,
      position: 1,
      teamMemberId: null,
    },
  ];

  // Chercher un TeamMember existant pour lier pendulelapin7 (premier membre trouvé)
  const firstMember = await prisma.teamMember.findFirst({ orderBy: { id: 'asc' } });

  for (const [i, ch] of twitchChannels.entries()) {
    await prisma.twitchChannel.upsert({
      where: { username: ch.username },
      update: {},
      create: {
        ...ch,
        teamMemberId: i === 0 && firstMember ? firstMember.id : null,
      },
    });
  }

  console.log('TwitchChannels created:', twitchChannels.length);

  // Create sample CoachingStaff (rattachés à la première team si elle existe)
  const firstTeam = await prisma.team.findFirst({ orderBy: { id: 'asc' } });

  if (firstTeam) {
    const coachingStaffSeed = [
      {
        name: 'DVG Head Coach',
        realName: null,
        role: 'Head Coach',
        position: 0,
        slug: 'dvg-head-coach',
      },
      {
        name: 'DVG Drafter',
        realName: null,
        role: 'Drafter',
        position: 1,
        slug: 'dvg-drafter',
      },
      {
        name: 'DVG Manager',
        realName: null,
        role: 'Manager',
        position: 2,
        slug: null,
      },
    ];

    for (const staff of coachingStaffSeed) {
      const existing = staff.slug
        ? await prisma.coachingStaff.findUnique({ where: { slug: staff.slug } })
        : await prisma.coachingStaff.findFirst({
            where: { name: staff.name, teamId: firstTeam.id },
          });

      if (!existing) {
        await prisma.coachingStaff.create({
          data: { ...staff, teamId: firstTeam.id },
        });
      }
    }

    console.log('CoachingStaff created:', coachingStaffSeed.length);
  } else {
    console.log('No team found — CoachingStaff seed skipped');
  }
}
