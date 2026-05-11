/**
 * Factory pour les modèles Article et ArticleType (Prisma).
 * Génère des objets cohérents pour les tests unitaires.
 */

export interface ArticleTypeRecord {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleRecord {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  tabletImageUrl: string | null;
  published: boolean;
  featured: boolean;
  typeId: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

let articleIdCounter = 1;
let articleTypeIdCounter = 1;

/**
 * Crée un objet ArticleTypeRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createArticleTypeRecord(
  overrides: Partial<ArticleTypeRecord> = {},
): ArticleTypeRecord {
  const id = overrides.id ?? articleTypeIdCounter++;
  return {
    id,
    name: `Type ${id}`,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Crée un objet ArticleRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createArticleRecord(overrides: Partial<ArticleRecord> = {}): ArticleRecord {
  const id = overrides.id ?? articleIdCounter++;
  return {
    id,
    title: `Article ${id}`,
    slug: `article-${id}`,
    content: `Contenu de l'article ${id}`,
    excerpt: null,
    imageUrl: null,
    mobileImageUrl: null,
    tabletImageUrl: null,
    published: false,
    featured: false,
    typeId: 1,
    userId: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** Réinitialise les compteurs d'ID. */
export function resetArticleIdCounters(): void {
  articleIdCounter = 1;
  articleTypeIdCounter = 1;
}
