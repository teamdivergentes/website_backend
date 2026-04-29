import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { ModuleMetadata } from '@nestjs/common/interfaces';
import { PrismaService } from '../../src/prisma.service';
import { createPrismaMock, PrismaMock } from './prisma-mock';

/**
 * Options pour `createTestApp`.
 */
export interface TestAppOptions {
  /** Metadata du module NestJS à créer (imports, providers, controllers…). */
  moduleMetadata: ModuleMetadata;
  /**
   * Mock Prisma pré-configuré. Si absent, `createPrismaMock()` est utilisé
   * et retourné dans le résultat pour que les tests puissent l'instrumenter.
   */
  prismaMock?: PrismaMock;
}

/**
 * Résultat retourné par `createTestApp`.
 */
export interface TestAppResult {
  app: INestApplication;
  module: TestingModule;
  prismaMock: PrismaMock;
}

/**
 * Démarre un `INestApplication` NestJS minimal pour les tests d'intégration.
 *
 * - Injecte automatiquement le mock PrismaService
 * - Configure le `ValidationPipe` global identique à la production
 * - N'enregistre ni Helmet ni Throttler (tests unitaires uniquement)
 *
 * Usage :
 * ```typescript
 * let app: INestApplication;
 * let prismaMock: PrismaMock;
 *
 * beforeAll(async () => {
 *   const result = await createTestApp({
 *     moduleMetadata: { imports: [UsersModule] },
 *   });
 *   app = result.app;
 *   prismaMock = result.prismaMock;
 * });
 *
 * afterAll(async () => {
 *   await app.close();
 * });
 * ```
 */
export async function createTestApp(options: TestAppOptions): Promise<TestAppResult> {
  const prismaMock = options.prismaMock ?? createPrismaMock();

  const moduleBuilder = Test.createTestingModule(options.moduleMetadata);

  // Surcharge PrismaService par le mock dans tous les providers
  moduleBuilder.overrideProvider(PrismaService).useValue(prismaMock);

  const module = await moduleBuilder.compile();

  const app = module.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return { app, module, prismaMock };
}
