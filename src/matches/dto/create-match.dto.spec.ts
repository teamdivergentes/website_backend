import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMatchDto } from './create-match.dto';

// Base valide pour ne tester que la variation scores
const validBase = {
  teamId: 1,
  opponentName: 'Team Alpha',
  scheduledAt: '2025-09-15T15:00:00.000Z',
};

describe('CreateMatchDto — validation', () => {
  it('accepte un payload sans scores (aucun des deux)', async () => {
    const dto = plainToInstance(CreateMatchDto, { ...validBase });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepte un payload avec les deux scores', async () => {
    const dto = plainToInstance(CreateMatchDto, { ...validBase, scoreDvg: 2, scoreOpponent: 1 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepte scoreDvg seul au niveau DTO (règle métier paire vit dans le service)', async () => {
    // Le DTO laisse passer : la validation pairing est dans le service
    const dto = plainToInstance(CreateMatchDto, { ...validBase, scoreDvg: 2 });
    const errors = await validate(dto);
    // Pas d'erreur DTO — le service lèvera une BadRequestException
    expect(errors).toHaveLength(0);
  });

  it('accepte scoreOpponent seul au niveau DTO (règle métier paire vit dans le service)', async () => {
    const dto = plainToInstance(CreateMatchDto, { ...validBase, scoreOpponent: 1 });
    const errors = await validate(dto);
    // Pas d'erreur DTO — le service lèvera une BadRequestException
    expect(errors).toHaveLength(0);
  });

  it('rejette un opponentName manquant', async () => {
    const dto = plainToInstance(CreateMatchDto, {
      teamId: 1,
      scheduledAt: '2025-09-15T15:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'opponentName')).toBe(true);
  });

  it('rejette un teamId manquant', async () => {
    const dto = plainToInstance(CreateMatchDto, {
      opponentName: 'X',
      scheduledAt: '2025-09-15T15:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'teamId')).toBe(true);
  });

  it('rejette une scheduledAt invalide', async () => {
    const dto = plainToInstance(CreateMatchDto, { ...validBase, scheduledAt: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'scheduledAt')).toBe(true);
  });

  it('rejette un opponentLogo qui ne commence pas par /uploads/ ou http(s)://', async () => {
    const dto = plainToInstance(CreateMatchDto, {
      ...validBase,
      opponentLogo: 'ftp://bad.example',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'opponentLogo')).toBe(true);
  });

  it('accepte un opponentLogo commençant par /uploads/', async () => {
    const dto = plainToInstance(CreateMatchDto, {
      ...validBase,
      opponentLogo: '/uploads/logo-team.webp',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejette un streamUrl sans protocole', async () => {
    const dto = plainToInstance(CreateMatchDto, { ...validBase, streamUrl: 'twitch.tv/dvg' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'streamUrl')).toBe(true);
  });

  it('rejette un score négatif', async () => {
    const dto = plainToInstance(CreateMatchDto, { ...validBase, scoreDvg: -1, scoreOpponent: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'scoreDvg')).toBe(true);
  });
});
