import { generateTeamSlug, generateMemberSlug, extractFilenameFromUrl } from './team-slug.util';

// ---------------------------------------------------------------------------
// generateTeamSlug
// ---------------------------------------------------------------------------
describe('generateTeamSlug', () => {
  it('convertit le nom en minuscules', () => {
    expect(generateTeamSlug('VALORANT')).toBe('valorant');
  });

  it('remplace les espaces par des tirets', () => {
    expect(generateTeamSlug('Team Divergentes')).toBe('team-divergentes');
  });

  it('supprime les accents', () => {
    expect(generateTeamSlug('Équipe Élite')).toBe('equipe-elite');
  });

  it('supprime les caractères spéciaux', () => {
    expect(generateTeamSlug('Team @DVG!')).toBe('team-dvg');
  });

  it('supprime les tirets consécutifs', () => {
    expect(generateTeamSlug('Team  DVG')).toBe('team-dvg');
  });

  it('supprime les espaces en début et fin', () => {
    expect(generateTeamSlug('  dvg  ')).toBe('dvg');
  });

  it('gère une chaîne simple sans transformation', () => {
    expect(generateTeamSlug('lol')).toBe('lol');
  });

  it('gère les chiffres', () => {
    expect(generateTeamSlug('Team 2024')).toBe('team-2024');
  });
});

// ---------------------------------------------------------------------------
// generateMemberSlug
// ---------------------------------------------------------------------------
describe('generateMemberSlug', () => {
  it('convertit le nom en minuscules', () => {
    expect(generateMemberSlug('ZED')).toBe('zed');
  });

  it('remplace les caractères non-alphanumériques par des tirets', () => {
    expect(generateMemberSlug('Jean-Paul')).toBe('jean-paul');
  });

  it('supprime les tirets en début et fin', () => {
    expect(generateMemberSlug('-player-')).toBe('player');
  });

  it('supprime les accents', () => {
    expect(generateMemberSlug('Héros')).toBe('heros');
  });

  it('gère les espaces comme séparateurs', () => {
    expect(generateMemberSlug('Jean Dupont')).toBe('jean-dupont');
  });

  it('gère une chaîne simple', () => {
    expect(generateMemberSlug('player1')).toBe('player1');
  });
});

// ---------------------------------------------------------------------------
// extractFilenameFromUrl
// ---------------------------------------------------------------------------
describe('extractFilenameFromUrl', () => {
  it("extrait le nom de fichier d'une URL d'upload", () => {
    expect(extractFilenameFromUrl('/uploads/abc123.jpg')).toBe('abc123.jpg');
  });

  it("extrait le nom de fichier d'une URL complète", () => {
    expect(extractFilenameFromUrl('https://example.com/path/to/image.png')).toBe('image.png');
  });

  it('retourne null pour une URL null', () => {
    expect(extractFilenameFromUrl(null)).toBeNull();
  });

  it('retourne null pour une chaîne vide', () => {
    expect(extractFilenameFromUrl('')).toBeNull();
  });

  it('gère une URL sans chemin (juste un nom de fichier)', () => {
    expect(extractFilenameFromUrl('image.jpg')).toBe('image.jpg');
  });
});
