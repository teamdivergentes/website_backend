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
  ];

  const cmPermissions = [
    'annonces:read',
    'annonces:write',
    'annonces:delete',
    'articles:read',
    'articles:write',
  ];

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
      key: 'mail_url',
      value: 'mailto:contact@teamdivergentes.fr',
      description: 'Lien email (affiche dans le footer)',
    },
    {
      key: 'social_urls',
      value:
        'https://www.youtube.com/channel/UC5laAdDfyTTUSdK0t2wYx2g\nhttps://www.twitch.tv/teamdivergentes\nhttps://www.facebook.com/teamdivergentes/\nhttps://www.linkedin.com/company/team-divergentes/\nhttps://www.helloasso.com/associations/team-divergentes',
      description:
        'Liens supplementaires pour le referencement SEO (un lien par ligne, les liens Twitter/Instagram/Discord sont deja inclus)',
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
      description: 'Afficher la page Articles',
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
      username: 'scyphoz',
      displayName: 'Scyphoz',
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

  // Chercher un TeamMember existant pour lier scyphoz (premier membre trouvé)
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
