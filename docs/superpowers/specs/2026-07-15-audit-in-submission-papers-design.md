# Audit des papiers en cours de soumission — Design

**Date :** 2026-07-15
**Branche :** feat/publications
**Statut :** validé (brainstorming), en attente de plan d'implémentation

## Problème

Les papiers **déjà publiés** sont récupérés automatiquement depuis PubMed (`BacklogImport`).
Les papiers **en cours de soumission** ne sont pas encore sur PubMed : leur information vit
sur les portails des journaux (Editorial Manager, ScholarOne, Manuscript Central), derrière
un login par auteur, et dans les emails de statut envoyés par ces portails.

Il faut :
1. **Un audit unique** pour peupler la base avec les ~15–50 papiers actuellement en vol.
2. **Une saisie continue** ensuite, par les étudiants ou les admins.

Aucune source automatisable fiable n'existe (scraping des portails = fragile, anti-bot,
CGU restrictives, une UI par éditeur). La donnée doit être extraite d'une source humaine.

## Approche retenue (A) : audit piloté par l'IA + saisie continue existante

L'IA (Claude, dans une session de travail) sert là où elle est la plus utile : le **lot initial**.
L'app n'embarque **aucun système LLM permanent**. La saisie continue réutilise le flux existant.

Répartition confirmée avec l'utilisateur : les emails de statut sont « un peu des deux » —
une partie dans la boîte Gmail connectée, le reste chez les étudiants. On mine la boîte
disponible pour amorcer ; le reste est collé manuellement à l'IA, puis saisi via l'app en continu.

## Modèle de données (existant, réutilisé)

Aucune migration de schéma. On s'appuie sur les modèles existants :

- `Article` — statut `UNDER_REVIEW` ou `TO_RESUBMIT` pour un papier en vol ; `createdById` requis.
- `Submission` — `journalId`, `submittedAt`, `status` (`SubmissionStatus`), `decidedAt`, `notes`.
- `Journal` — catalogue partagé, auto-alimenté par `findOrCreateJournalId`.
- `Author` + `Authorship` — auteurs et leur ordre/rôle corresponding par article.

`addSubmission` (service existant) écrit toujours une soumission `SUBMITTED` et marque les
soumissions actives antérieures comme `REJECTED` (règle « un seul journal actif à la fois »).
La décision courante est ensuite posée via `updateSubmissionStatus`.

## Donnée capturée par papier

| Champ | Source | Obligatoire |
|---|---|---|
| Titre | email / portail | ✅ |
| Journal | email → `findOrCreateJournalId` (normalisé sur le catalogue) | ✅ |
| Date de soumission | email « received » | ✅ |
| Statut courant | `UNDER_REVIEW` / `MINOR_REVISIONS` / `MAJOR_REVISIONS` / `TO_RESUBMIT`… | ✅ |
| Date de décision | si révision/rejet déjà reçu | optionnel |
| Auteurs | extraits de l'email (nom, ordre, corresponding si détectable) | ✅ (best effort) |

Les auteurs sont extraits en **best effort** : ce qui est lisible dans l'email est capturé ;
l'enrichissement fin (affiliations, ORCID) reste hors périmètre et se fait plus tard via les
outils auteurs existants.

## Pipeline

### 1. Extraction (IA, session de travail — pas de code dans l'app)

- Recherche Gmail : expéditeurs type `editorialmanager`, `scholarone`, `manuscriptcentral`,
  `em.*` ; objets « received / decision / revision / under review ».
- Extraction des champs ci-dessus, **normalisation des noms de journaux** contre le catalogue
  `Journal` (mêmes journaux que les papiers publiés).
- Extraction des **auteurs** depuis le corps/entête de l'email.
- Papiers absents de la boîte : l'utilisateur **colle** le texte du portail/email → même parsing.
- **Dédup** contre les `Article` existants (titre proche + journal).

### 2. Revue

- L'IA rend un **tableau relisable** : 1 ligne = 1 papier
  (titre / journal matché / date / statut / auteurs / flag « nouveau journal » / flag « doublon possible »).
- L'utilisateur corrige et valide avant toute écriture.

### 3. Écriture — script one-shot

Fichier : `scripts/audit-in-submission.ts`

- Contient le **dataset validé en dur** (tableau typé, pas de `any`) : ~24 papiers issus de
  l'audit Gmail (`scratchpad/audit-inventory.md`).
- Pour chaque papier :
  1. `Article` créé avec le statut adéquat (`UNDER_REVIEW`, `TO_RESUBMIT`, `ACCEPTED`,
     `PUBLISHED`, `ABANDONED`), `createdById` = utilisateur admin.
  2. `Author` + `Authorship` : find-or-create par nom (match `firstName`+`lastName` insensible à la casse,
     sinon création), `order` séquentiel selon la chaîne de la soumission, `isCorresponding` posé.
  3. **Chaîne de soumissions** : chaque journal traversé = une `Submission` ordonnée par date.
     La plus récente porte le statut courant ; les journaux antérieurs (rejetés) sont `REJECTED`.
     Écrit via `addSubmission` (service existant, applique la règle « un seul actif à la fois »),
     puis `updateSubmissionStatus` pour poser le statut/décision réel de chaque soumission.
