import { PrismaClient } from '../generated/prisma';
import { resolveDatasets } from './seeds/datasets';
import { seedBootstrap } from './seeds/bootstrap';
import { seedDemo } from './seeds/demo';

const prisma = new PrismaClient();

/**
 * Point d'entree du seed. Le choix du jeu vit dans `seeds/datasets.ts` ; ce
 * fichier ne fait que l'appliquer.
 *
 * En production : `npm run db:seed:prod` (le seed compile, sans ts-node).
 * Ailleurs : `npx prisma db seed`.
 */
async function main(): Promise<void> {
  const datasets = resolveDatasets(process.env);
  console.log(`Seed — environnement ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`Jeux appliqués : ${datasets.join(', ')}`);

  if (datasets.includes('bootstrap')) {
    await seedBootstrap(prisma);
  }
  if (datasets.includes('demo')) {
    await seedDemo(prisma);
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
