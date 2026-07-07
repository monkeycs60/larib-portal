# Design — PubMed-backed banks (Publications)

- **Date:** 2026-07-07
- **Statut:** validé en brainstorming, prêt pour le plan d'implémentation (B1)
- **Contexte:** raffine les **banques** de la sous-app `PUBLICATIONS` (M1 déjà livré). Remplace la saisie manuelle des banques Journaux/Auteurs par des banques **alimentées depuis des sources externes**, et **avance PubMed** (initialement Phase 3) au rang de fondation des banques.
- **Base de départ:** branche `feat/publications` (M1 mergé dessus).

## 1. Objectif

Au lieu de saisir à la main journaux et auteurs, on branche des sources externes. Une seule brique moteur — **PubMed / NCBI E-utilities** — sert d'ossature, complétée par **Crossref** (recherche de journaux) et **Scimago SJR** (métrique). Toutes les publications de l'équipe ont **Théo Pezel** en co-auteur : sa liste PubMed sert d'ancre pour amorcer le back-catalogue.

### Objectifs
- Importer le back-catalogue de l'équipe depuis PubMed (ancré sur un auteur pivot, avec **curation** = décocher les papiers non pertinents) → peuple **Articles + Authorships + Auteurs (dédupliqués) + Journaux** d'un coup.
- Banque **Journaux** : recherche par nom (Crossref) avec **auto-remplissage** (titre/ISSN/éditeur), gestion de **favoris** (= la banque), **SJR auto** + **Impact Factor manuel** optionnel.
- Banque **Auteurs** : peuplée par l'import, dédupliquée, chaque auteur liable à un user du portail.

### Non-objectifs
- Pas d'IF officiel automatique (JCR = propriétaire/payant, pas d'API gratuite → IF **manuel**).
- Pas de désambiguïsation automatique des homonymes (curation + fusion manuelle en B3).
- Pas de sync temps réel ; l'import est déclenché à la demande par un admin.

## 2. Sources externes & faisabilité

