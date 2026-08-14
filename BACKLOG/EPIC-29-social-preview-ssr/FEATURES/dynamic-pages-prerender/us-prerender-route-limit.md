# US — Limites et garde-fous sur le prerender de routes dynamiques

**En tant que** ingenieur DevSecOps
**Je veux** poser des limites strictes sur le nombre de routes prerenderees et le temps de build
**Afin que** la CI reste rapide et ne casse pas si le volume de contenu explose

## Acceptance criteria

- [ ] Limite hardcodee dans la config : maximum 500 routes dynamiques prerenderees au total (articles + joueurs + coachs)
- [ ] Si la limite est depassee, le build emet un warning mais continue (pas de fail) — seules les N premieres routes (les plus recentes/visibles) sont prerenderees, les autres tombent en fallback SPA
- [ ] Strategie de priorisation documentee :
  - Articles : top N par date de publication desc
  - Joueurs : tous les joueurs actifs (estimation max ~50)
  - Coachs : tous les coachs actifs (estimation max ~20)
- [ ] Metric exposee : le job CI affiche en sortie le nombre de routes prerenderees + duree totale du prerender
- [ ] Alerte CI si la duree prerender depasse 4 min (warning) ou 6 min (failure)
- [ ] Documentation dans `frontend/CLAUDE.md` : section "Prerender" expliquant comment ajuster les limites
- [ ] Test : ajouter 1000 articles fakes dans une base de test et verifier que le build reste sous 6 min
