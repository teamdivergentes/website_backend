/**
 * Factory pour les modèles Team et TeamMember (Prisma).
 * Génère des objets cohérents pour les tests unitaires.
 */

export interface TeamRecord {
  id: number;
  name: string;
  slug: string;
  game: string;
  image: string | null;
  banner: string | null;
  description: string | null;
  active: boolean;
  position: number;
  socials: Record<string, string> | null;
  memberFieldsConfig: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMemberRecord {
  id: number;
  name: string;
  realName: string | null;
  role: string;
  image: string | null;
  teamId: number;
  position: number;
  socials: Record<string, string> | null;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  nationality: string | null;
  birthDate: Date | null;
  biography: string | null;
  customFields: Record<string, unknown> | null;
  slug: string | null;
}

let teamIdCounter = 1;
let memberIdCounter = 1;

/**
 * Crée un objet TeamRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createTeamRecord(overrides: Partial<TeamRecord> = {}): TeamRecord {
  const id = overrides.id ?? teamIdCounter++;
  return {
    id,
    name: `Team ${id}`,
    slug: `team-${id}`,
    game: 'lol',
    image: null,
    banner: null,
    description: null,
    active: true,
    position: 0,
    socials: null,
    memberFieldsConfig: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Crée un objet TeamMemberRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createTeamMemberRecord(
  overrides: Partial<TeamMemberRecord> = {},
): TeamMemberRecord {
  const id = overrides.id ?? memberIdCounter++;
  return {
    id,
    name: `Joueur ${id}`,
    realName: null,
    role: 'Top',
    image: null,
    teamId: 1,
    position: 0,
    socials: null,
    joinedAt: new Date('2025-01-01T00:00:00.000Z'),
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    nationality: null,
    birthDate: null,
    biography: null,
    customFields: null,
    slug: null,
    ...overrides,
  };
}

/** Réinitialise les compteurs d'ID. */
export function resetTeamIdCounters(): void {
  teamIdCounter = 1;
  memberIdCounter = 1;
}
