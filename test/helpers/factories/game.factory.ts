/**
 * Factory pour le modèle Game (Prisma).
 * Génère des objets Game cohérents pour les tests unitaires.
 */

export interface GameRecord {
  id: number;
  key: string;
  name: string;
  image: string | null;
  position: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

let gameIdCounter = 1;

/**
 * Crée un objet GameRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createGameRecord(overrides: Partial<GameRecord> = {}): GameRecord {
  const id = overrides.id ?? gameIdCounter++;
  return {
    id,
    key: `game-${id}`,
    name: `Jeu ${id}`,
    image: `/uploads/game-${id}.webp`,
    position: 0,
    active: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** Réinitialise le compteur d'ID. */
export function resetGameIdCounter(): void {
  gameIdCounter = 1;
}
