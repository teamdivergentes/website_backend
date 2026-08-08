import Stripe from 'stripe';
import { StripeService, withSessionPlaceholder } from './stripe.service';
import { SHIPPING_COUNTRIES } from './shop-shipping-zone';

/**
 * `getSessionOutcome` est le garde-fou qui autorise, ou non, la suppression
 * d'une commande PENDING. Une erreur de lecture ici efface la seule trace d'un
 * paiement encaisse : chaque branche est donc testee explicitement.
 */
describe('StripeService.getSessionOutcome', () => {
  let service: StripeService;
  let retrieve: jest.Mock;

  beforeEach(() => {
    service = new StripeService();
    retrieve = jest.fn();
    jest
      .spyOn(service as unknown as { getClient: () => unknown }, 'getClient')
      .mockReturnValue({ checkout: { sessions: { retrieve } } });
  });

  it('rend « paid » quand le paiement a abouti', async () => {
    retrieve.mockResolvedValue({ payment_status: 'paid', status: 'complete' });
    await expect(service.getSessionOutcome('cs_1')).resolves.toBe('paid');
  });

  it('rend « paid » pour un total nul, ou aucun paiement n’est requis', async () => {
    retrieve.mockResolvedValue({ payment_status: 'no_payment_required', status: 'complete' });
    await expect(service.getSessionOutcome('cs_1')).resolves.toBe('paid');
  });

  it('rend « unpaid » pour une session expiree sans paiement', async () => {
    retrieve.mockResolvedValue({ payment_status: 'unpaid', status: 'expired' });
    await expect(service.getSessionOutcome('cs_1')).resolves.toBe('unpaid');
  });

  /**
   * Une session encore ouverte, ou close avec un paiement differe, peut encore
   * aboutir. S'abstenir est la seule reponse sure.
   */
  it('s’abstient sur une session encore ouverte', async () => {
    retrieve.mockResolvedValue({ payment_status: 'unpaid', status: 'open' });
    await expect(service.getSessionOutcome('cs_1')).resolves.toBe('unknown');
  });

  it('s’abstient sur un paiement differe non encore encaisse', async () => {
    retrieve.mockResolvedValue({ payment_status: 'unpaid', status: 'complete' });
    await expect(service.getSessionOutcome('cs_1')).resolves.toBe('unknown');
  });

  it('rend « unpaid » quand Stripe ne connait plus la session', async () => {
    retrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        type: 'invalid_request_error',
        code: 'resource_missing',
        message: 'No such checkout session',
      }),
    );
    await expect(service.getSessionOutcome('cs_disparue')).resolves.toBe('unpaid');
  });

  it('s’abstient quand Stripe est injoignable', async () => {
    retrieve.mockRejectedValue(new Error('ECONNRESET'));
    await expect(service.getSessionOutcome('cs_1')).resolves.toBe('unknown');
  });
});

/**
 * La liste des pays passee a Stripe est ce qui autorise, ou refuse, une
 * commande depuis un pays donne. Une regression ici ne casse aucun test
 * fonctionnel : elle ferme simplement la boutique a une partie de l'Europe,
 * en silence. D'ou une verification directe de ce qui part chez Stripe.
 */
