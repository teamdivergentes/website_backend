import request from 'supertest';

/**
 * Résultat d'une connexion via l'API.
 */
export interface LoginResult {
  /** Valeur brute du cookie `dvg_auth_token=<jwt>; Path=/; HttpOnly; ...` */
  cookie: string;
  /** Token JWT extrait du cookie (pour `Authorization: Bearer <token>`) */
  token: string;
}

/**
 * Type du premier argument de `supertest(...)` — accepte aussi bien un
 * `http.Server` qu'une application Express retournée par `app.getHttpServer()`.
 */
type SupertestServer = Parameters<typeof request>[0];

/**
 * Effectue un login via POST /api/auth/login et extrait le cookie HttpOnly
 * `dvg_auth_token` retourné par le serveur.
 *
 * Compatible avec l'auth cookie-based introduite depuis le commit f07b2cf.
 * Le token JWT extrait peut être passé en header `Authorization: Bearer`
 * car le JwtAuthGuard accepte les deux formes (cookie ou Bearer).
 *
 * @param server  Serveur HTTP exposé par `app.getHttpServer()`
 * @param email   Email de l'utilisateur (défaut : admin@teamdivergentes.fr)
 * @param password Mot de passe (défaut : admin123)
 * @throws Error si le cookie `dvg_auth_token` n'est pas présent dans la réponse
 */
export async function loginAsAdmin(
  server: SupertestServer,
  email = 'admin@teamdivergentes.fr',
  password = 'admin123',
): Promise<LoginResult> {
  const res = await request(server).post('/api/auth/login').send({ email, password });

  const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;

  if (!setCookieHeader) {
    throw new Error(`loginAsAdmin: header set-cookie absent pour ${email} (status ${res.status})`);
  }

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const authCookie = cookies.find((c) => c.startsWith('dvg_auth_token='));

  if (!authCookie) {
    throw new Error(
      `loginAsAdmin: cookie dvg_auth_token introuvable pour ${email}. ` +
        `Cookies reçus: ${cookies.join(', ')}`,
    );
  }

  // Extrait la valeur du token (tout ce qui suit "dvg_auth_token=" jusqu'au ";" suivant)
  const tokenMatch = authCookie.match(/dvg_auth_token=([^;]+)/);
  if (!tokenMatch) {
    throw new Error(
      `loginAsAdmin: impossible d'extraire la valeur du token depuis "${authCookie}"`,
    );
  }

  return { cookie: authCookie, token: tokenMatch[1] };
}
