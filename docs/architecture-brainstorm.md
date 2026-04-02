# Architecture Brainstorm — Jardinmusical + Payload CMS

> Document de réflexion. Contexte sandbox — exploration de patterns réutilisables, pas un plan de production immédiat.

---

## 1. Vue d'ensemble

### Ce qui existe aujourd'hui

**Jardinmusical (Next.js app)**

- 37+ routes, 12 endpoints API, ~15 entités Prisma, 30+ services
- Domaines transactionnels : réservations (studio/concert/formation/hébergement), crédits (achat/allocation/transfert), organisations (hiérarchie/membres/invitations), post-production, paiements Stripe, calendrier Google, emails
- Auth : Better Auth avec rôles USER/ADMIN/SUPER_ADMIN + permissions granulaires
- Produits en base avec traductions (ProductTranslation)
- Stack : Next.js 16, React 19, Prisma 7, PostgreSQL (Neon), Stripe, Google Calendar, Zustand, TanStack Query, next-intl (fr/en/nl)
- Contenu public actuel : 2000+ clés de traduction dans locales/\*.json, images statiques dans /public/

**Payload CMS (sandbox)**

- 7 collections : Users (RBAC), Media, Posts, Pages (blocks), Categories, Tags, AuditLogs
- 8 blocs : Hero, Content, HowItWorks, TargetAudience, FAQ, Testimonials, CTA, ImageGallery
- 4 hooks : auto-slug, audit-log, publish-workflow, publish-notification
- 6 patterns de contrôle d'accès
- 4 plugins : SEO, Nested Docs, Form Builder, Search
- Localisation FR/EN/NL avec fallback, admin en français

**Wix (jardinmusical.org)**

- Événements et billetterie via Wix Events
- API REST disponible (Wix Events API v3)

---

## 2. Séparation des responsabilités

### Ce qui reste sur Prisma / Jardinmusical (non négociable)

Tout ce qui est transactionnel :

- Réservations (studio, concert, formation, hébergement)
- Crédits (achat, allocation, transfert entre organisations)
- Organisations (hiérarchie, membres, invitations)
- Post-production (suivi de projets)
- Paiements (Stripe webhooks, factures)
- Authentification (Better Auth, sessions, permissions)
- Calendrier (sync Google Calendar)
- Produits avec pricing (entité Prisma Product + ProductTranslation)
- Emails transactionnels (9 templates existants)

**Règle** : si ça touche de l'argent, des sessions, ou des données utilisateur → Prisma, point.

### Ce qui va sur Payload CMS

Contenu public éditorial, sans logique métier :

- Pages marketing (landing, services, personas)
- Blog / articles SEO
- Témoignages et preuves sociales
- FAQ
- Pages légales (CGV, CGU, Cookies) avec rich text
- Presse / mentions médias
- Contenu structuré des artistes partenaires
- Événements publics (sync depuis Wix ou saisie manuelle)

**Règle** : si un non-développeur doit pouvoir le modifier sans PR → Payload.

### Ce qui reste sur Wix

- Billetterie événements (logique Wix Events)
- Gestion des participants via Wix
- Potentiellement : sync read-only vers Payload pour affichage

---

## 3. Contenu candidat pour le CMS

### Landing page (actuellement dans locales/\*.json)

La landing actuelle a 6 sections : Intro, TargetAudience, HowItWorks, Summary, Pricing, CTA.

Aujourd'hui tout passe par des clés de traduction. La migration vers Payload permettrait :

- Rich text au lieu de strings simples
- Images gérées via Media collection (avec optimisation)
- Blocs réordonnables (le sandbox a déjà Hero, Content, HowItWorks, TargetAudience, CTA)
- Édition sans déploiement

La section Pricing reste connectée aux données Prisma (Product + ProductTranslation) — on n'y touche pas.

### Pages légales (CGV, CGU, Cookies)

Actuellement dans les fichiers de traduction. Candidats directs pour Payload :

- Rich text avec versioning
- Dates de mise à jour visibles dans l'admin
- Pas besoin de dev pour les mettre à jour

### Blog / Articles SEO

N'existe pas encore. Opportunité claire :

- 8 articles SEO identifiés (keywords ciblés : "studio enregistrement bruxelles" 500-1000/mo, "studio podcast bruxelles" 300-600/mo, etc.)
- Collection Posts déjà dans le sandbox avec slugs, SEO plugin, catégories
- Workflow de publication (brouillon → review → publié) déjà en place via hooks

### Pages programmatiques (pSEO)

Pages de service et personas identifiées :

- `/studio-enregistrement`, `/studio-podcast`, `/salle-concert`
- `/pour/musiciens`, `/pour/podcasters`, `/pour/artistes`

Ces pages ont une structure commune (hero, description, features, CTA) — candidats parfaits pour le système de blocs Payload. Une collection Services ou un type de Page avec template fixe suffit.

### Témoignages et preuve sociale

Absent du site actuel. Assets non exploités identifiés :

- YouTube (2M+ views)
- BBC Award
- Collaborations artistes (Maria Joao Pires, Camille Thomas)

Collection Testimonials simple : auteur, citation, source, médias optionnels. Pourrait alimenter un bloc Testimonials existant dans le sandbox.

### FAQ

Absent du site actuel. Collection FAQ : question, réponse (rich text), catégorie. Bloc FAQ déjà dans le sandbox.

### Événements

