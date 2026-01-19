import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Définition des permissions pour chaque rôle
  const roles = [
    {
      name: 'admin',
      permissions: [
        'users:read', 'users:write', 'users:delete',
        'roles:read', 'roles:write', 'roles:delete',
        'teams:read', 'teams:write', 'teams:delete',
        'sponsors:read', 'sponsors:write', 'sponsors:delete',
        'recrutement:read', 'recrutement:write', 'recrutement:delete',
        'config:read', 'config:write',
      ],
    },
    {
      name: 'modifieur',
      permissions: [
        'teams:read', 'teams:write', 'teams:delete',
        'sponsors:read', 'sponsors:write', 'sponsors:delete',
        'recrutement:read', 'recrutement:write', 'recrutement:delete',
      ],
    },
    {
      name: 'community_manager',
      permissions: [
        'teams:read',
        'sponsors:read',
      ],
    },
  ];

  // Créer les rôles
  for (const roleData of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (!existingRole) {
      await prisma.role.create({
        data: roleData,
      });
      console.log(`Created role: ${roleData.name}`);
    } else {
      console.log(`Role ${roleData.name} already exists`);
    }
  }

  // Créer un utilisateur admin par défaut
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  if (adminRole) {
    const adminEmail = 'admin@divergente.fr';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          roleId: adminRole.id,
          actif: true,
        },
      });
      console.log(`Created admin user: ${adminEmail}`);
    } else {
      console.log(`Admin user ${adminEmail} already exists`);
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
