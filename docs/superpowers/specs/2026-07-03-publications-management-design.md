# Design — Gestion des publications (Publications Management)

- **Date:** 2026-07-03
- **Branche de départ:** `design/refonte-ui`
- **Statut:** validé en brainstorming, prêt pour le plan d'implémentation (Phase 1)
- **App portail:** nouvelle sous-app `PUBLICATIONS` (nouvelle carte dashboard)

## 1. Contexte & objectif

Le portail Larib héberge plusieurs sous-apps (`bestof-larib`, `conges`, …). On ajoute une sous-app pour **gérer le cycle de vie des publications scientifiques de l'équipe** : des études, leurs articles, les auteurs, les journaux, le suivi des soumissions/statuts, la construction du bloc co-auteurs prêt pour Word, des KPI admin, des relances mensuelles par email, et l'import PubMed.

Contrainte forte de démarrage : **il faut pouvoir saisir en rétrospectif tous les papiers déjà publiés ou en cours** pour amorcer l'outil. La saisie doit donc être rapide et l'import PubMed est un accélérateur de premier plan, pas un bonus.

### Objectifs
- Banques réutilisables : études, auteurs (liés aux users du portail si membres de l'équipe), journaux, affiliations.
- Suivi du statut d'un article et de l'historique de ses soumissions.
- Savoir « où soumettre ensuite » sans rigidité.
- Construire le co-authorship d'un papier → export `.docx` prêt à coller, avec affiliations numérotées.
- KPI admin.
- Relances email mensuelles automatisées (Resend + cron).
- Import PubMed (accepté = forcément sur PubMed).
- Stockage des PDF (peu prioritaire).

### Non-objectifs
- Pas de rédaction collaborative du manuscrit dans l'outil (juste le bloc auteurs/affiliations).
- Pas de soumission automatique aux journaux (pas d'intégration éditeur).
- Pas de gestion bibliographique type Zotero.
- Pas d'intégration d'impact factor automatique (saisie manuelle du journal).

## 2. Utilisateurs & permissions

Modèle de rôles retenu (**option incrémentale**) — deux niveaux qui coexistent, sans casser l'existant :
- **Super-admin portail** = `role = ADMIN` (inchangé). Gère les utilisateurs (page `/admin/users`) et reste **admin de toutes les apps** par extension (surensemble). C'est le « super user » demandé pour la gestion des users.
- **Admin par app** = nouveau champ `adminApplications: Application[]` sur `User` (sous-ensemble de `applications`). Permet de désigner un **gestionnaire d'une app** sans en faire un super-admin portail → matrice publi-admin/publi-user, conges-admin/conges-user, etc.

**Admin publications** = `role === 'ADMIN'` (super-admin) **OU** `PUBLICATIONS ∈ adminApplications`. Encapsulé dans un helper `isPublicationsAdmin(user)`.

| Rôle (vis-à-vis des publications) | Droits |
|---|---|
| **Admin publications** (super-admin OU `adminApplications ∋ PUBLICATIONS`) | Tout : CRUD études/auteurs/journaux/affiliations, éditer **n'importe quel** article, KPI, constructeur de co-authorship. |
| **1ᵉʳ auteur d'un article** (authorship `order = 1`, lié à un user) | Créer un article, éditer **ses propres articles** : statut, soumissions, détails, auteurs, liste des prochains journaux. |
| **Co-auteur / autre position** (y compris dernier auteur) | **Lecture seule** sur ces articles : suit le statut. |

Règles clés :
- **Un admin est aussi un membre** : « Mes publications » est accessible à **tous**, admins compris. Un admin co-auteur voit et gère ses propres articles comme un user ; ses droits admin s'**ajoutent**, ils ne remplacent pas la vue membre.
- Le droit d'édition d'un article = **admin publications** **OU** (user = auteur de position 1 de cet article). Être « dernier auteur » ne donne **pas** de droit d'édition.
- La vue « Mes publications » liste **tous** les articles où le user apparaît comme auteur, et affiche l'action **Éditer** ou **Voir** selon la règle ci-dessus (mix dans une même liste).

**Périmètre du changement de rôles** : seule la sous-app publications **consomme** `adminApplications` dans ce projet. `role = ADMIN` continue de fonctionner partout (super-admin = admin de tout). Congés/Bestof gardent leur logique actuelle jusqu'à une éventuelle migration ultérieure (**hors périmètre**). Le champ `adminApplications` est posé de façon générique pour ces futures migrations. `getTypedSession()` doit désormais inclure `adminApplications` dans son `select` pour être disponible partout comme `role`/`applications`.

Gating d'accès à la sous-app : via `User.applications` (comme les autres apps), nouvelle valeur d'enum `PUBLICATIONS`.

## 3. Modèle de données

Conventions repo (issues de l'exploration) : client Prisma généré dans `@/app/generated/prisma` ; `id String @id` généré applicativement via `crypto.randomUUID()` (ou `@default(cuid())`) ; `createdAt`/`updatedAt` standard ; `@@map("PascalCase")` ; `select` explicite dans les services ; `onDelete: Restrict` sur les FK vers `User` créateur ; enums UPPERCASE inline.

### Nouvelles valeurs d'enum
```prisma
enum Application { BESTOF_LARIB  CONGES  CARDIOLARIB  PUBLICATIONS }  // + PUBLICATIONS

enum ArticleStatus { IN_PREPARATION  UNDER_REVIEW  TO_RESUBMIT  ACCEPTED  PUBLISHED  ABANDONED }
enum ArticleType   { ORIGINAL  REVIEW  CASE_REPORT  EDITORIAL  LETTER  META_ANALYSIS  OTHER }
enum SubmissionStatus { UNDER_REVIEW  MINOR_REVISIONS  MAJOR_REVISIONS  ACCEPTED  REJECTED }
```
Les libellés FR/EN sont gérés en i18n ; l'enum en base reste en anglais.

### Entités

**Study** — une étude, contient N articles.
- `id`, `title`, `description?`, `leadUserId?` (→ User, le PI), `startDate?`, `isClosed Boolean @default(false)`, `createdById` (→ User, Restrict), timestamps.
- `articles Article[]`

**Journal** — banque de journaux.
- `id`, `name @unique`, `issn?`, `publisher?`, `impactFactor Float?`, `category?`, `url?`, timestamps.
- relations : `submissions Submission[]`, `targets JournalTarget[]`, `publishedArticles Article[]` (via `Article.publishedJournalId`).

**Affiliation** — banque d'affiliations réutilisables (pour la numérotation/dédup du bloc auteurs).
- `id`, `name @unique` (texte complet tel qu'il apparaît dans la liste numérotée), `institution?`, `department?`, `city?`, `country?`, timestamps.
- relations : `authorshipAffiliations AuthorshipAffiliation[]`, `defaultOfAuthors Author[]`.

**Author** — banque d'auteurs, lié optionnellement à un user du portail.
- `id`, `firstName`, `lastName`, `degrees?` (ex. `"MD, PhD"`), `email?`, `orcid?`, `defaultAffiliationId?` (→ Affiliation), `userId?` (→ User, lien équipe, `onDelete: SetNull`), timestamps.
- `@@unique([firstName, lastName])` (souple ; à confirmer, sinon dédup manuelle).
- relations : `authorships Authorship[]`.

**Article** — la publication.
- `id`, `title`, `type ArticleType @default(ORIGINAL)`, `studyId?` (→ Study), `status ArticleStatus @default(IN_PREPARATION)`, `abstract?`, `pubmedId?`, `doi?`, `publishedJournalId?` (→ Journal, journal de publication finale), `publishedAt?`, `pdfUrl?`, `pdfKey?`, `createdById` (→ User, Restrict), timestamps.
- relations : `authorships Authorship[]`, `submissions Submission[]`, `journalTargets JournalTarget[]`.
- `firstAuthor` = authorship `order = 1` (dérivé) ; `correspondingAuthor` = authorship `isCorresponding = true` (dérivé).

**Authorship** — liaison Article↔Author, ordonnée, avec rôle correspondant et affiliations propres au papier.
- `id`, `articleId` (→ Article, Cascade), `authorId` (→ Author, Restrict), `order Int` (1 = premier auteur), `isCorresponding Boolean @default(false)`, timestamps.
- `@@unique([articleId, authorId])`, `@@unique([articleId, order])`.
- relations : `affiliations AuthorshipAffiliation[]` (ordonnées).

**AuthorshipAffiliation** — affiliations d'un auteur **sur ce papier** (M2M ordonné pour les superscripts `¹,²`).
- `authorshipId` (→ Authorship, Cascade), `affiliationId` (→ Affiliation, Restrict), `order Int`.
- `@@id([authorshipId, affiliationId])`.

**Submission** — historique factuel des tentatives de soumission (une ligne par tentative ; le même journal peut apparaître plusieurs fois → resoumission de novo).
- `id`, `articleId` (→ Article, Cascade), `journalId` (→ Journal, Restrict), `submittedAt DateTime`, `status SubmissionStatus @default(UNDER_REVIEW)`, `decidedAt DateTime?`, `invitedToResubmit Boolean @default(false)`, `notes?`, timestamps.

**JournalTarget** — liste ordonnée **optionnelle** des « prochains journaux à essayer » (pense-bête, aucune contrainte).
- `id`, `articleId` (→ Article, Cascade), `journalId` (→ Journal, Restrict), `rank Int`, `createdAt`.
- `@@unique([articleId, journalId])`.
- Action « Soumettre au suivant » = promeut le `rank` le plus bas en une nouvelle `Submission`.

**User** (per-app, convention repo) — ajouts :
- `adminApplications Application[] @default([])` — admin **par app** (sous-ensemble de `applications`). `role = ADMIN` reste le super-admin portail (gestion des users), admin de toutes les apps par extension.
- `publicationsEmailOptOut Boolean @default(false)` (désinscription du digest mensuel).
- `+ PUBLICATIONS` dans `applications`.
- relations inverses : `authoredBy Author[]` (lien auteur), `studiesLed Study[]`, `articlesCreated Article[]`, `studiesCreated Study[]`.

### Décisions de modélisation (rationale)
1. **Statut de l'article = un champ unique `status`** posé explicitement, avec une **synchro proposée en 1 clic** quand on renseigne une étape de soumission (ex. soumission passée à `ACCEPTED` → toast « Passer l'article en Accepté ? »). Pas de dérivation cachée. Raison : marche identiquement pour la saisie rétrospective (pose directe) et le suivi en direct.
2. **Historique (`Submission`) + liste optionnelle (`JournalTarget`)** au lieu d'un pipeline figé. Raison : flexibilité (resoumission même journal, ignorer la liste), tout en gardant « il sait où soumettre ensuite ».
3. **Banque d'affiliations séparée** + `AuthorshipAffiliation` ordonné. Raison : numérotation/dédup correcte du bloc auteurs quand un auteur a plusieurs affiliations (`¹,²`).
4. **Corresponding author** = flag `isCorresponding` sur une seule `Authorship`, **par défaut suggéré = dernier auteur mais doit être confirmé** (tant que non confirmé, pas de correspondant figé).

## 4. Workflows

### 4.1 Cycle de vie du statut
`IN_PREPARATION → UNDER_REVIEW → ACCEPTED → PUBLISHED`, avec branche `UNDER_REVIEW → (rejet) → TO_RESUBMIT → (nouvelle soumission) → UNDER_REVIEW`. `ABANDONED` accessible à tout moment. `PUBLISHED` et `ABANDONED` sont posés à la main ; les autres peuvent être synchronisés depuis la soumission en cours (proposition 1 clic).

### 4.2 Soumissions & prochains journaux
- Ajouter une soumission = journal + date + statut initial `UNDER_REVIEW`.
- Faire évoluer le statut d'une soumission : `MINOR_REVISIONS` / `MAJOR_REVISIONS` / `ACCEPTED` / `REJECTED` (+ `invitedToResubmit`, `notes`, `decidedAt`).
- `JournalTarget` : liste ordonnée éditable ; bouton « Soumettre au suivant » crée la `Submission` depuis le 1ᵉʳ de la liste.

### 4.3 Saisie rétrospective & import PubMed
- Formulaire « + Nouvelle publication » avec **peu de champs obligatoires** : titre, statut, auteurs.
- **Import PubMed** : coller un PMID ou DOI → pré-remplit titre, auteurs, journal, date (via NCBI E-utilities). Un papier publié se saisit en ~30 s.
- Statut réglable directement (ex. `PUBLISHED`) sans avoir logué de soumission.

### 4.4 Constructeur de co-authorship → Word
- Builder : auteurs ordonnés (glisser-déposer), attribution d'1+ affiliations par auteur (depuis la banque), sélection de l'auteur correspondant (défaut = dernier auteur, **confirmation requise**).
- **Picker d'auteur enrichi de KPI** pour éclairer le choix : total papiers, nb dans **cette étude**, répartition des rôles (1ᵉʳ/co/dernier) — colonnes triables. Réutilise le moteur de stats des KPI admin.
- Aperçu « page de titre » en direct : **journal ciblé** (prochain de la liste ou soumission en cours) + **titre** + **auteurs** (superscripts) + **affiliations numérotées** + **auteur correspondant** (nom, adresse, email). Sections activables/désactivables.
- Livraison : **télécharger `.docx`** (génération serveur via lib `docx`) + **copier avec mise en forme** (HTML riche dans le presse-papier, côté client).
- Options de rendu : format du nom (Prénom Nom / Initiale. Nom), diplômes (MD, PhD), ORCID, correspondant.

### 4.5 KPI admin
Tuiles : publications totales, en cours, taux d'acceptation (accepté/soumis), délai moyen soumission→acceptation. Graphes : publications par statut, publiées par an. Tables : par étude, top journaux (publiées/rejets), top auteurs. Extensions possibles : nb de journaux essayés avant acceptation, productivité par 1ᵉʳ auteur, publis sans PDF, statuts non mis à jour depuis X.

### 4.6 Emails mensuels (Resend + Vercel Cron)
- **Le 1ᵉʳ du mois**, chaque **1ᵉʳ auteur** (non désinscrit) ayant ≥ 1 article **en cours** (`IN_PREPARATION`/`UNDER_REVIEW`/`TO_RESUBMIT`) reçoit un email : liste de ses articles en cours + statut + date de dernière MàJ + bouton « Actualiser ».
- **Digest global admin** mensuel : tout ce qui est en cours, ce qui n'a pas bougé depuis longtemps.
- Infra : route `app/api/cron/monthly-digest` protégée par un secret (`CRON_SECRET`), planifiée par **Vercel Cron** (`vercel.json`). Fallback GitHub Actions planifié si non hébergé sur Vercel. Envoi via le pattern existant `lib/services/email.ts` (fetch Resend + template HTML localisé).

## 5. Architecture & organisation (conventions repo)

### Points de branchement pour une nouvelle sous-app (checklist)
1. **Prisma** : `+ PUBLICATIONS` à `enum Application` ; nouveaux modèles/enums ci-dessus ; colonne `publicationsEmailOptOut` sur `User` ; migration (⚠ jamais `migrate reset`).
2. **Accès & rôles (UI admin)** : ajouter `PUBLICATIONS` aux zod enums de `app/[locale]/admin/users/actions.ts` (pour `applications`) ; ajouter `adminApplications` (zod + persistance dans `updateUser`/`createUserInvite`) ; faire évoluer `user-add-dialog.tsx` + `user-edit-dialog.tsx` pour offrir, **par app, deux cases : Accès + Admin de l'app** (`applications` / `adminApplications`), en plus de la case super-admin (`role`). La page `/admin/users` reste gated par `role === 'ADMIN'` (super-admin only). Inclure `adminApplications` dans le `select` de `getTypedSession()`.
3. **Dashboard** : `dashboard/page.tsx` — `appOrder`, `appSlug`, `getAppIcon`.
4. **Navigation** : `app/[locale]/components/app-sidebar.tsx` (+ `navbar-client.tsx`) — entrée `if (applications.includes('PUBLICATIONS'))`.
5. **i18n** : `app_PUBLICATIONS`, `appDesc_PUBLICATIONS` + namespace `publications` dans `messages/en.json` et `messages/fr.json`.

### Services — `lib/services/publications/`
Fonctions async (pas de classes), `import { prisma }`, `select` explicite, types via `Prisma.*GetPayload`, cache tags + `unstable_cache`/`revalidateTag`. Découpage proposé : `studies.ts`, `articles.ts`, `authors.ts`, `journals.ts`, `affiliations.ts`, `submissions.ts`, `stats.ts`, `pubmed.ts`, `docx.ts`, `digest.ts`.

### Server actions — `app/[locale]/publications/actions.ts`
`next-safe-action` : nouveau guard `publicationsAdminAction` (basé sur `isPublicationsAdmin(user)` = super-admin **ou** `adminApplications ∋ PUBLICATIONS`) pour les banques ; `authenticatedAction` + garde métier « admin publications **OU** 1ᵉʳ auteur de l'article » pour l'édition d'article. Revalider les deux locales (`revalidatePath('/en','layout')` + `/fr`) ou `revalidateTag`. Effets (toasts sonner, refresh) côté client via `useAction`.

### Routes — `app/[locale]/publications/`
- `page.tsx` — **« Mes publications »** (tous users) + points d'entrée ; admins voient les accès aux banques + KPI.
- `articles/[id]/page.tsx` — détail article (statut, soumissions, prochains journaux, authorship).
- `articles/[id]/authorship/…` — constructeur de co-authorship *(Phase 2)*.
- `studies/`, `authors/`, `journals/`, `affiliations/` — banques *(admin)*.
- `stats/` — KPI admin *(Phase 2)*.
- Pas de `layout.tsx` (héritage de l'`AppShell` global). Re-check d'accès dans chaque `page.tsx` (comme `conges/page.tsx`).

### Intégrations & infra
- **PubMed** : `lib/services/publications/pubmed.ts` via NCBI E-utilities (`esearch`/`efetch`/`esummary`, base `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`). Clé API optionnelle (`NCBI_API_KEY`) pour le débit. PMID→métadonnées ; DOI→resolve PMID→métadonnées.
- **`.docx`** : nouvelle dépendance (lib `docx`) pour générer le bloc auteurs côté serveur ; « copier » = HTML riche côté client.
- **PDF** : réutiliser le pattern `app/api/uploads/*` + `r2PutObject` (R2), stocker `pdfUrl`+`pdfKey` sur `Article`.
- **Email** : `sendPublicationsDigestEmail` dans `lib/services/email.ts` ; route cron sécurisée ; `vercel.json`.

## 6. Gestion des erreurs & i18n
- Toutes les erreurs Zod/API traduites FR/EN (services throw des codes string mappés côté UI, pattern existant type `POSITIONS_IN_USE:${count}`).
- Toasts sonner sur succès/erreur des mutations.
- Import PubMed : gérer PMID/DOI introuvable, réponse partielle, rate limit.

## 7. Tests
- E2E Playwright (`tests/e2e/`) : 1–2 parcours complets (admin crée étude→article→auteurs→soumission→changement de statut ; user « Mes publications » édite son article de 1ᵉʳ auteur et voit en lecture seule un article de co-auteur), en testant FR/EN dans le même test.
- Couvrir : règle d'édition (1ᵉʳ auteur vs co-auteur vs admin), synchro statut proposée, resoumission même journal, import PubMed (mock réseau), génération `.docx` (Phase 2), sélection/confirmation du correspondant.
- Seed : `prisma/seed.test.ts` étendu (étude, journaux, auteurs, un article multi-auteurs).

## 8. Phasage

### Phase 1 — Socle utilisable (MVP)
Modèle de données + migration + carte dashboard + gating (`PUBLICATIONS`) + sidebar ; **rôles par app (`adminApplications` + `isPublicationsAdmin`) et évolution de l'UI `/admin/users` (Accès + Admin par app, super-admin conservé)** ; banques études/auteurs(+lien user)/journaux/affiliations ; CRUD article (titre, étude, type, statut champ unique, auteurs ordonnés) ; soumissions (historique) + étapes + synchro statut proposée + liste « prochains journaux » ; vue « Mes publications » (édition 1ᵉʳ auteur / lecture seule sinon) ; import PubMed un-par-un + saisie rapide rétrospective.

### Phase 2 — Outils à valeur
Constructeur de co-authorship → `.docx` (KPI picker, affiliations, correspondant confirmé, copier) ; tableau de bord KPI admin ; import PubMed en masse (liste de PMIDs).

### Phase 3 — Automatisation & extras
Emails mensuels (Resend + Vercel Cron : 1ᵉʳˢ auteurs + digest admin) ; sync PubMed des papiers publiés (détection auto, citation) ; stockage des PDF (R2, peu prioritaire).

**Livraison spec/plan :** cette spec couvre la vision complète. Le plan d'implémentation (writing-plans) démarre sur la **Phase 1** uniquement ; les phases 2 et 3 auront leur propre plan.

## 9. Hypothèses & questions ouvertes
- Déploiement Vercel supposé (pour Vercel Cron) — sinon GitHub Actions, même route.
- `Author` dédupliqué par (prénom, nom) — à confirmer, sinon dédup manuelle/merge.
- `ArticleType` en enum fixe (vs table configurable comme `ExamType`) — enum retenu pour le MVP.
- Génération `.docx` via lib `docx` (nouvelle dépendance) — à valider au moment de la Phase 2.
- Un auteur peut être lié à 0 ou 1 user ; un user peut correspondre à 0 ou 1 auteur.
