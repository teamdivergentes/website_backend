import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create roles
  const adminPermissions = [
    'users:read',
    'users:write',
    'users:delete',
    'roles:read',
    'roles:write',
    'roles:delete',
    'teams:read',
    'teams:write',
    'teams:delete',
    'games:read',
    'games:write',
    'games:delete',
    'sponsors:read',
    'sponsors:write',
    'sponsors:delete',
    'staff:read',
    'staff:write',
    'staff:delete',
    'config:read',
    'config:write',
    'annonces:read',
    'annonces:write',
    'annonces:delete',
    'articles:read',
    'articles:write',
    'articles:delete',
    'recrutement:read',
    'recrutement:write',
    'recrutement:delete',
    'analytics:read',
    'twitch_channels:read',
    'twitch_channels:write',
    'twitch_channels:delete',
    'coaching_staff:read',
    'coaching_staff:write',
    'coaching_staff:delete',
    'trophies:read',
    'trophies:write',
    'trophies:delete',
    'matches:read',
    'matches:write',
    'matches:delete',
    // Boutique. Les migrations 20260722120000 et 20260728120000 ajoutent ces
    // permissions au role Admin existant, mais sur une base neuve elles
    // s'appliquent AVANT que le seed ne cree le role : le seed ecrasait ensuite
    // le tableau et l'admin se retrouvait sans acces aux ecrans boutique.
    'commandes:read',
    'commandes:write',
    'boutique:read',
    'boutique:write',
    // Achat au prix coutant. La migration 20260803120000 l'ajoute au role Admin
    // existant ; ici c'est le cas d'une base neuve, ou la migration s'applique
    // avant que le seed ne cree le role.
    'boutique:retail',
  ];

  const cmPermissions = [
    'annonces:read',
    'annonces:write',
    'annonces:delete',
    'articles:read',
    'articles:write',
    'trophies:read',
    'trophies:write',
    'trophies:delete',
    'matches:read',
    'matches:write',
    'matches:delete',
  ];

  // Rôle Gestionnaire : gère l'organisation (équipes, jeux, sponsors, staff, recrutement,
  // twitch, coaching) mais N'A PAS accès à l'éditorial matchs/palmarès.
  // Exclusion volontaire de `matches:*` et `trophies:*` (réservés à Admin et CM).
  // Ne PAS élargir ces permissions sans validation explicite du Product Owner.
  const gestionnairePermissions = [
    'teams:read',
    'teams:write',
    'teams:delete',
    'games:read',
    'games:write',
    'games:delete',
    'sponsors:read',
    'sponsors:write',
    'sponsors:delete',
    'staff:read',
    'staff:write',
    'staff:delete',
    'annonces:read',
    'annonces:write',
    'annonces:delete',
    'articles:read',
    'recrutement:read',
    'recrutement:write',
    'recrutement:delete',
    'twitch_channels:read',
    'twitch_channels:write',
    'twitch_channels:delete',
    'coaching_staff:read',
    'coaching_staff:write',
    'coaching_staff:delete',
  ];

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions: adminPermissions, isSystem: true },
    create: {
      name: 'Admin',
      permissions: adminPermissions,
      isSystem: true,
    },
  });

  console.log('Admin role created:', adminRole);

  const cmRole = await prisma.role.upsert({
    where: { name: 'CM' },
    update: { permissions: cmPermissions, isSystem: true },
    create: {
      name: 'CM',
      permissions: cmPermissions,
      isSystem: true,
    },
  });

  console.log('CM role created:', cmRole);

  const gestionnaireRole = await prisma.role.upsert({
    where: { name: 'Gestionnaire' },
    update: { permissions: gestionnairePermissions, isSystem: true },
    create: {
      name: 'Gestionnaire',
      permissions: gestionnairePermissions,
      isSystem: true,
    },
  });

  console.log('Gestionnaire role created:', gestionnaireRole);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@teamdivergentes.fr' },
    update: {},
    create: {
      email: 'admin@teamdivergentes.fr',
      password: hashedPassword,
      roleId: adminRole.id,
      actif: true,
    },
  });

  console.log('Admin user created:', { email: adminUser.email });

  // Create initial config entries
  const configs = [
    {
      key: 'youtube_link',
      value: 'https://www.youtube.com/embed/IqoIktEIeU0',
      description: 'Lien de la video YouTube de presentation',
    },
    {
      key: 'site_name',
      value: 'TeamDivergentes - Structure Esportive Francaise',
      description: 'Nom du site',
    },
    {
      key: 'contact_email',
      value: 'contact@teamdivergentes.fr',
      description: 'Email de contact',
    },
    {
      key: 'contact_phone',
      value: '',
      description:
        'Numéro de téléphone de contact (optionnel, affiché sur la page contact si renseigné)',
    },
    {
      key: 'twitter_url',
      value: 'https://x.com/teamdivergentes',
      description: 'Lien Twitter/X',
    },
    {
      key: 'instagram_url',
      value: 'https://www.instagram.com/teamdivergentes/',
      description: 'Lien Instagram',
    },
    {
      key: 'discord_url',
      value: 'https://discord.com/invite/mF67YZKnU3',
      description: 'Lien Discord',
    },
    {
      key: 'youtube_url',
      value: 'https://www.youtube.com/channel/UC5laAdDfyTTUSdK0t2wYx2g',
      description: 'Lien YouTube (chaine, affiche dans le footer)',
    },
    {
      key: 'twitch_url',
      value: 'https://www.twitch.tv/teamdivergentes',
      description: 'Lien Twitch',
    },
    {
      key: 'tiktok_url',
      value: 'http://tiktok.com/@teamdivergentes',
      description: 'Lien TikTok',
    },
    {
      key: 'mail_url',
      value: 'mailto:contact@teamdivergentes.fr',
      description: 'Lien email (affiche dans le footer)',
    },
    {
      key: 'social_urls',
      value:
        'https://www.youtube.com/channel/UC5laAdDfyTTUSdK0t2wYx2g\nhttps://www.twitch.tv/teamdivergentes\nhttps://www.facebook.com/teamdivergentes/\nhttps://www.linkedin.com/company/team-divergentes/\nhttps://www.helloasso.com/associations/team-divergentes',
      description:
        'Liens supplementaires pour le referencement SEO (un lien par ligne, les liens Twitter/Instagram/Discord/TikTok sont deja inclus)',
    },
    {
      key: 'og_title',
      value: 'Team Divergentes | Organisation Esportive',
      description: 'Titre Open Graph pour les aperçus Discord/réseaux sociaux',
    },
    {
      key: 'og_description',
      value:
        "Team Divergentes, organisation e-sportive créée en 2017. Découvrez nos joueurs, nos équipes et rejoignez l'aventure !",
      description: 'Description Open Graph pour les aperçus Discord/réseaux sociaux',
    },
    {
      key: 'og_image',
      value: '',
      description:
        'Image Open Graph pour les aperçus Discord/réseaux sociaux (URL absolue ou chemin /uploads/...)',
    },
    // Pages visibility
    {
      key: 'page_shop_visible',
      value: 'true',
      description: 'Afficher la page Boutique',
    },
    {
      key: 'page_contact_visible',
      value: 'true',
      description: 'Afficher la page Contact',
    },
    {
      key: 'page_equipes_visible',
      value: 'true',
      description: 'Afficher la page Équipes/Ambassadeurs',
    },
    {
      key: 'page_sponsors_visible',
      value: 'true',
      description: 'Afficher la page Sponsors',
    },
    {
      key: 'page_recrutement_visible',
      value: 'true',
      description: 'Afficher la page Recrutement',
    },
    {
      key: 'page_articles_visible',
      value: 'true',
      description: 'Afficher la page Articles/Annonces',
    },
    {
      key: 'page_twitch_visible',
      value: 'true',
      description: 'Afficher la page En Live (Twitch)',
    },
    {
      key: 'page_palmares_visible',
      value: 'false',
      description: 'Afficher la page Palmarès',
    },
  ];

  for (const config of configs) {
    await prisma.config.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('Config entries created:', configs.length);

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

  // Create initial games
  const games = [
    { key: 'lol', name: 'League of Legends', position: 0, active: true },
    { key: 'valorant', name: 'Valorant', position: 1, active: true },
    { key: 'rl', name: 'Rocket League', position: 2, active: true },
    { key: 'cs', name: 'Counter-Strike', position: 3, active: true },
    { key: 'tft', name: 'Teamfight Tactics', position: 4, active: true },
  ];

  for (const game of games) {
    await prisma.game.upsert({
      where: { key: game.key },
      update: {},
      create: game,
    });
  }

  console.log('Games created:', games.length);

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
      update: { name: t.name, game: t.game },
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

  // Seed article types (categories)
  const articleTypeNames = ['Actualité', 'Annonce', 'Match Report', 'eSport', 'Interview'];

  for (const name of articleTypeNames) {
    await prisma.articleType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('✓ Catégories d\'articles seedées:', articleTypeNames.length);

  // ---------------------------------------------------------------------------
  // Boutique — collection 2026
  // Spec : docs/superpowers/specs/2026-07-28-boutique-collection-2026-design.md
  // ---------------------------------------------------------------------------

  await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: {},
    // shopEnabled reste faux : la boutique ne s'ouvre qu'une fois les cles
    // Stripe de production en place et les prix reels saisis depuis l'admin.
    // Tarifs de la grille 2026 : port standard 5 €, rapide 10 €, offert des
    // 120 € de panier, ce qui correspond a trois maillots.
    create: {
      id: 1,
      shippingStandardCents: 500,
      shippingExpressCents: 1000,
      freeShippingThresholdCents: 12000,
      currency: 'eur',
      shopEnabled: false,
    },
  });

  const TEXTILE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

  // Les prix sont provisoires : ils sont editables depuis l'admin sans
  // redeploiement, le seed ne fait qu'amorcer le catalogue.
  const shopProductsSeed = [
    {
      slug: 'maillot-2026-dvg',
      name: 'Maillot 2026 — Team Divergentes',
      shortDescription: 'Le maillot officiel de la structure, saison 2026.',
      description:
        'Le maillot de toute la structure, sans distinction de section ni de jeu. ' +
        'Il reprend les codes posés en 2017 : noir profond, vert Divergentes, logo ' +
        "sublimé dans la maille plutôt qu'imprimé dessus. Celui qu'on met quand on " +
        'vient représenter DVG en entier.',
      priceCents: 4000,
      images: [
        { url: 'assets/img/shop/maillot-2026-dvg-front.webp', label: 'face' },
        // Dos SANS flocage : c'est le fond sur lequel composer l'apercu du
        // pseudo, d'ou `isBack`. La variante `-back-name` montre un exemple
        // floque et ne doit surtout pas servir de fond a l'apercu.
        { url: 'assets/img/shop/maillot-2026-dvg-back.webp', label: 'dos', isBack: true },
        {
          url: 'assets/img/shop/maillot-2026-dvg-back-name.webp',
          label: 'dos floqué',
        },
      ],
      teamSlug: null,
      active: false,
      position: 0,
    },
    {
      slug: 'maillot-2026-joker',
      name: 'Maillot 2026 — DVG × Joker',
      shortDescription: "Aux couleurs de l'équipe EVA Joker.",
      description:
        "La déclinaison d'EVA Joker. Même patron, même maille, même finition que le " +
        "maillot de structure : seuls les liserés, l'habillage des manches et le blason " +
        'de la section changent. Le vert monte sur les épaules, le motif reprend ' +
        "l'univers de l'équipe.",
      priceCents: 4000,
      images: [
        { url: 'assets/img/shop/maillot-2026-joker-front.webp', label: 'face' },
        { url: 'assets/img/shop/maillot-2026-joker-back.webp', label: 'dos', isBack: true },
        {
          url: 'assets/img/shop/maillot-2026-joker-back-name.webp',
          label: 'dos floqué',
        },
      ],
      teamSlug: 'eva-joker',
      active: true,
      position: 1,
    },
    {
      slug: 'maillot-2026-mystic',
      name: 'Maillot 2026 — DVG × Mystic',
      shortDescription: "Aux couleurs de l'équipe EVA Mystic.",
      description:
        "La déclinaison d'EVA Mystic. Les deux titres de champion de France, 2022 et " +
        "2023, sont inscrits sur le vêtement : ce n'est pas un ornement, c'est ce que la " +
        "section est allée chercher. Un maillot d'esport ne sert pas à courir, il sert à " +
        'dire de quel côté on est assis.',
      priceCents: 4000,
      images: [
        { url: 'assets/img/shop/maillot-2026-mystic-front.webp', label: 'face' },
        { url: 'assets/img/shop/maillot-2026-mystic-back.webp', label: 'dos', isBack: true },
        {
          url: 'assets/img/shop/maillot-2026-mystic-back-name.webp',
          label: 'dos floqué',
        },
        // Seule Mystic a ete shootee portee. La vue portee fait la vignette :
        // un maillot sur des epaules se lit mieux qu'un maillot a plat.
        {
          url: 'assets/img/shop/maillot-2026-mystic-porte-face.jpg',
          label: 'porté',
          isCard: true,
        },
        { url: 'assets/img/shop/maillot-2026-mystic-porte-dos.jpg', label: 'porté dos' },
      ],
      teamSlug: 'eva-mystic',
      active: false,
      position: 2,
    },
  ];

  for (const p of shopProductsSeed) {
    // Les equipes EVA n'existent qu'en production : en local le lien reste nul
    // plutot que de faire echouer le seed.
    const team = p.teamSlug ? await prisma.team.findUnique({ where: { slug: p.teamSlug } }) : null;

    const product = await prisma.shopProduct.upsert({
      where: { slug: p.slug },
      // Pas de mise a jour du prix ni de l'activation : ils sont pilotes depuis
      // l'admin, un re-seed ne doit pas ecraser un reglage metier.
      update: { name: p.name, shortDescription: p.shortDescription, description: p.description },
      create: {
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description,
        priceCents: p.priceCents,
        teamId: team?.id ?? null,
        allowFlocking: true,
        flockingFeeCents: 500,
        active: p.active,
        position: p.position,
      },
    });

    // Les visuels sont repris a chaque seed : ils vivent dans le depot, pas dans
    // l'admin, et un renommage de fichier doit se propager. La galerie editee
    // depuis l'admin n'est ecrasee que si elle porte encore les visuels du seed.
    const existingImages = await prisma.shopProductImage.count({ where: { productId: product.id } });
    if (existingImages === 0) {
      await prisma.shopProductImage.createMany({
        data: p.images.map((image, index) => ({
          productId: product.id,
          url: image.url,
          label: image.label,
          position: index,
          isBack: 'isBack' in image ? Boolean(image.isBack) : false,
          isCard: 'isCard' in image ? Boolean(image.isCard) : index === 0,
        })),
      });
    }

    for (const [index, label] of TEXTILE_SIZES.entries()) {
      await prisma.shopProductSize.upsert({
        where: { productId_label: { productId: product.id, label } },
        update: { position: index },
        create: { productId: product.id, label, position: index },
      });
    }
  }

  console.log('✓ Boutique seedée:', shopProductsSeed.length, 'maillots');

  console.log('Seed completed successfully!');
}

main()
  .catch((e: unknown) => {
    console.error('Error during seed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
