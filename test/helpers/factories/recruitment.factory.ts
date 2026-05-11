/**
 * Factory pour le modèle RecruitmentPost (Prisma).
 * Génère des objets cohérents pour les tests unitaires.
 */

export interface RecruitmentPostRecord {
  id: number;
  title: string;
  type: string;
  description: string;
  image: string | null;
  active: boolean;
  position: number;
  slug: string | null;
  location: string | null;
  duration: string | null;
  missions: string | null;
  skills: string | null;
  requirements: string | null;
  benefits: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let recruitmentIdCounter = 1;

/**
 * Crée un objet RecruitmentPostRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createRecruitmentPostRecord(
  overrides: Partial<RecruitmentPostRecord> = {},
): RecruitmentPostRecord {
  const id = overrides.id ?? recruitmentIdCounter++;
  return {
    id,
    title: `Offre de recrutement ${id}`,
    type: 'Joueur',
    description: `Description du poste ${id}`,
    image: null,
    active: true,
    position: 0,
    slug: `offre-${id}`,
    location: null,
    duration: null,
    missions: null,
    skills: null,
    requirements: null,
    benefits: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** Réinitialise le compteur d'ID. */
export function resetRecruitmentIdCounter(): void {
  recruitmentIdCounter = 1;
}