Via sync Wix Events API v3 ou saisie manuelle dans Payload. Voir section dédiée ci-dessous.

---

## 4. Collections supplémentaires envisageables

### Events

```
- title (localisé)
- date, endDate
- location
- description (rich text, localisé)
- externalUrl (lien Wix pour billetterie)
- wixEventId (pour sync)
- status: draft | published | past
- featuredImage → Media
```

### Artists

```
- name
- bio (rich text, localisé)
- photo → Media
- instruments / genres (tags)
- externalLinks (site, Spotify, YouTube)
- collaborations (relation vers Events ou Posts)
```

### Press

```
- title
- publication
- date
- excerpt (localisé)
- url
- logo → Media
- featured: boolean
```

### Services

```
- slug
- title (localisé)
- description (rich text, localisé)
- blocks (système de blocs pour pages pSEO)
- seo (plugin SEO existant)
- targetPersona: musiciens | podcasters | artistes | labels
```

---

## 5. Intégration Wix Events

### Option A — Sync vers Payload (recommandée pour le CMS)

Un script ou webhook sync les événements Wix vers la collection Events de Payload :

- Wix Events API v3 : `GET /events/v3/events` retourne les événements publics
- Sync déclenchée par webhook Wix (publication d'événement) ou cron
- Payload stocke une copie read-only (wixEventId comme clé d'idempotence)
- Le frontend consomme Payload uniquement, le lien billetterie pointe vers Wix

Avantages : cohérence des données, pas de double source, SEO natif via Payload.

### Option B — Fetch direct depuis le frontend

Le frontend Next.js appelle l'API Wix Events directement au moment du rendu :

- Aucun stockage dans Payload
- Plus simple à implémenter
- Moins de contrôle éditorial (pas de override possible)

Recommandation : Option A si les événements doivent être enrichis (description longue, images custom, SEO). Option B si on veut juste afficher la liste sans modification.

### Authentification Wix API

L'API Wix Events nécessite un API Key (Wix Headless) ou OAuth. À stocker en variable d'environnement côté Next.js ou dans le service de sync.

---

## 6. Patterns réutilisables (ce que le sandbox démontre)

Le sandbox Payload n'est pas spécifique à Jardinmusical — il explore des patterns génériques :

### Pattern 1 — Blocks-based pages

Le système de blocs (Hero, Content, HowItWorks, etc.) permet de construire n'importe quelle page sans code. Ce pattern est transférable à tout projet avec pages marketing variables.

### Pattern 2 — Publish workflow

Le hook publish-workflow (brouillon → review → publié → archivé) avec notifications est un pattern production-ready réutilisable dans tout projet nécessitant une validation éditoriale.

### Pattern 3 — RBAC granulaire

6 patterns de contrôle d'accès couvrent les cas courants : lecture publique, édition par auteur, admin only, accès par status. Template direct pour tout projet multi-rôles.

### Pattern 4 — Audit logging

Le hook audit-log qui trace les modifications (qui a changé quoi, quand) est un pattern compliance utile dans tout contexte où la traçabilité compte.

### Pattern 5 — Localisation FR/EN/NL

La config de localisation avec fallback et admin en français est un template applicable à tout projet belge multilingue.

### Pattern 6 — SEO + Nested Docs

La combinaison SEO plugin + Nested Docs permet des arborescences de pages avec métadonnées SEO à chaque niveau — pattern pertinent pour sites avec structure hiérarchique (services > sous-services).

---

## 7. Questions ouvertes

### Intégration frontend

**Q : Comment le frontend Next.js consomme-t-il Payload ?**
Options : Payload REST API, Payload Local API (si monorepo), GraphQL.
La Local API est la plus performante mais implique un couplage architectural fort.

**Q : Le contenu CMS remplace-t-il les fichiers locales/\*.json ou coexiste-t-il ?**
Migration complète = rupture à gérer. Coexistence = double source de vérité.
Approche pragmatique : migrer par section, en commençant par les pages légales (valeur immédiate, risque bas).

### Sync Wix

**Q : Quelle fréquence de sync pour les événements ?**
Wix ne fournit pas de webhooks natifs dans tous les plans. Si pas de webhook, un cron toutes les heures est acceptable pour des événements.

**Q : Les événements Payload doivent-ils être éditables après sync ?**
Si oui, il faut un mécanisme de "lock" pour ne pas écraser les overrides éditoriaux lors de la prochaine sync.

### Produits et pricing

**Q : Les prix restent-ils exclusivement dans Prisma ?**
Recommandé : oui. Mais si on veut des pages de pricing riches (comparatifs, features), Payload pourrait stocker la structure visuelle pendant que les prix réels viennent de Prisma via API.

### Architecture de déploiement

**Q : Payload tourne-t-il sur la même infra que le Next.js app ou séparément ?**
Séparé = indépendance de déploiement, latence réseau entre les services.
Colocalisé = complexité opérationnelle réduite si même plateforme (ex: Vercel).

### SEO programmatique

**Q : Les pages pSEO sont-elles générées statiquement (SSG) ou dynamiquement (SSR) ?**
SSG avec revalidation (ISR) est optimal pour du contenu CMS qui change peu fréquemment.

**Q : Qui gère le schema markup (JSON-LD) ?**
Le plugin SEO de Payload peut gérer les métadonnées de base. Le schema JSON-LD structuré (LocalBusiness, Event, FAQ) devrait être généré côté Next.js à partir des données CMS.
