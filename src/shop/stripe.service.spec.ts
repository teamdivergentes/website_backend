import Stripe from 'stripe';
import { StripeService } from './stripe.service';

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
