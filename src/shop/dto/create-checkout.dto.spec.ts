import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCheckoutDto } from './create-checkout.dto';

const validBase = { productId: 'maillotDvg_2023', size: 'M', quantity: 1 };

describe('CreateCheckoutDto', () => {
  it('accepte un payload valide', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { ...validBase });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepte un payload sans taille (produit sans déclinaison)', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { productId: 'tapisSourisDvg', quantity: 1 });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('refuse une quantité nulle', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { ...validBase, quantity: 0 });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse une quantité supérieure à 10', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { ...validBase, quantity: 11 });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('refuse un productId absent', async () => {
    const dto = plainToInstance(CreateCheckoutDto, { size: 'M', quantity: 1 });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
