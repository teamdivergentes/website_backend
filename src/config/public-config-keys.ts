/**
 * Allow-list des clés de configuration accessibles publiquement via GET /api/config.
 *
 * Principe fail-safe : toute clé absente de cet ensemble est considérée privée.
 * Ne jamais inclure : contact_smtp_*, *webhook*, ni aucun secret serveur.
 */
export const PUBLIC_CONFIG_KEYS: ReadonlySet<string> = new Set<string>([
  'site_name',
  'og_title',
  'og_description',
  'og_image',
  'youtube_link',
  'youtube_url',
  'twitch_url',
  'twitter_url',
  'instagram_url',
  'discord_url',
  'mail_url',
  'social_urls',
  'contact_email',
  'contact_phone',
]);

/**
 * Retourne true si la clé est publique selon l'allow-list.
 * Les clés correspondant au pattern `page_*_visible` sont également publiques.
 */
export function isPublicConfigKey(key: string): boolean {
  if (PUBLIC_CONFIG_KEYS.has(key)) {
    return true;
  }
  // Pattern page_*_visible : visibilité des pages publiques
  if (/^page_[a-z0-9_]+_visible$/.test(key)) {
    return true;
  }
  return false;
}