| Source | Usage | Accès | Limites |
|---|---|---|---|
| **NCBI E-utilities** (`eutils.ncbi.nlm.nih.gov/entrez/eutils`) | Papiers + auteurs + journal (ISSN) + DOI | Gratuit ; `NCBI_API_KEY` optionnel | 3 req/s (10 avec clé). `esearch` puis `efetch` (XML) |
| **Crossref** (`api.crossref.org/journals`) | Recherche journaux → titre/ISSN/éditeur | Gratuit, sans clé | Politeness : header `User-Agent` avec email (pool « polite ») |
| **Scimago SJR** | Métrique SJR par journal | **Dataset CSV annuel embarqué** (pas d'API live) ; licence CC BY-NC (attribution) | Match par **ISSN** (fallback titre) ; journaux sans ISSN → pas de SJR |

**PubMed — requêtes :**
- Recherche : `esearch.fcgi?db=pubmed&term=<author>[Author]&retmax=500&retmode=json` → liste de PMIDs.
- Liste candidate (léger) : `esummary.fcgi?db=pubmed&id=<pmids>&retmode=json` → titre, journal, année, auteurs (nom+initiales), DOI (`articleids`).
- Détail à l'import (riche) : `efetch.fcgi?db=pubmed&id=<pmids>&retmode=xml` → `LastName/ForeName/Initials/Affiliation`, ORCID (`Identifier Source="ORCID"`), `Journal/Title/ISOAbbreviation/ISSN`, `ArticleTitle`, `Abstract`, `ArticleDate`/`PubDate`, DOI (`ELocationID EIdType="doi"`). Batch ~200 PMIDs par requête (POST si longue liste), en respectant le rate limit.

## 3. Data model (deltas vs M1)

Additif, migration légère.

- `Author` : **retirer** `@@unique([firstName, lastName])` (trop strict pour l'import ; dédup gérée applicativement). Optionnel : `orcid` déjà présent — servira de clé de dédup forte quand dispo.
- `Journal` : ajouter `sjr Float?` et `sjrYear Int?` (renseignés en B2 depuis le CSV Scimago par ISSN). `impactFactor Float?` reste **manuel**. Un journal est « favori » par simple présence dans la banque (pas de flag).
- `Article` : aucun changement (déjà `pubmedId`, `doi`, `publishedJournalId`, `publishedAt`, `abstract`).
- Optionnel (curation persistante) : table `ExcludedPubmedId { pubmedId String @id, anchor String, createdAt }` pour ne pas re-proposer les papiers déjà écartés. **Reporté** (YAGNI) — en B1 la curation est par session.

### Déduplication (clé de l'import)
- **Article** : clé = `pubmedId`. Existe déjà → skip (ou update léger). ⇒ **ré-import idempotent**, pas de doublon.
- **Journal** : clé = `issn` (sinon `name` normalisé). Upsert.
- **Author** : clé = `orcid` si présent, sinon `lastName` + première initiale du prénom (normalisés, sans accents/casse). Match → réutilise ; sinon crée. Les faux positifs/négatifs se corrigent par **fusion manuelle (B3)**.
- **Affiliation** : upsert par `name` (chaîne brute PubMed) ; sert de `defaultAffiliation` au premier passage.

## 4. B1 — Import du back-catalogue (première tranche à coder)

Le cœur de la valeur. Écran **admin** (`/publications/admin`, garde `appAdminAction('PUBLICATIONS')`).

### 4.1 Flux
1. Champ « auteur ancre » (défaut : **`Pezel Théo`** → terme PubMed `Pezel T[Author]`). Options : période, retmax.
2. **Rechercher** → `esearch` + `esummary` → tableau **candidat** : case à cocher, titre, journal, année, 1ᵉʳ/​dernier auteur, PMID, DOI. Tri par année.
3. **Curation** : tous cochés par défaut ; l'utilisateur **décoche** les papiers à exclure.
4. **Importer la sélection** → `efetch` (XML) des PMIDs retenus, puis pour chaque papier, dans une transaction :
   - upsert **Journal** (ISSN/nom, éditeur) ;
   - upsert **Auteurs** (dédup §3) + `defaultAffiliation` ;
   - créer **Article** si `pubmedId` inconnu (titre, type=`ORIGINAL` par défaut, `status`, `pubmedId`, `doi`, `publishedJournal`, `publishedAt`, `abstract`) ;
   - créer **Authorships** ordonnés (order = position, `isCorresponding=false`) + `AuthorshipAffiliation`.
5. **Rapport** : X articles importés, Y déjà présents (ignorés), Z auteurs créés, W journaux créés. Toasts sonner + `revalidateTag`.

### 4.2 Statut à l'import
Papiers PubMed = publiés → `status = PUBLISHED`, `publishedAt` = date PubMed. (Réglable ensuite dans le détail article.)

### 4.3 Robustesse
- Rate limit : file d'attente / chunks + petit délai ; clé `NCBI_API_KEY` si dispo.
- Réponses partielles / PMID sans journal ISSN / auteurs sans ForeName : dégrader proprement (initiales seules), ne jamais planter l'import global — collecter les erreurs par papier dans le rapport.
- Idempotence : relancer l'import ne duplique rien (clé `pubmedId`).

### 4.4 Services & actions
- `lib/services/publications/pubmed.ts` : `searchByAuthor(term, opts)` (esearch+esummary → candidats), `fetchByPmids(pmids)` (efetch XML → records normalisés). Types dédiés dans `@/types/`.
- `lib/services/publications/import.ts` : `importArticles(records)` (upsert transactionnel journaux/auteurs/articles/authorships + rapport).
- `app/[locale]/publications/actions.ts` : `searchBacklogAction` (recherche) + `importBacklogAction(pmids)` — tous `appAdminAction('PUBLICATIONS')`, `revalidateTag`.
- UI : `page.tsx` admin (server) → composant client de recherche/curation (RHF léger + `useAction` + sonner), tableau de candidats, bouton importer, rapport.

## 5. B2 — Journaux : recherche Crossref + favoris + SJR + IF manuel

- `lib/services/publications/journals-catalog.ts` : `searchJournals(query)` via Crossref → candidats (titre, ISSN, éditeur).
- `lib/services/publications/sjr.ts` + **dataset CSV Scimago** (`data/scimago-<année>.csv`) : `sjrForIssn(issn)`.
- UI banque Journaux : recherche → auto-remplissage → ajout **favori** (= création `Journal`, SJR rempli auto par ISSN), champ **IF manuel**, édition/suppression, tri par SJR/IF. Garde `appAdminAction('PUBLICATIONS')`.
- Suppression bloquée si le journal est référencé (Submission `Restrict`) → code d'erreur traduit `JOURNAL_IN_USE`.

## 6. B3 — Gestion banque Auteurs

- Liste (nom, diplômes, affiliation, #papiers, rôle 1ᵉʳ/co/dernier), édition, **fusion** de doublons (réassigne les authorships), **lien vers un user** du portail (`Author.userId`), suppression (si non référencé).

## 7. Permissions
Import et gestion des banques = **admin publications** (`appAdminAction('PUBLICATIONS')` / garde de page `canAdminApp`). Aucune écriture externe non authentifiée.

## 8. Gestion des erreurs & i18n
- PMID/DOI introuvable, réponse partielle, rate limit, réseau : codes string traduits FR/EN, toasts sonner.
- Attribution Scimago (CC BY-NC) affichée près de la métrique SJR.

## 9. Tests
- Unitaire (logique pure) : parsing efetch XML → records normalisés ; dédup auteurs (nom+initiale, ORCID) ; upsert idempotent (2ᵉ import = 0 doublon).
- E2E (réseau **mocké**) : admin lance une recherche ancre → curation (décocher 1 papier) → import → banques peuplées ; ré-import → pas de doublon. FR/EN.
- Seed : quelques enregistrements PubMed figés (fixtures) pour les mocks.

## 10. Phasage
- **B1** — Moteur PubMed + import back-catalogue (auteurs + articles + journaux) avec curation. ← on commence ici.
- **B2** — Journaux : Crossref + favoris + SJR + IF manuel.
- **B3** — Gestion banque auteurs (dédup/fusion, lien user).
- **B4** — Affiliations & **Centres** (auto-extraction + curation). Nuance validée : la string PubMed brute (par auteur/papier) est un input bruité ; on en distille (a) une **Affiliation** = ligne propre dédupliquée (pour le bloc auteurs numéroté), et (b) un **Centre** = institution/site stable, curé (ex. *Lariboisière – APHP*, *ICPS*), qui groupe plusieurs affiliations et porte un flag `isOwn` (« notre centre »). Approche : ré-importer les affiliations des papiers (le parseur les extrait déjà, B1 ne les stockait pas), deviner le centre par heuristique (mots-clés d'institution + fallback 1ᵉʳ segment), puis **curation manuelle** (fusion/renommage de centres, réassignation, flag notre centre). Modèle : nouveau `Centre` ← `Affiliation.centreId` ← lien par-papier `AuthorshipAffiliation`.

Chaque tranche a son plan d'implémentation (writing-plans) écrit juste avant exécution.

## 11. Hypothèses & questions ouvertes
- Ancre PubMed `Pezel T[Author]` : peu d'homonymes en cardiologie ; curation + fusion couvrent les cas. Ancre saisissable (défaut Pezel), non figée en base pour l'instant.
- `esummary` pour la liste candidate, `efetch` XML pour l'import (affiliations + ForeName). Parsing XML côté serveur (lib légère ou parsing DOM/regex ciblé — à trancher au plan).
- SJR via CSV embarqué (millésime à déposer/rafraîchir manuellement) ; année exposée dans l'UI.
- `isCorresponding` non fiable depuis PubMed → laissé `false`, confirmé plus tard (constructeur co-authorship, Phase 2).
