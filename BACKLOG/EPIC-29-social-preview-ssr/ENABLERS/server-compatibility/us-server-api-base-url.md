# US — Résoudre l'URL de base de l'API côté serveur

**En tant que** développeur frontend
**Je veux** que les appels HTTP émis pendant le rendu serveur visent une URL absolue
**Afin que** les pages rendues côté serveur contiennent réellement leurs données

## Contexte

`src/environments/environment.prod.ts` définit `apiUrl: ''`. `ApiService` construit donc des URLs relatives (`/api/articles`), résolues par Nginx en navigateur. Côté Node, une URL relative n'a pas d'origine et `HttpClient` lève une erreur.

Sans cette US, le SSR rendrait un HTML **structurellement valide mais vide de contenu** — le problème actuel, en plus coûteux, et sans signal visible.

## Acceptance criteria

- [ ] Un intercepteur HTTP préfixe les URLs relatives par une origine absolue
- [ ] L'intercepteur est enregistré **uniquement** dans `app.config.server.ts`, jamais dans `app.config.ts`
- [ ] L'origine est lue depuis la variable d'environnement `SSR_API_BASE_URL`, avec `http://backend:3000` comme valeur par défaut documentée
- [ ] Les URLs déjà absolues (`http://`, `https://`) sont laissées intactes
- [ ] Le comportement navigateur est **strictement inchangé** : aucune modification de `ApiService` ni des `environment.*.ts` côté client
- [ ] `withHttpTransferCache` est actif via `provideClientHydration()`, de sorte que le navigateur ne refasse pas les appels déjà résolus au rendu serveur
- [ ] Tests unitaires : URL relative préfixée, URL absolue inchangée, variable d'environnement absente traitée par la valeur par défaut
- [ ] La variable `SSR_API_BASE_URL` est documentée dans `frontend/README.md` et transmise par le `docker-compose` et le rôle Ansible `website`
- [ ] `npm run lint` et `npm test` passent

## Notes

Cette US est mergeable seule, sans SSR actif : tant que `app.config.server.ts` n'est pas chargé, l'intercepteur n'existe pas au runtime.
