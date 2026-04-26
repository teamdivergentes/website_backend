# Quality Gate `DVG-Strict` — définition et justification

Quality Gate custom défini sur l'instance SonarQube DVG (<https://sonarqube.tellebma.fr/>) et **attaché aux deux projets** `dvg-backend` et `dvg-frontend` à compter du 2026-04-26.

Ce gate **remplace** `Sonar way` (built-in) sur les deux projets. Il est le critère de blocage de la CI à terme (cf. enabler `ci-quality-enforcement`).

---

## 1. Conditions

### On New Code (Clean as You Code)

Le scope "New Code" couvre le code modifié dans la PR analysée vs `main`. C'est l'angle d'attaque principal : **on ne dégrade pas la qualité**.

| Métrique | Opérateur | Seuil | Effet |
|---|---|---|---|
| `new_reliability_rating` | `>` | A (1) | Bloque si nouveau bug introduit |
| `new_security_rating` | `>` | A (1) | Bloque si nouvelle vulnérabilité |
| `new_maintainability_rating` | `>` | A (1) | Bloque si dette technique > 5 % |
| `new_security_hotspots_reviewed` | `<` | 100 % | Bloque si tous les nouveaux hotspots ne sont pas revus |
| `new_coverage` | `<` | 80 % | Bloque si la nouvelle ligne / branche n'est pas couverte à 80 % |
| `new_duplicated_lines_density` | `>` | 3 % | Bloque si > 3 % du nouveau code est dupliqué |
| `new_violations` | `>` | 0 | Bloque si **toute** nouvelle violation (BLOCKER, CRITICAL, MAJOR, MINOR) — auto-injecté par CAYC |

### On Overall Code

