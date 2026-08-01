/**
 * Choix du jeu de donnees a appliquer.
 *
 * Module volontairement pur : il ne touche ni a la base ni a `process.env`
 * directement, pour que la seule barriere entre les fausses donnees et la
 * production soit verifiable par des tests.
 */

/**
 * - `bootstrap` : le socle sans lequel l'application ne tourne pas droit —
 *   roles, compte d'administration, configuration, jeux, categories d'articles,
 *   reglages et catalogue boutique. Applique partout, production comprise.
 * - `demo` : de fausses donnees pour remplir les pages — equipes, matchs,
 *   trophees, sponsors, staff, recrutement, Twitch, coaching. Developpement et
 *   preprod uniquement.
 */
export type SeedDataset = 'bootstrap' | 'demo';

const KNOWN = ['bootstrap', 'demo', 'all'] as const;

export interface SeedEnv {
  NODE_ENV?: string;
  SEED_DATASET?: string;
  SEED_ALLOW_DEMO?: string;
}

/**
 * Le jeu de demonstration ne doit jamais atterrir en production. La barriere
 * n'est pas theorique : preprod et production partagent la meme instance
 * PostgreSQL, et il suffit de viser le mauvais conteneur.
 */
export function resolveDatasets(env: SeedEnv): SeedDataset[] {
  const isProduction = env.NODE_ENV === 'production';
  const requested = env.SEED_DATASET?.trim().toLowerCase();

  if (requested && !KNOWN.includes(requested as (typeof KNOWN)[number])) {
    throw new Error(
      `SEED_DATASET invalide : « ${requested} ». Valeurs acceptées : ${KNOWN.join(', ')}.`,
    );
  }

  // Sans consigne, la production s'en tient au socle et le reste prend tout.
  const datasets = selectDatasets(requested, isProduction);

  if (isProduction && datasets.includes('demo') && env.SEED_ALLOW_DEMO !== '1') {
    throw new Error(
      'Le jeu de démonstration est refusé en production. ' +
        'Si c’est réellement voulu, relancer avec SEED_ALLOW_DEMO=1.',
    );
  }

  return datasets;
}

function selectDatasets(requested: string | undefined, isProduction: boolean): SeedDataset[] {
  if (requested === 'bootstrap') {
    return ['bootstrap'];
  }
  if (requested === 'demo') {
    return ['demo'];
  }
  if (requested === 'all' || !isProduction) {
    return ['bootstrap', 'demo'];
  }
  return ['bootstrap'];
}