- **Mapping des statuts** (décisions validées) :
  - Rejet d'une soumission → `Submission.status = REJECTED` ; si le papier n'a pas de soumission
    active plus récente, `Article.status = TO_RESUBMIT` (le schéma `ArticleStatus` n'a pas de
    valeur `REJECTED` — le rejet vit au niveau `Submission`). Cf. papier #26 (rejeté JCMR, sans suite).
  - Accepté → `ACCEPTED` ; publié → `PUBLISHED` (le papier #24 publié est **inclus**).
- **Auteurs partiels** : pour les papiers sans liste ordonnée complète (emails EHJ-CVI/OUP ne
  listant que le corresponding), on ne crée que corresponding + 1er auteur ; les noms bruts
  connus vont dans `Submission.notes`. Enrichissement ultérieur via les outils auteurs.
- **Idempotent** : skip si un `Article` de titre équivalent (titre normalisé) existe déjà.
- **Additif uniquement** : aucun reset, aucune suppression (`prisma migrate reset` interdit).
- Sortie : liste des IDs créés (articles, submissions, authors) pour traçabilité/réversibilité manuelle.

### Résultat de l'audit Gmail (source du dataset)

L'audit a été réalisé sur `solenn.toupin@gmail.com` (janv.→juil. 2026) : **24 papiers distincts**,
chaînes de resoumission reconstituées (ex. #1 : EHJ-CVI → Circulation → Radiology), listes
d'auteurs ordonnées pour 18 papiers. Détail complet et validé dans `scratchpad/audit-inventory.md`
(à recopier dans le dataset du script). Répartition : 16 `UNDER_REVIEW`, 3 `TO_RESUBMIT`,
2 `ACCEPTED`, 1 `PUBLISHED`, 1 rejeté sans suite (#26), 1 review publiée incluse (#24).

### 4. Saisie continue (existant, quasi aucun code)

Le flux « New publication » (`createDraftArticleAction`) → éditeur → ajout d'une soumission
(journal + date) couvre déjà les étudiants/admins. Vérifier qu'un étudiant peut amener un
papier directement en `UNDER_REVIEW` sans friction ; micro-ajustement seulement si besoin.

### 5. Browse admin — retouche `ArticlesList`

`app/[locale]/publications/components/articles-list.tsx` affiche la colonne « Journal » via
`publishedJournal?.name`, vide pour un papier en vol (le journal est dans la `Submission`).

- Ajouter un **fallback** : colonne Journal → journal de la soumission courante quand pas de
  journal publié ; colonne Année → année de `submittedAt`.
- Nécessite d'exposer la soumission courante dans `ArticleListItem` (`listArticles`) :
  dernière soumission active (journal + `submittedAt`).
- Les papiers en cours deviennent alors filtrables via le filtre statut déjà présent
  (`UNDER_REVIEW`, `TO_RESUBMIT`).

## Tests

- **Test unitaire** de la fonction d'écriture de l'audit sur base de test :
  - idempotence (relancer ne duplique pas),
  - dédup titre+journal,
  - création/réutilisation des auteurs et de l'authorship,
  - pose correcte du statut de soumission (décision déjà reçue vs non).
- Pas de test E2E dédié : l'extraction est hors app et one-shot ; le browse est déjà couvert.

## Règles d'extraction (validées sur échantillon Gmail)

**Emails à inclure** (nos soumissions) — sujet/corps :
`Manuscript Submitted`, `Acknowledgment of Submission`, `listed as co-author`,
`Confirm co-authorship`, `manuscript number has been assigned`, `Decision on submission`,
`verify your contribution`, `Co-author confirmation`, formulaires `rights`/`copyright`.
Expéditeurs : `manuscriptcentral.com`, `editorialmanager.com`, `msubmit.net`,
`aha-journals.org`, `springernature.com`, `researchexchange.com`.

**Emails à exclure** (bruit) :
`Invitation to review` / `Reminder of Invitation` / `Withdrawal of Invitation` (rôle relecteur,
pas auteur), newsletters/marketing, `Call for Abstracts`, propositions d'étude
(`cardiolarib-research.com`, EACVI-MMVD/INFLAME), contrats, threads de discussion internes.

**Déduplication** : 1 titre normalisé (insensible casse/espaces/ponctuation) = 1 `Article`.
Chaque journal distinct = 1 `Submission` (date + ID manuscrit dans `notes` + statut).
Un rejet suivi d'une resoumission ailleurs → l'ancienne `Submission` passe `REJECTED`,
la nouvelle devient active. **Dédup par titre, jamais par journal** (un papier traverse
plusieurs journaux : ex. Circulation → Radiology, Eur Radiology → JMRI).

**Mapping statut** :
- `Manuscript Submitted` / `Acknowledgment` / `number assigned` → Submission `UNDER_REVIEW`, Article `UNDER_REVIEW`
- `Decision` (minor/major revision) ou suffixe `Rx` (ex. `R2`) → `TO_RESUBMIT`
- formulaire copyright/rights ou « accepté » → Article `ACCEPTED` (inclus dans l'audit)

**Auteurs** : liste ordonnée extraite du **corps** de l'email (fallback entêtes To/Cc) ;
1er nommé / « Dear Dr X » = corresponding. Noms bruts conservés dans `Submission.notes`.

**Date de soumission** : date de l'email de soumission/acknowledgment, ou date « received »
mentionnée dans le corps.

## Hors périmètre

- Scraping automatique des portails de journaux.
- Système d'extraction LLM intégré à l'app (rejeté : coût + maintenance pour un gain one-shot).
- Enrichissement fin des auteurs (affiliations, ORCID, centres).
- Migration de schéma Prisma.

## Décisions verrouillées

- Approche **A** (IA one-shot + flux continu existant), pas d'extracteur LLM in-app.
- Auteurs **inclus** dans l'audit (best effort depuis les emails).
- Écriture via **script one-shot relu**, pas d'écran d'import dédié.
- La liste apparaît dans l'admin publications via le **browse articles existant** (avec fallback journal).