Le scope "Overall Code" couvre tout le projet. Ces conditions restent permissives dans un premier temps (dans l'attente du refacto EPIC-19) et seront resserrées progressivement.

| Métrique | Opérateur | Seuil | Effet | Justification |
|---|---|---|---|---|
| `bugs` | `>` | 0 | Bloque si **un** bug est présent | Aucun bug toléré en prod |
| `vulnerabilities` | `>` | 0 | Bloque si une vulnérabilité est présente | Aucune vulnérabilité tolérée |
| `coverage` | `<` | 80 % | Bloque si la couverture globale tombe < 80 % | Cible affichée pour l'EPIC-19 |
| `duplicated_lines_density` | `>` | 3 % | Bloque si la duplication globale dépasse 3 % | Limite Sonar standard |

---

## 2. Justification des seuils

| Choix | Pourquoi |
|---|---|
| **Rating A** sur nouveau code (Reliability/Security/Maintainability) | On accepte de la dette héritée, mais **toute nouvelle régression bloque**. Discipline Clean as You Code. |
| **80 %** de couverture nouveau code + global | Standard de l'industrie. Cohérent avec le `quality.md` du projet. |
| **3 %** duplication | Seuil par défaut Sonar, déjà respecté par les deux projets (back 2.2 %, front 0.3 %). |
| **100 %** hotspots reviewed (new code) | Tout nouveau hotspot doit être tracé / fermé / accepté avant merge. Protège contre l'introduction silencieuse de risques sécu. |
| **0** bug ou vulnérabilité (overall) | Volonté forte de produit fini. Backend a 1 bug à corriger, Frontend en a 14 — tracés dans les enablers `*-code-quality`. |

---

## 3. État baseline au 2026-04-26 vs DVG-Strict

| Projet | Sur new code | Sur overall code (DVG-Strict) | Décision |
|---|---|---|---|
| `dvg-backend` | ❌ ERROR (76.2 % cov < 80 %, 27 nouvelles violations) | ❌ ERROR (1 bug, coverage 53.1 % < 80 %) | EPIC-17 PR #60 sera bloquée jusqu'à ajout de specs controllers + correction des 2 issues critiques + exclusion S2699 sur e2e specs |
| `dvg-frontend` | ✅ OK (sur new code uniquement) | ❌ ERROR (14 bugs, coverage 45 % < 80 %) | EPIC-19 enablers couvriront ces gaps |

> Le **scope `new_violations` = 0** est strict. Sur les nouvelles PRs frontend, il faut s'assurer qu'aucune issue n'est introduite (BLOCKER + CRITICAL + MAJOR + MINOR confondus).

---

## 4. Dérogations temporaires identifiées

Pour permettre le merge des PRs en cours sans casser le rythme de l'EPIC-17 :

### À traiter avant tout merge

1. **Faux positif `typescript:S2699` sur les e2e specs backend** (129 issues sur 130 BLOCKER) — Solution : ajouter dans `backend/sonar-project.properties` :

   ```properties
   sonar.issue.ignore.multicriteria=e1
   sonar.issue.ignore.multicriteria.e1.ruleKey=typescript:S2699
   sonar.issue.ignore.multicriteria.e1.resourceKey=test/**.e2e-spec.ts
   ```

   Cette dérogation est **structurelle** (les e2e Jest+supertest assertent via `.expect(200)` qui n'est pas reconnu par Sonar). À documenter en commentaire dans `sonar-project.properties`.

2. **Couvrir les controllers EPIC-17** (`twitch-channels.controller.ts` et `coaching-staff.controller.ts`) pour passer les 80 % de couverture sur le code nouveau de PR #60.

3. **Corriger les 2 vraies issues critiques backend** (`twitch-helix:150` localeCompare + `coaching-staff.service:145` cognitive complexity).

### À traiter dans les enablers EPIC-19

- 1 bug backend (`reliability_rating: 4.0`) à investiguer et fixer
- 14 bugs frontend (`reliability_rating: 3.0`)
- 4 issues critiques frontend (cf. baseline frontend §3)
- 4+9 hotspots à reviewer
- Couverture globale à passer de 53/45 % → 80 % (les deux projets)

---

## 5. Procédure de re-création du QG

Si le QG est perdu ou doit être recréé sur une autre instance Sonar :

```bash
SONAR=https://sonarqube.tellebma.fr
TOKEN=<user_token_avec_perms_gateadmin>

# Créer le QG
curl -u "$TOKEN:" -X POST -d "name=DVG-Strict" "$SONAR/api/qualitygates/create"

# Conditions (les CAYC sont auto-injectées au create — celles ci-dessous sont manuelles)
for cond in "new_reliability_rating|GT|1" \
            "new_security_rating|GT|1" \
            "new_maintainability_rating|GT|1" \
            "bugs|GT|0" \
            "vulnerabilities|GT|0" \
            "coverage|LT|80" \
            "duplicated_lines_density|GT|3"; do
  IFS='|' read -r metric op error <<< "$cond"
  curl -u "$TOKEN:" -X POST \
    -d "gateName=DVG-Strict&metric=$metric&op=$op&error=$error" \
    "$SONAR/api/qualitygates/create_condition"
done

# Attacher aux projets
for proj in dvg-backend dvg-frontend; do
  curl -u "$TOKEN:" -X POST \
    -d "gateName=DVG-Strict&projectKey=$proj" \
    "$SONAR/api/qualitygates/select"
done

# Vérifier
curl -u "$TOKEN:" "$SONAR/api/qualitygates/show?name=DVG-Strict"
```

> Le token requis nécessite la permission **`gateadmin`** (Administer Quality Gates). Un token "admin token" Sonar standard (`sqa_*`) peut être insuffisant — préférer un user token (`squ_*`) généré depuis un compte admin.

---

## 6. Notes

- Les conditions `new_*` du gate `DVG-Strict` correspondent exactement à celles du **mode Clean as You Code** Sonar — c'est la philosophie du projet (pas de régression sur le nouveau code, on rattrape la dette progressivement).
- Lors du resserrement futur des seuils overall, modifier les conditions via :

  ```bash
  curl -u "$TOKEN:" -X POST \
    -d "id=<condition_id>&metric=coverage&op=LT&error=85" \
    "$SONAR/api/qualitygates/update_condition"
  ```
