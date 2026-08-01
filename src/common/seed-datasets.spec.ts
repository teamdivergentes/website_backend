import { resolveDatasets } from '../../prisma/seeds/datasets';

/**
 * Le choix du jeu de données est la seule barrière entre les fausses données et
 * la production. Préprod et production partagent la même instance PostgreSQL :
 * il suffit de viser le mauvais conteneur pour peupler la vraie base d'équipes
 * et de sponsors inventés.
 */
describe('resolveDatasets', () => {
  describe('sans consigne explicite', () => {
    it('applique le socle seul en production', () => {
      expect(resolveDatasets({ NODE_ENV: 'production' })).toEqual(['bootstrap']);
    });

    it('applique socle et démonstration ailleurs', () => {
      expect(resolveDatasets({ NODE_ENV: 'development' })).toEqual(['bootstrap', 'demo']);
      expect(resolveDatasets({})).toEqual(['bootstrap', 'demo']);
    });
  });

  describe('choix explicite', () => {
    it('respecte le jeu demandé', () => {
      expect(resolveDatasets({ SEED_DATASET: 'bootstrap' })).toEqual(['bootstrap']);
      expect(resolveDatasets({ SEED_DATASET: 'demo' })).toEqual(['demo']);
      expect(resolveDatasets({ SEED_DATASET: 'all' })).toEqual(['bootstrap', 'demo']);
    });

    it('tolère la casse et les espaces', () => {
      expect(resolveDatasets({ SEED_DATASET: '  BootStrap ' })).toEqual(['bootstrap']);
    });

    it('rejette une valeur inconnue plutôt que de deviner', () => {
      // Deviner sur une faute de frappe reviendrait à appliquer un jeu que
      // personne n'a demandé.
      expect(() => resolveDatasets({ SEED_DATASET: 'prod' })).toThrow(/SEED_DATASET invalide/);
    });
  });

  describe('barrière de production', () => {
    it('refuse la démonstration en production', () => {
      expect(() => resolveDatasets({ NODE_ENV: 'production', SEED_DATASET: 'demo' })).toThrow(
        /refusé en production/,
      );
    });

    it('refuse aussi « all », qui contient la démonstration', () => {
      expect(() => resolveDatasets({ NODE_ENV: 'production', SEED_DATASET: 'all' })).toThrow(
        /refusé en production/,
      );
    });

    it('cède devant une autorisation explicite', () => {
      // Le contournement existe pour un environnement de production factice ;
      // il doit rester un geste délibéré, jamais une valeur par défaut.
      expect(
        resolveDatasets({ NODE_ENV: 'production', SEED_DATASET: 'all', SEED_ALLOW_DEMO: '1' }),
      ).toEqual(['bootstrap', 'demo']);
    });

    it('ne se laisse pas ouvrir par une valeur approchante', () => {
      expect(() =>
        resolveDatasets({ NODE_ENV: 'production', SEED_DATASET: 'demo', SEED_ALLOW_DEMO: 'true' }),
      ).toThrow(/refusé en production/);
    });

    it('laisse passer le socle en production sans autorisation', () => {
      expect(resolveDatasets({ NODE_ENV: 'production', SEED_DATASET: 'bootstrap' })).toEqual([
        'bootstrap',
      ]);
    });
  });
});
