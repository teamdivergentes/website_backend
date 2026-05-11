/**
 * Génère un slug URL-friendly depuis un nom d'équipe ou de membre.
 * Fonction pure : pas de DI, pas d'effets de bord.
 */
export function generateTeamSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '') // Supprime les accents
    .replaceAll(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
    .trim()
    .replaceAll(/\s+/g, '-') // Remplace les espaces par des tirets
    .replaceAll(/-+/g, '-'); // Supprime les tirets consécutifs
}

/**
 * Génère un slug URL-friendly depuis un nom de membre.
 * Fonction pure : pas de DI, pas d'effets de bord.
 */
export function generateMemberSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '') // Supprime les accents
    .replaceAll(/[^a-z0-9]+/g, '-') // Remplace les non-alphanumériques par des tirets
    .replaceAll(/(^-|-$)/g, ''); // Supprime les tirets en début/fin
}

/**
 * Extrait le nom de fichier depuis un chemin d'URL.
 * Fonction pure : pas de DI, pas d'effets de bord.
 */
export function extractFilenameFromUrl(url: string | null): string | null {
  if (!url) return null;
  const parts = url.split('/');
  return parts.at(-1) || null;
}
