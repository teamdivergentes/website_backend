import { PrismaClient } from '../generated/prisma';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

/**
 * Script to cleanup orphan images from filesystem
 * Usage: 
 *   npx ts-node scripts/cleanup-orphan-images.ts           # Dry run
 *   npx ts-node scripts/cleanup-orphan-images.ts --delete  # Delete mode
 */

const prisma = new PrismaClient();
const UPLOADS_DIR = './uploads';

async function getAllImageReferences(): Promise<Set<string>> {
  const references = new Set<string>();

  // Extract filename from URL
  const extractFilename = (url: string | null): string | null => {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  // Staff images
  const staff = await prisma.staffMember.findMany();
  staff.forEach((s) => {
    const filename = extractFilename(s.image);
    if (filename) {
      references.add(filename);
      console.log(`[Staff] ${s.name}: ${filename}`);
    }
  });

  // Team images and banners
  const teams = await prisma.team.findMany();
  teams.forEach((t) => {
    const imageFilename = extractFilename(t.image);
    const bannerFilename = extractFilename(t.banner);
    if (imageFilename) {
      references.add(imageFilename);
      console.log(`[Team] ${t.name} (image): ${imageFilename}`);
    }
    if (bannerFilename) {
      references.add(bannerFilename);
      console.log(`[Team] ${t.name} (banner): ${bannerFilename}`);
    }
  });

  // Team member images
  const teamMembers = await prisma.teamMember.findMany();
  teamMembers.forEach((m) => {
    const filename = extractFilename(m.image);
    if (filename) {
      references.add(filename);
      console.log(`[TeamMember] ${m.name}: ${filename}`);
    }
  });

  // Game images
  const games = await prisma.game.findMany();
  games.forEach((g) => {
    const filename = extractFilename(g.image);
    if (filename) {
      references.add(filename);
      console.log(`[Game] ${g.name}: ${filename}`);
    }
  });

  // Sponsor images
  const sponsorImages = await prisma.sponsorImage.findMany();
  sponsorImages.forEach((si) => {
    const filename = extractFilename(si.url);
    if (filename) {
      references.add(filename);
      console.log(`[SponsorImage] ${filename}`);
    }
  });

  return references;
}

async function cleanupOrphanImages(dryRun: boolean = true): Promise<void> {
  console.log('=== Cleanup Orphan Images Script ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no files will be deleted)' : 'DELETE MODE'}\n`);

  try {
    // Get all image references from database
    console.log('Fetching all image references from database...\n');
    const referencedImages = await getAllImageReferences();
    console.log(`\nTotal referenced images: ${referencedImages.size}\n`);

    // Get all files in uploads directory
    console.log('Scanning uploads directory...\n');
    const files = await readdir(UPLOADS_DIR);
    console.log(`Total files in uploads: ${files.length}\n`);

    // Find orphan files
    const orphanFiles: string[] = [];
    files.forEach((file) => {
      if (!referencedImages.has(file)) {
        orphanFiles.push(file);
      }
    });

    console.log(`\n=== ORPHAN FILES (${orphanFiles.length}) ===\n`);

    if (orphanFiles.length === 0) {
      console.log('No orphan files found. All images are referenced in database.');
      return;
    }

    // Delete orphan files
    let deletedCount = 0;
    for (const file of orphanFiles) {
      const filePath = join(UPLOADS_DIR, file);
      console.log(`${dryRun ? '[DRY RUN]' : '[DELETE]'} ${file}`);

      if (!dryRun) {
        try {
          await unlink(filePath);
          deletedCount++;
        } catch (error) {
          console.error(`  Error deleting ${file}:`, error);
        }
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Referenced images: ${referencedImages.size}`);
    console.log(`Total files: ${files.length}`);
    console.log(`Orphan files: ${orphanFiles.length}`);
    if (!dryRun) {
      console.log(`Successfully deleted: ${deletedCount}`);
      console.log(`Failed to delete: ${orphanFiles.length - deletedCount}`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--delete');

if (!isDryRun) {
  console.log('\n⚠️  WARNING: You are about to DELETE orphan files!\n');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  setTimeout(() => {
    cleanupOrphanImages(false).catch(console.error);
  }, 5000);
} else {
  console.log('Running in DRY RUN mode. Use --delete flag to actually delete files.\n');
  cleanupOrphanImages(true).catch(console.error);
}
