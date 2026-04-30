/**
 * Factory pour les modèles Sponsor, SponsorImage et SponsorLink (Prisma).
 * Génère des objets cohérents pour les tests unitaires.
 */

/** Enum ImageLayout aligné avec le schéma Prisma. */
export type ImageLayout = 'LAYOUT_1' | 'LAYOUT_2' | 'LAYOUT_3';

/** Enum LinkType aligné avec le schéma Prisma. */
export type LinkType = 'WEBSITE' | 'TWITTER' | 'INSTAGRAM' | 'DISCORD' | 'PROMO_CODE' | 'OTHER';

export interface SponsorRecord {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  active: boolean;
  startDate: Date | null;
  endDate: Date | null;
  imageLayout: ImageLayout;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorImageRecord {
  id: number;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  position: number;
  sponsorId: number;
  createdAt: Date;
}

export interface SponsorLinkRecord {
  id: number;
  url: string;
  label: string;
  type: LinkType;
  isPrimary: boolean;
  sponsorId: number;
  createdAt: Date;
}

let sponsorIdCounter = 1;
let sponsorImageIdCounter = 1;
let sponsorLinkIdCounter = 1;

/**
 * Crée un objet SponsorRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createSponsorRecord(overrides: Partial<SponsorRecord> = {}): SponsorRecord {
  const id = overrides.id ?? sponsorIdCounter++;
  return {
    id,
    name: `Sponsor ${id}`,
    slug: `sponsor-${id}`,
    description: null,
    position: 0,
    active: true,
    startDate: null,
    endDate: null,
    imageLayout: 'LAYOUT_1',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Crée un objet SponsorImageRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createSponsorImageRecord(
  overrides: Partial<SponsorImageRecord> = {},
): SponsorImageRecord {
  const id = overrides.id ?? sponsorImageIdCounter++;
  return {
    id,
    url: `/uploads/sponsor-image-${id}.webp`,
    alt: null,
    isPrimary: false,
    position: 0,
    sponsorId: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Crée un objet SponsorLinkRecord avec des valeurs par défaut.
 * @param overrides Propriétés à surcharger.
 */
export function createSponsorLinkRecord(
  overrides: Partial<SponsorLinkRecord> = {},
): SponsorLinkRecord {
  const id = overrides.id ?? sponsorLinkIdCounter++;
  return {
    id,
    url: `https://sponsor-${id}.example.com`,
    label: `Lien ${id}`,
    type: 'WEBSITE',
    isPrimary: false,
    sponsorId: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** Réinitialise les compteurs d'ID. */
export function resetSponsorIdCounters(): void {
  sponsorIdCounter = 1;
  sponsorImageIdCounter = 1;
  sponsorLinkIdCounter = 1;
}
