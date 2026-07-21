import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTrophyDto } from './create-trophy.dto';

// Base valide pour n'isoler que la variation testée
const validBase = {
  competition: 'LFL 2025',
  placement: 1,
  date: '2025-09-15T15:00:00.000Z',
};

describe('CreateTrophyDto — validation', () => {
  it('accepte un payload minimal valide', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── competition ──────────────────────────────────────────────────────────

  it('rejette une competition manquante', async () => {
    const dto = plainToInstance(CreateTrophyDto, { placement: 1, date: validBase.date });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'competition')).toBe(true);
  });

  it('rejette une competition de plus de 200 caractères', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, competition: 'a'.repeat(201) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'competition')).toBe(true);
  });

  it('accepte une competition de 200 caractères', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, competition: 'a'.repeat(200) });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── placement (Min/Max) ────────────────────────────────────────────────────

  it('rejette un placement manquant', async () => {
    const dto = plainToInstance(CreateTrophyDto, {
      competition: validBase.competition,
      date: validBase.date,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'placement')).toBe(true);
  });

  it('rejette un placement < 1', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, placement: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'placement')).toBe(true);
  });

  it('rejette un placement > 999', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, placement: 1000 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'placement')).toBe(true);
  });

  it('accepte les bornes placement 1 et 999', async () => {
    const dtoMin = plainToInstance(CreateTrophyDto, { ...validBase, placement: 1 });
    const dtoMax = plainToInstance(CreateTrophyDto, { ...validBase, placement: 999 });
    expect(await validate(dtoMin)).toHaveLength(0);
    expect(await validate(dtoMax)).toHaveLength(0);
  });

  it('rejette un placement non entier', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, placement: 1.5 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'placement')).toBe(true);
  });

  // ─── date ─────────────────────────────────────────────────────────────────

  it('rejette une date invalide', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, date: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'date')).toBe(true);
  });

  it('rejette une date manquante', async () => {
    const dto = plainToInstance(CreateTrophyDto, {
      competition: validBase.competition,
      placement: 1,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'date')).toBe(true);
  });

  // ─── image (regex + MaxLength) ──────────────────────────────────────────────

  it('rejette une image qui ne commence pas par /uploads/ ou http(s)://', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, image: 'ftp://bad.example' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'image')).toBe(true);
  });

  it('accepte une image commençant par /uploads/', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, image: '/uploads/trophy.webp' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepte une image en URL https://', async () => {
    const dto = plainToInstance(CreateTrophyDto, {
      ...validBase,
      image: 'https://cdn.example.com/trophy.png',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejette une image de plus de 500 caractères', async () => {
    const longImage = `/uploads/${'a'.repeat(500)}.webp`;
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, image: longImage });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'image')).toBe(true);
  });

  // ─── description / teamLabel (MaxLength) ────────────────────────────────────

  it('rejette une description de plus de 500 caractères', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, description: 'a'.repeat(501) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });

  it('rejette un teamLabel de plus de 100 caractères', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, teamLabel: 'a'.repeat(101) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'teamLabel')).toBe(true);
  });

  // ─── teamId ─────────────────────────────────────────────────────────────────

  it('rejette un teamId < 1', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, teamId: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'teamId')).toBe(true);
  });

  it('accepte un teamId valide', async () => {
    const dto = plainToInstance(CreateTrophyDto, { ...validBase, teamId: 3 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