describe('StripeService.createCheckoutSession — zone de livraison', () => {
  let service: StripeService;
  let create: jest.Mock;

  beforeEach(() => {
    service = new StripeService();
    create = jest.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test/cs_1' });
    jest
      .spyOn(service as unknown as { getClient: () => unknown }, 'getClient')
      .mockReturnValue({ checkout: { sessions: { create } } });
  });

  async function createdParams(): Promise<Stripe.Checkout.SessionCreateParams> {
    await service.createCheckoutSession({
      lines: [{ label: 'Maillot', unitAmountCents: 4500, quantity: 1 }],
      shippingCents: 590,
      currency: 'eur',
      discountCents: 0,
      expiresAt: new Date('2026-08-08T13:00:00Z'),
      metadata: { orderId: '1' },
    });
    const [params] = create.mock.calls[0] as [Stripe.Checkout.SessionCreateParams];
    return params;
  }

  it('ouvre la collecte d’adresse a toute la zone europeenne, pas a la seule France', async () => {
    const allowed = (await createdParams()).shipping_address_collection?.allowed_countries;

    expect(allowed).toEqual([...SHIPPING_COUNTRIES]);
    expect(allowed).not.toEqual(['FR']);
  });

  it('couvre les Etats membres et les voisins europeens hors Union', async () => {
    const allowed = (await createdParams()).shipping_address_collection?.allowed_countries ?? [];

    // Un echantillon parlant plutot que les 33 codes : quatre coins de l'Union,
    // puis les quatre destinations hors Union qui impliquent une douane.
    for (const country of ['FR', 'DE', 'ES', 'FI', 'CH', 'GB', 'NO', 'MC']) {
      expect(allowed).toContain(country);
    }
    expect(allowed).toHaveLength(33);
  });

  it('n’annonce plus la livraison comme francaise', async () => {
    const [option] = (await createdParams()).shipping_options ?? [];
    const displayName = option?.shipping_rate_data?.display_name;

    expect(displayName).toBe('Livraison Europe');
    expect(displayName).not.toContain('France');
  });
});

/**
 * Sans ce parametre, le retour de Stripe est anonyme : la page de remerciement
 * ne peut ni nommer le client ni afficher ce qu'il vient d'acheter.
 */
describe('withSessionPlaceholder', () => {
  it('ajoute le parametre de session a une URL nue', () => {
    expect(withSessionPlaceholder('https://teamdivergentes.fr/boutique/merci')).toBe(
      'https://teamdivergentes.fr/boutique/merci?session_id={CHECKOUT_SESSION_ID}',
    );
  });

  it('respecte une chaine de requete deja presente', () => {
    expect(withSessionPlaceholder('https://site.fr/merci?utm_source=stripe')).toBe(
      'https://site.fr/merci?utm_source=stripe&session_id={CHECKOUT_SESSION_ID}',
    );
  });

  it('laisse intacte une URL qui porte deja le placeholder', () => {
    const url = 'https://site.fr/merci?session_id={CHECKOUT_SESSION_ID}';
    expect(withSessionPlaceholder(url)).toBe(url);
  });

  it('n’encode pas les accolades, que Stripe ne substituerait plus', () => {
    // `URL.searchParams` produirait `%7BCHECKOUT_SESSION_ID%7D` : le site
    // recevrait le placeholder en toutes lettres au lieu de l'identifiant.
    expect(withSessionPlaceholder('https://site.fr/merci')).not.toContain('%7B');
  });
});

describe('createCheckoutSession — URL de retour', () => {
  it('transmet a Stripe une URL de succes porteuse du placeholder', async () => {
    const service = new StripeService();
    const create = jest.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test/cs_1' });
    jest
      .spyOn(service as unknown as { getClient: () => unknown }, 'getClient')
      .mockReturnValue({ checkout: { sessions: { create } } });
    process.env.SHOP_SUCCESS_URL = 'https://teamdivergentes.fr/boutique/merci';

    await service.createCheckoutSession({
      lines: [{ label: 'Maillot', unitAmountCents: 4500, quantity: 1 }],
      shippingCents: 590,
      currency: 'eur',
      discountCents: 0,
      expiresAt: new Date('2026-08-08T13:00:00Z'),
      metadata: { orderId: '1' },
    });

    const [params] = create.mock.calls[0] as [Stripe.Checkout.SessionCreateParams];
    expect(params.success_url).toBe(
      'https://teamdivergentes.fr/boutique/merci?session_id={CHECKOUT_SESSION_ID}',
    );
    delete process.env.SHOP_SUCCESS_URL;
  });
});
