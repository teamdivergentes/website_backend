import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto — validation (SEC-014)', () => {
  async function validateDto(data: object) {
    const dto = plainToInstance(RegisterDto, data);
    return validate(dto);
  }

  const validPayload = {
    email: 'user@example.com',
    password: 'Password1',
  };

  it('accepte un payload valide (Password1)', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('accepte un password complexe avec caractères spéciaux (Passw0rd!)', async () => {
    const errors = await validateDto({ ...validPayload, password: 'Passw0rd!' });
    expect(errors).toHaveLength(0);
  });

  // ─── MinLength ───────────────────────────────────────────────────────────────

  it('rejette un password de moins de 8 caractères', async () => {
    const errors = await validateDto({ ...validPayload, password: 'Pass1' });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  // ─── SEC-014 : complexité minimale ───────────────────────────────────────────

  it('rejette un password sans majuscule (motdepasse1)', async () => {
    const errors = await validateDto({ ...validPayload, password: 'motdepasse1' });
    const passwordErrors = errors.filter((e) => e.property === 'password');
    expect(passwordErrors.length).toBeGreaterThan(0);
    const constraints = passwordErrors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(constraints.some((msg) => msg.includes('majuscule'))).toBe(true);
  });

  it('rejette un password sans minuscule (MOTDEPASSE1)', async () => {
    const errors = await validateDto({ ...validPayload, password: 'MOTDEPASSE1' });
    const passwordErrors = errors.filter((e) => e.property === 'password');
    expect(passwordErrors.length).toBeGreaterThan(0);
    const constraints = passwordErrors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(constraints.some((msg) => msg.includes('minuscule'))).toBe(true);
  });

  it('rejette un password sans chiffre (MotDePasse)', async () => {
    const errors = await validateDto({ ...validPayload, password: 'MotDePasse' });
    const passwordErrors = errors.filter((e) => e.property === 'password');
    expect(passwordErrors.length).toBeGreaterThan(0);
    const constraints = passwordErrors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(constraints.some((msg) => msg.includes('chiffre'))).toBe(true);
  });

  it('rejette un password avec seulement des chiffres (12345678)', async () => {
    const errors = await validateDto({ ...validPayload, password: '12345678' });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('accepte Password1 (8 chars, 1 maj, 1 min, 1 chiffre)', async () => {
    const errors = await validateDto({ ...validPayload, password: 'Password1' });
    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });

  it('accepte Abcdefg8 (8 chars minimum exact)', async () => {
    const errors = await validateDto({ ...validPayload, password: 'Abcdefg8' });
    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });

  // ─── Email ───────────────────────────────────────────────────────────────────

  it('rejette un email invalide', async () => {
    const errors = await validateDto({ ...validPayload, email: 'not-an-email' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  // ─── roleId optionnel ────────────────────────────────────────────────────────

  it('accepte roleId optionnel absent', async () => {
    const errors = await validateDto(validPayload);
    expect(errors.some((e) => e.property === 'roleId')).toBe(false);
  });

  it('accepte roleId entier fourni', async () => {
    const errors = await validateDto({ ...validPayload, roleId: 2 });
    expect(errors.some((e) => e.property === 'roleId')).toBe(false);
  });
});
