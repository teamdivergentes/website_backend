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
  ];

  const cmPermissions = [
    'annonces:read',
    'annonces:write',
    'annonces:delete',
    'articles:read',
    'articles:write',
    'articles:delete',
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
    'articles:write',
    'articles:delete',
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
      name: 'Ianis',
      role: 'Directeur General',
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

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
