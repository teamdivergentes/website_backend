/**
 * Factory pour le modèle User (Prisma).
 * Génère des objets User cohérents pour les tests unitaires.
 */

/** Représentation minimale d'un User renvoyé par Prisma (sans relation). */
export interface UserRecord {
  id: number;
  email: string;
  password: string;
  roleId: number;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** User avec sa relation role incluse. */
export interface UserWithRole extends UserRecord {
  role: {
    id: number;
    name: string;
    permissions: string[];
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

let userIdCounter = 1;

/**
 * Crée un objet UserRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  const id = overrides.id ?? userIdCounter++;
  return {
    id,
    email: `user-${id}@teamdivergentes.fr`,
    password: 'hashedpassword_bcrypt',
    roleId: 1,
    actif: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Crée un objet UserWithRole (inclut la relation role).
 * @param overrides Propriétés à surcharger (UserRecord + role).
 */
export function createUserWithRole(
  overrides: Partial<UserWithRole> = {},
): UserWithRole {
  const base = createUserRecord(overrides);
  return {
    ...base,
    role: overrides.role ?? {
      id: 1,
      name: 'Admin',
      permissions: ['users:read', 'users:write', 'roles:read'],
      isSystem: true,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    },
  };
}

/** Réinitialise le compteur d'ID (utile dans beforeEach si nécessaire). */
export function resetUserIdCounter(): void {
  userIdCounter = 1;
}
