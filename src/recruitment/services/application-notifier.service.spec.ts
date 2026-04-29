import {
  escapeHtml,
  buildEmailHtml,
  buildEmailText,
  buildDiscordEmbed,
  buildDiscordAttachments,
} from './application-notifier.service';
import { ApplyRecruitmentDto } from '../dto/apply-recruitment.dto';

const mockDto: ApplyRecruitmentDto = {
  name: 'Jean Dupont',
  email: 'jean@example.com',
  message: 'Candidature motivée.',
  postTitle: 'Coach esport',
  postType: 'CDI',
};

const mockFile: Express.Multer.File = {
  fieldname: 'cv',
  originalname: 'cv-jean.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  size: 512,
  buffer: Buffer.from('pdf'),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
};

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe('escapeHtml', () => {
  it('échappe les entités HTML de base', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('retourne la chaîne inchangée si aucun caractère spécial', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

// ---------------------------------------------------------------------------
// buildEmailHtml
// ---------------------------------------------------------------------------
describe('buildEmailHtml', () => {
  it('contient le titre du poste et le nom du candidat', () => {
    const html = buildEmailHtml(mockDto);
    expect(html).toContain(mockDto.postTitle);
    expect(html).toContain(mockDto.name);
    expect(html).toContain(mockDto.email);
    expect(html).toContain(mockDto.postType);
  });

  it('affiche le CV joint quand le fichier est fourni', () => {
    const html = buildEmailHtml(mockDto, mockFile);
    expect(html).toContain('cv-badge cv-yes');
    expect(html).toContain(mockFile.originalname);
  });

  it('affiche "Non fourni" quand pas de CV', () => {
    const html = buildEmailHtml(mockDto);
    expect(html).toContain('cv-badge cv-no');
    expect(html).toContain('Non fourni');
  });

  it('affiche la lettre de motivation jointe', () => {
    const html = buildEmailHtml(mockDto, undefined, mockFile);
    expect(html).toContain(mockFile.originalname);
  });

  it('affiche le message si présent', () => {
    const html = buildEmailHtml(mockDto);
    expect(html).toContain(mockDto.message!.replace(/\n/g, '<br>'));
  });

  it("n'affiche pas de section message si absent", () => {
    const dtoNoMsg = { ...mockDto, message: undefined };
    const html = buildEmailHtml(dtoNoMsg);
    expect(html).not.toContain('Pourquoi moi');
  });

  it('échappe le HTML dans les champs utilisateur', () => {
    const maliciousDto = { ...mockDto, name: '<script>alert(1)</script>' };
    const html = buildEmailHtml(maliciousDto);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// buildEmailText
// ---------------------------------------------------------------------------
describe('buildEmailText', () => {
  it('contient les informations clés du candidat', () => {
    const text = buildEmailText(mockDto, mockFile);
    expect(text).toContain('Nouvelle candidature DVG');
    expect(text).toContain(`Poste: ${mockDto.postTitle}`);
    expect(text).toContain(`Type de contrat: ${mockDto.postType}`);
    expect(text).toContain(`Nom: ${mockDto.name}`);
    expect(text).toContain(`Email: ${mockDto.email}`);
    expect(text).toContain(`Fichier joint : ${mockFile.originalname}`);
  });

  it('affiche "Non fourni" quand pas de CV', () => {
    const text = buildEmailText(mockDto);
    expect(text).toContain('CV: Non fourni');
  });

  it('affiche la lettre de motivation fournie', () => {
    const text = buildEmailText(mockDto, undefined, mockFile);
    expect(text).toContain(`Fichier joint : ${mockFile.originalname}`);
  });

  it("n'affiche pas le champ message si absent", () => {
    const dtoNoMsg = { ...mockDto, message: undefined };
    const text = buildEmailText(dtoNoMsg);
    expect(text).not.toContain('Message:');
  });
});

// ---------------------------------------------------------------------------
// buildDiscordEmbed
// ---------------------------------------------------------------------------
describe('buildDiscordEmbed', () => {
  it('contient les informations du candidat', () => {
    const docs = ['📄 **CV** — `cv.pdf`'];
    const embed = buildDiscordEmbed(mockDto, docs);

    expect(embed.title).toBe(mockDto.postTitle);
    expect(embed.color).toBe(0x32d299);
    expect(embed.description).toContain(mockDto.postType);

    const fields = embed.fields as { name: string; value: string }[];
    const candidatField = fields.find((f) => f.name === '👤 Candidat');
    expect(candidatField?.value).toContain(mockDto.name);
  });

  it('inclut le champ message si présent', () => {
    const embed = buildDiscordEmbed(mockDto, []);
    const fields = embed.fields as { name: string }[];
    expect(fields.some((f) => f.name === '💬 Pourquoi moi ?')).toBe(true);
  });

  it("n'inclut pas le champ message si absent", () => {
    const dtoNoMsg = { ...mockDto, message: undefined };
    const embed = buildDiscordEmbed(dtoNoMsg, []);
    const fields = embed.fields as { name: string }[];
    expect(fields.some((f) => f.name === '💬 Pourquoi moi ?')).toBe(false);
  });

  it('tronque les messages longs à 1000 caractères', () => {
    const longMsg = 'x'.repeat(1100);
    const embed = buildDiscordEmbed({ ...mockDto, message: longMsg }, []);
    const fields = embed.fields as { name: string; value: string }[];
    const msgField = fields.find((f) => f.name === '💬 Pourquoi moi ?');
    expect(msgField?.value).toContain('...');
    expect(msgField!.value.length).toBeLessThanOrEqual(1010);
  });
});

// ---------------------------------------------------------------------------
// buildDiscordAttachments
// ---------------------------------------------------------------------------
describe('buildDiscordAttachments', () => {
  it('retourne tableaux vides sans fichiers', () => {
    const result = buildDiscordAttachments(mockDto);
    expect(result.attachments).toHaveLength(0);
    expect(result.filesToUpload).toHaveLength(0);
  });

  it('ajoute le CV comme pièce jointe', () => {
    const result = buildDiscordAttachments(mockDto, mockFile);
    expect(result.attachments).toHaveLength(1);
    expect(result.filesToUpload).toHaveLength(1);
    expect(result.attachments[0].filename).toBe(mockFile.originalname);
    expect(result.attachments[0].description).toContain(mockDto.name);
  });

  it('ajoute le CV et la lettre de motivation', () => {
    const result = buildDiscordAttachments(mockDto, mockFile, mockFile);
    expect(result.attachments).toHaveLength(2);
    expect(result.filesToUpload).toHaveLength(2);
    expect(result.attachments[0].id).toBe(0);
    expect(result.attachments[1].id).toBe(1);
  });

  it('ajoute uniquement la lettre de motivation', () => {
    const result = buildDiscordAttachments(mockDto, undefined, mockFile);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].description).toContain('Lettre de motivation');
  });
});
