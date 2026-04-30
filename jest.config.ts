import type { Config } from 'jest';

/**
 * Configuration Jest pour le backend NestJS - Team Divergentes
 *
 * Seuils de couverture calés sur baseline actuelle + 0.5pt :
 * Baseline mesurée le 2026-04-28 (après exclusion DTOs/modules/main.ts) :
 *   statements: 52.72%, branches: 44.72%, functions: 45.2%, lines: 52.44%
 *
 * TODO(EPIC-19): Monter les seuils progressivement vers lines:80, branches:70,
 *   functions:80, statements:80 au fil des US de couverture.
 */
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    // Exclusions alignées avec sonar.coverage.exclusions dans sonar-project.properties
    '!**/main.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/prisma/migrations/**',
    '!**/prisma/seed.ts',
    '!**/app.module.ts',
    '!**/app.controller.ts',
    '!**/app.service.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      // TODO(EPIC-19): Monter progressivement vers statements:80, branches:70,
      //   functions:80, lines:80 une fois les tests de couverture complétés.
      statements: 52.5,
      branches: 44.5,
      functions: 45,
      lines: 52,
    },
  },
};

export default config;
