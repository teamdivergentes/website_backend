# US — JSON-LD JobPosting sur les offres de recrutement

## Role / Action / Benefice

> **En tant que** chercheur d'emploi / volontaire utilisant Google for Jobs,
> **je veux** voir les offres de Team Divergentes apparaitre dans les resultats enrichis de Google,
> **afin que** je puisse postuler sans connaitre le site DVG au prealable.

## Contexte

`frontend/src/app/pages/recrutement/job-detail/job-detail.component.ts` (l. 37-43) appelle deja `seoService.updateMetaTags(...)` pour les meta tags classiques mais n'emet aucun JSON-LD. Google for Jobs requiert un schema `JobPosting` valide pour referencer une offre.

Documentation : https://developers.google.com/search/docs/appearance/structured-data/job-posting

## Criteres d'acceptation

- [x] Ajouter `getJobPostingJsonLd(post: RecruitmentPost): object` dans `seo.service.ts` retournant :
  ```json
  {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": "{post.title}",
    "description": "{post.description en HTML clean}",
    "datePosted": "{post.createdAt ISO}",
    "validThrough": "{post.expiresAt ISO ou +90 jours}",
    "employmentType": "VOLUNTEER",
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Team Divergentes",
      "sameAs": "https://teamdivergentes.fr",
      "logo": "https://teamdivergentes.fr/assets/logos/logoTD.svg"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "FR"
      }
    },
    "jobLocationType": "TELECOMMUTE",
    "directApply": false
  }
  ```
- [x] Validation du modele `RecruitmentPost` cote frontend (`shared/models/recruitment.ts` ou equivalent) : les champs `createdAt` et `description` sont bien exposes
- [x] Appel a `seoService.setJsonLd([breadcrumbList, jobPosting])` dans `job-detail.component.ts::ngOnInit()` apres recuperation du poste
- [x] Test unitaire Jasmine `job-detail.component.spec.ts` validant le JSON-LD emis (11 tests GREEN)
- [ ] Validation manuelle sur https://search.google.com/test/rich-results : page eligible "Job Posting"
- [x] Pas d'erreur console JS sur la page (build propre)

## Effort estime

S (≈ 0.5 j)

## Dependances

- US `us-breadcrumb-recrutement` (combine dans le meme `setJsonLd([])`)
- Verification que le DTO Backend expose bien `createdAt` et eventuellement `expiresAt` — coordination avec `backend-node` si manquant.
