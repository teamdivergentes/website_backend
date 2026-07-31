import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCheckoutDto } from './create-checkout.dto';

const validItem = { productId: 1, size: 'M', quantity: 1 };
const build = (payload: unknown) => plainToInstance(CreateCheckoutDto, payload);

describe('CreateCheckoutDto', () => {
  it('accepte un panier valide', async () => {
    expect(await validate(build({ items: [validItem] }))).toHaveLength(0);
  });

  it('accepte un flocage', async () => {
    const dto = build({ items: [{ ...validItem, flockingText: 'Snake' }] });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepte une ligne sans flocage', async () => {
    expect(await validate(build({ items: [validItem] }))).toHaveLength(0);
  });

  it('refuse un panier vide', async () => {
    expect(await validate(build({ items: [] }))).not.toHaveLength(0);
  });

  it('refuse un panier absent', async () => {
    expect(await validate(build({}))).not.toHaveLength(0);
  });

  it('refuse une taille absente', async () => {
    const dto = build({ items: [{ productId: 1, quantity: 1 }] });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse une quantité nulle', async () => {
    const dto = build({ items: [{ ...validItem, quantity: 0 }] });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse une quantité supérieure à 10', async () => {
    const dto = build({ items: [{ ...validItem, quantity: 11 }] });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse un productId non numérique', async () => {
    const dto = build({ items: [{ ...validItem, productId: 'maillot' }] });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse un flocage dépassant la longueur maximale', async () => {
    const dto = build({ items: [{ ...validItem, flockingText: 'BeaucoupTropLong' }] });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse un panier de plus de 10 lignes', async () => {
    const dto = build({ items: Array.from({ length: 11 }, () => validItem) });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
