import {
  applicableUnitPrice,
  CODE_ALPHABET,
  discountAmount,
  generateCode,
  GENERATED_CODE_LENGTH,
  isValidCodeShape,
  isWithinWindow,
  normalizeCode,
} from './shop-discount';

describe('discountAmount', () => {
  it('déduit un montant fixe tel quel', () => {
    expect(discountAmount({ type: 'FIXED', value: 500 }, 4990)).toBe(500);
  });

  it('déduit un pourcentage du sous-total', () => {
    expect(discountAmount({ type: 'PERCENTAGE', value: 10 }, 4990)).toBe(499);
  });

  it('arrondit le pourcentage vers le bas', () => {
    // 10 % de 49,95 € font 4,995 € : le centime va au client, sinon le montant
    // annonce et le montant encaisse divergent d'un centime.
    expect(discountAmount({ type: 'PERCENTAGE', value: 10 }, 4995)).toBe(499);
  });

  it('ne déduit jamais plus que le panier', () => {
    // Un code de 20 € sur un panier de 15 € : sans ce plafond, le total passe
    // sous zero et Stripe recoit un montant negatif.
    expect(discountAmount({ type: 'FIXED', value: 2000 }, 1500)).toBe(1500);
  });

  it('ramène une valeur négative à zéro plutôt qu’en majoration', () => {
    expect(discountAmount({ type: 'FIXED', value: -500 }, 4990)).toBe(0);
  });

  it('rend zéro sur un panier vide', () => {
    expect(discountAmount({ type: 'PERCENTAGE', value: 50 }, 0)).toBe(0);
  });
});

describe('isWithinWindow', () => {
  const now = new Date('2026-08-08T12:00:00Z');

  it('accepte une fenêtre entièrement ouverte', () => {
    expect(isWithinWindow({ startsAt: null, endsAt: null }, now)).toBe(true);
  });

  it('refuse avant le début', () => {
    expect(isWithinWindow({ startsAt: new Date('2026-09-01'), endsAt: null }, now)).toBe(false);
  });

  it('refuse après la fin', () => {
    expect(isWithinWindow({ startsAt: null, endsAt: new Date('2026-08-01') }, now)).toBe(false);
  });

  it('accepte sans date de fin, une fois le début passé', () => {
    expect(isWithinWindow({ startsAt: new Date('2026-08-01'), endsAt: null }, now)).toBe(true);
  });
});

describe('applicableUnitPrice', () => {
  const now = new Date('2026-08-08T12:00:00Z');
  const produit = {
    priceCents: 4990,
    promoPriceCents: 3990,
    promoStartsAt: new Date('2026-08-01'),
    promoEndsAt: new Date('2026-08-31'),
  };

  it('retient le prix promotionnel pendant la fenêtre', () => {
    expect(applicableUnitPrice(produit, now)).toBe(3990);
  });

  it('revient au prix catalogue une fois la promotion échue, sans intervention', () => {
    expect(applicableUnitPrice(produit, new Date('2026-09-15T12:00:00Z'))).toBe(4990);
  });

  it('ignore un prix promotionnel supérieur au catalogue', () => {
    // Une « promotion » qui augmente le prix serait invisible en base et bien
    // visible en caisse.
    expect(applicableUnitPrice({ ...produit, promoPriceCents: 5990 }, now)).toBe(4990);
  });

  it('retient le prix catalogue quand aucune promotion n’est posée', () => {
    expect(applicableUnitPrice({ ...produit, promoPriceCents: null }, now)).toBe(4990);
  });

  it('traite un champ absent comme une absence de promotion', () => {
    // Un objet construit sans ces champs ne doit pas produire un prix
    // `undefined` qui se propagerait en NaN jusqu'au total.
    expect(applicableUnitPrice({ priceCents: 4990 }, now)).toBe(4990);
  });
});

describe('normalizeCode', () => {
  it('met en majuscules et retire les espaces de bord', () => {
    expect(normalizeCode('  rentree10 ')).toBe('RENTREE10');
  });
});

describe('isValidCodeShape', () => {
  it('accepte lettres, chiffres et tirets', () => {
    expect(isValidCodeShape('RENTREE-10')).toBe(true);
  });

  it('refuse un code trop court', () => {
    expect(isValidCodeShape('AB')).toBe(false);
  });

  it('refuse les espaces et la ponctuation', () => {
    expect(isValidCodeShape('CODE PROMO')).toBe(false);
    expect(isValidCodeShape('CODE_PROMO')).toBe(false);
  });
});

describe('generateCode', () => {
  it('produit un code de la longueur attendue', () => {
    expect(generateCode()).toHaveLength(GENERATED_CODE_LENGTH);
  });

  it('n’emploie que des caractères qui ne se confondent pas à la lecture', () => {
    // Un code se dicte et se recopie depuis une capture d'ecran : un `0` lu
    // « O » produit un refus incomprehensible pour le client.
    for (let essai = 0; essai < 200; essai += 1) {
      expect(generateCode()).toMatch(new RegExp(`^[${CODE_ALPHABET}]+$`));
    }
    expect(CODE_ALPHABET).not.toMatch(/[O0I1L]/);
  });

  it('produit une forme acceptable par la validation de saisie', () => {
    expect(isValidCodeShape(generateCode())).toBe(true);
  });
});
