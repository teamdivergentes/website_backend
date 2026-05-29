import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function validateDto<T extends object>(
  dtoClass: new () => T,
  plain: Record<string, unknown>,
): Promise<string[]> {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

// -----------------------------------------------------------------------
// LoginDto
// -----------------------------------------------------------------------
describe('LoginDto', () => {
  it('accepte email + password valides', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'user@example.com',
      password: 'Passw0rd!',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejette un email invalide', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'pas-un-email',
      password: 'Passw0rd!',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejette un password absent', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'user@example.com',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // SEC-005 — anti-DoS bcrypt : password limité à 72 caractères
  // -------------------------------------------------------------------------
  describe('SEC-005 — @MaxLength(72) sur password', () => {
    it('accepte un password de exactement 72 caractères', async () => {
      const errors = await validateDto(LoginDto, {
        email: 'user@example.com',
        password: 'A'.repeat(72),
      });
      expect(errors).toHaveLength(0);
    });

    it('rejette un password de 73 caractères', async () => {
      const errors = await validateDto(LoginDto, {
        email: 'user@example.com',
        password: 'A'.repeat(73),
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejette un password de 128 caractères', async () => {
      const errors = await validateDto(LoginDto, {
        email: 'user@example.com',
        password: 'A'.repeat(128),
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

// -----------------------------------------------------------------------
// RegisterDto
// -----------------------------------------------------------------------
describe('RegisterDto', () => {
  it('accepte email + password valides', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'user@example.com',
      password: 'Passw0rd!',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepte un roleId optionnel', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'user@example.com',
      password: 'Passw0rd!',
      roleId: 2,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejette un password trop court (< 8)', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'user@example.com',
      password: 'abc',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejette un email invalide', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'not-email',
      password: 'Passw0rd!',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // SEC-005 — anti-DoS bcrypt : password limité à 72 caractères
  // -------------------------------------------------------------------------
  describe('SEC-005 — @MaxLength(72) sur password', () => {
    it('accepte un password de exactement 72 caractères', async () => {
      // 72 caractères respectant aussi la complexité SEC-014 (min/maj/chiffre)
      const errors = await validateDto(RegisterDto, {
        email: 'user@example.com',
        password: 'Aa1' + 'a'.repeat(69),
      });
      expect(errors).toHaveLength(0);
    });

    it('rejette un password de 73 caractères', async () => {
      const errors = await validateDto(RegisterDto, {
        email: 'user@example.com',
        password: 'A'.repeat(73),
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejette un password de 128 caractères', async () => {
      const errors = await validateDto(RegisterDto, {
        email: 'user@example.com',
        password: 'A'.repeat(128),
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
