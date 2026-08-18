import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCoachingStaffDto } from './create-coaching-staff.dto';

describe('CreateCoachingStaffDto — validation', () => {
  const validPayload = {
    name: 'Jean Coach',
    role: 'Head Coach',
  };

  async function validateDto(data: object) {
    const dto = plainToInstance(CreateCoachingStaffDto, data);
    return validate(dto);
  }

  it('accepte un payload valide minimal', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('accepte un payload complet valide', async () => {
    const errors = await validateDto({
      ...validPayload,
      realName: 'Jean Dupont',
      biography: 'Biographie courte',
      image: '/uploads/coach.jpg',
      slug: 'jean-coach',
      position: 0,
      socials: { twitter: 'https://twitter.com/jeancoach' },
    });
    expect(errors).toHaveLength(0);
  });

  // ─── MaxLength ───────────────────────────────────────────────────────────────

  it('rejette name > 100 caractères (SEC-002)', async () => {
    const errors = await validateDto({ ...validPayload, name: 'a'.repeat(101) });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejette role > 100 caractères (SEC-002)', async () => {
    const errors = await validateDto({ ...validPayload, role: 'r'.repeat(101) });
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('rejette realName > 100 caractères (SEC-002)', async () => {
    const errors = await validateDto({ ...validPayload, realName: 'r'.repeat(101) });
    expect(errors.some((e) => e.property === 'realName')).toBe(true);
  });

  it('rejette biography > 2000 caractères (SEC-002)', async () => {
    const errors = await validateDto({ ...validPayload, biography: 'b'.repeat(2001) });
    expect(errors.some((e) => e.property === 'biography')).toBe(true);
  });

  it('rejette image > 500 caractères (SEC-002)', async () => {
    const errors = await validateDto({ ...validPayload, image: 'i'.repeat(501) });
    expect(errors.some((e) => e.property === 'image')).toBe(true);
  });

  it('accepte name exactement 100 caractères (limite incluse)', async () => {
    const errors = await validateDto({ ...validPayload, name: 'a'.repeat(100) });
    expect(errors.some((e) => e.property === 'name')).toBe(false);
  });

  // ─── Slug pattern ────────────────────────────────────────────────────────────

  it.each([
    ['majuscules', 'Jean-Coach'],
    ['underscore', 'jean_coach'],
    ['tiret en debut', '-jean-coach'],
    ['tiret en fin', 'jean-coach-'],
  ])('rejette slug avec %s (SEC-002)', async (_libelle, slug) => {
    const errors = await validateDto({ ...validPayload, slug });
    expect(errors.some((e) => e.property === 'slug')).toBe(true);
  });

  it('accepte slug kebab-case valide (SEC-002)', async () => {
    const errors = await validateDto({ ...validPayload, slug: 'jean-coach-2' });
    expect(errors.some((e) => e.property === 'slug')).toBe(false);
  });

  it('accepte slug absent (optionnel)', async () => {
    const errors = await validateDto({ name: 'Test', role: 'Coach' });
    expect(errors.some((e) => e.property === 'slug')).toBe(false);
  });

  // ─── Champs obligatoires ─────────────────────────────────────────────────────

  it('rejette name vide', async () => {
    const errors = await validateDto({ ...validPayload, name: '' });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejette role vide', async () => {
    const errors = await validateDto({ ...validPayload, role: '' });
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });
});
