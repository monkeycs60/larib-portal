# Audit des papiers en cours de soumission — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Écrire en base les ~24 papiers en cours de soumission collectés lors de l'audit Gmail, et les rendre visibles dans le browse admin (`/publications/admin/articles`).

**Architecture:** Un service `audit-import.ts` sépare la logique pure (normalisation de titre, split de nom, déduplication — testée sans DB) de l'écriture Prisma (`importAuditPapers`). Un script one-shot `scripts/audit-in-submission.ts` charge le dataset validé (source : `scratchpad/audit-inventory.md`) et appelle le service. Le browse admin existant (`ArticlesList`) est étendu pour afficher le journal/année de la soumission courante quand le papier n'a pas de journal publié.

**Tech Stack:** TypeScript, Prisma (`@/lib/prisma`, types `@/app/generated/prisma`), Vitest (tests unitaires purs), tsx (exécution du script), Next.js/React + next-intl (browse).

**Source de données (à recopier tel quel) :** `scratchpad/audit-inventory.md` — 24 papiers avec chaînes de journaux, dates, statuts, auteurs ordonnés. C'est la vérité de référence pour le dataset de la Task 5.

---

## File Structure

- **Create** `lib/services/publications/audit-import.ts` — types `AuditPaper`/`AuditAuthorInput`/`AuditSubmission`, helpers purs (`normalizeTitle`, `splitAuthorName`, `planAuditWrite`), writer `importAuditPapers`.
- **Create** `lib/services/publications/audit-import.test.ts` — tests unitaires des helpers purs.
- **Create** `scripts/audit-in-submission.data.ts` — le dataset typé (`AuditPaper[]`), recopié depuis l'inventaire.
- **Create** `scripts/audit-in-submission.ts` — runner : résout l'utilisateur admin, appelle `importAuditPapers`, log le rapport.
- **Modify** `lib/services/publications/articles.ts` — `ArticleListItem` + `listArticles` incluent la soumission la plus récente (journal + date).
- **Modify** `app/[locale]/publications/components/articles-list.tsx` — colonnes Journal/Année + recherche avec fallback sur la soumission courante.
- **Modify** `package.json` — script npm `audit:submissions`.

**Conventions vérifiées dans le codebase :**
- Prisma : `import { prisma } from '@/lib/prisma'` ; types via `import { Prisma } from '@/app/generated/prisma'`.
- `ArticleStatusValue` exporté par `lib/services/publications/articles.ts`.
- `SubmissionStatusValue` exporté par `lib/publications/status-display.ts` (valeurs : `UNDER_REVIEW`, `MINOR_REVISIONS`, `MAJOR_REVISIONS`, `ACCEPTED`, `REJECTED`, `SUBMITTED`).
- Tests unitaires purs : voir `lib/services/publications/import-dedupe.test.ts` (pattern `describe`/`it`/`expect`, aucun accès DB). Lancés par `npm run test:unit` (`vitest run`).

---

### Task 1: Helpers purs du service d'audit (TDD)

**Files:**
- Create: `lib/services/publications/audit-import.ts`
- Test: `lib/services/publications/audit-import.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/services/publications/audit-import.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeTitle, splitAuthorName, planAuditWrite, type AuditPaper } from './audit-import'

function paper(title: string): AuditPaper {
  return { title, articleStatus: 'UNDER_REVIEW', authors: [], submissions: [] }
}

describe('normalizeTitle', () => {
  it('ignores case, punctuation and spacing', () => {
    expect(normalizeTitle('The HCM-LGE Risk Score.')).toBe(normalizeTitle('the hcm lge risk score'))
  })
})

describe('splitAuthorName', () => {
  it('splits last token as lastName', () => {
    expect(splitAuthorName('Jeremy Florence')).toEqual({ firstName: 'Jeremy', lastName: 'Florence' })
  })
  it('puts particles in firstName (known best-effort limitation)', () => {
    expect(splitAuthorName('Elsa Richard de Vesvrotte')).toEqual({ firstName: 'Elsa Richard de', lastName: 'Vesvrotte' })
  })
  it('handles a single token', () => {
    expect(splitAuthorName('Pezel')).toEqual({ firstName: '', lastName: 'Pezel' })
  })
})

describe('planAuditWrite', () => {
  it('skips papers whose normalized title already exists', () => {
    const plan = planAuditWrite(['The HCM-LGE Risk Score'], [paper('the hcm lge risk score'), paper('New Paper')])
    expect(plan.toCreate.map((entry) => entry.title)).toEqual(['New Paper'])
    expect(plan.skipped.map((entry) => entry.title)).toEqual(['the hcm lge risk score'])
  })
  it('skips intra-batch duplicates', () => {
    const plan = planAuditWrite([], [paper('Same Title'), paper('same title')])
    expect(plan.toCreate).toHaveLength(1)
    expect(plan.skipped).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- audit-import`
Expected: FAIL — `Cannot find module './audit-import'` / exports undefined.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/services/publications/audit-import.ts
import type { SubmissionStatusValue } from '@/lib/publications/status-display'
import type { ArticleStatusValue } from './articles'

export type AuditAuthorInput = { name: string; isCorresponding?: boolean }
export type AuditSubmission = { journalName: string; submittedAt: string; status: SubmissionStatusValue }
export type AuditPaper = {
  title: string
  articleStatus: ArticleStatusValue
  authors: AuditAuthorInput[]
  submissions: AuditSubmission[]
  notes?: string
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function splitAuthorName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: '', lastName: parts[0] }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

export type AuditPlan = { toCreate: AuditPaper[]; skipped: { title: string }[] }

export function planAuditWrite(existingTitles: string[], papers: AuditPaper[]): AuditPlan {
  const existing = new Set(existingTitles.map(normalizeTitle))
  const seen = new Set<string>()
  const toCreate: AuditPaper[] = []
  const skipped: { title: string }[] = []
  for (const paper of papers) {
    const key = normalizeTitle(paper.title)
    if (existing.has(key) || seen.has(key)) {
      skipped.push({ title: paper.title })
      continue
    }
    seen.add(key)
    toCreate.push(paper)
  }
  return { toCreate, skipped }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- audit-import`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/publications/audit-import.ts lib/services/publications/audit-import.test.ts
git commit -m "feat(publications): audit-import pure helpers (normalize, split, dedup plan)"
```

---

### Task 2: Writer Prisma `importAuditPapers`

**Files:**
- Modify: `lib/services/publications/audit-import.ts`

Écrit chaque papier retenu : `Article` → `Author`/`Authorship` (find-or-create insensible à la casse, ordre séquentiel, corresponding) → chaîne de `Submission` (statut explicite par soumission ; les journaux antérieurs portent leur vrai statut, ex. `REJECTED`). Additif uniquement, aucune suppression.

- [ ] **Step 1: Ajouter le writer à la fin de `audit-import.ts`**

```ts
import { prisma } from '@/lib/prisma'

export type AuditReport = { createdArticleIds: string[]; skippedTitles: string[]; authorsCreated: number }

async function upsertJournalId(journalName: string): Promise<string> {
  const name = journalName.trim()
  const journal = await prisma.journal.upsert({ where: { name }, update: {}, create: { name }, select: { id: true } })
  return journal.id
}

async function findOrCreateAuthorId(input: AuditAuthorInput, counter: { created: number }): Promise<string> {
  const { firstName, lastName } = splitAuthorName(input.name)
  const found = await prisma.author.findFirst({
    where: {
      firstName: { equals: firstName, mode: 'insensitive' },
      lastName: { equals: lastName, mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (found) return found.id
  const created = await prisma.author.create({ data: { firstName, lastName }, select: { id: true } })
  counter.created += 1
  return created.id
}

export async function importAuditPapers(papers: AuditPaper[], createdById: string): Promise<AuditReport> {
  const existing = await prisma.article.findMany({ select: { title: true } })
  const plan = planAuditWrite(existing.map((article) => article.title), papers)
  const createdArticleIds: string[] = []
  const counter = { created: 0 }

  for (const paper of plan.toCreate) {
    const article = await prisma.article.create({
      data: { title: paper.title, status: paper.articleStatus, createdById },
      select: { id: true },
    })

    for (const [index, author] of paper.authors.entries()) {
      const authorId = await findOrCreateAuthorId(author, counter)
      await prisma.authorship.create({
        data: { articleId: article.id, authorId, order: index + 1, isCorresponding: author.isCorresponding ?? false },
      })
    }

    for (const submission of paper.submissions) {
      const journalId = await upsertJournalId(submission.journalName)
      await prisma.submission.create({
        data: {
          articleId: article.id,
          journalId,
          submittedAt: new Date(submission.submittedAt),
          status: submission.status,
          notes: paper.notes ?? null,
        },
      })
    }

    createdArticleIds.push(article.id)
  }

  return { createdArticleIds, skippedTitles: plan.skipped.map((entry) => entry.title), authorsCreated: counter.created }
}
```

- [ ] **Step 2: Vérifier que le projet typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (aucune erreur de type introduite).

- [ ] **Step 3: Vérifier que les tests unitaires passent toujours**

Run: `npm run test:unit -- audit-import`
Expected: PASS (les 6 tests de la Task 1, inchangés).

- [ ] **Step 4: Commit**

```bash
git add lib/services/publications/audit-import.ts
git commit -m "feat(publications): importAuditPapers writer (article + authors + submission chain)"
```

---

### Task 3: Exposer la soumission courante dans `listArticles`

**Files:**
- Modify: `lib/services/publications/articles.ts:9-36`

Ajoute la soumission la plus récente (journal + date) à `ArticleListItem` et `listArticles`, pour que le browse affiche un journal même sans `publishedJournal`.

- [ ] **Step 1: Étendre le type `ArticleListItem`**

Dans `lib/services/publications/articles.ts`, remplacer le bloc `select` du type `ArticleListItem` (lignes 10-19) pour ajouter `submissions` :

```ts
export type ArticleListItem = Prisma.ArticleGetPayload<{
  select: {
    id: true
    title: true
    status: true
    publishedAt: true
    doi: true
    pubmedId: true
    publishedJournal: { select: { name: true } }
    submissions: { select: { submittedAt: true; journal: { select: { name: true } } } }
    _count: { select: { authorships: true } }
  }
}>
```

- [ ] **Step 2: Étendre la requête `listArticles`**

Remplacer le `select` de `listArticles` (lignes 25-34) pour récupérer la dernière soumission :

```ts
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      doi: true,
      pubmedId: true,
      publishedJournal: { select: { name: true } },
      submissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: { submittedAt: true, journal: { select: { name: true } } },
      },
      _count: { select: { authorships: true } },
    },
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/services/publications/articles.ts
git commit -m "feat(publications): expose latest submission (journal+date) in article list"
```

---

### Task 4: Fallback Journal/Année dans le browse admin

**Files:**
- Modify: `app/[locale]/publications/components/articles-list.tsx:18-24` (filtre) et `:58-59` (cellules)

- [ ] **Step 1: Ajouter un helper de soumission courante et l'utiliser dans le filtre**

Dans `articles-list.tsx`, remplacer le corps du `useMemo` (lignes 18-24) pour que la recherche prenne aussi en compte le journal de la soumission courante :

```tsx
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return articles.filter((article) => {
      if (status && article.status !== status) return false
      if (!needle) return true
      const journalName = article.publishedJournal?.name ?? article.submissions[0]?.journal.name ?? ''
      return article.title.toLowerCase().includes(needle) || journalName.toLowerCase().includes(needle)
    })
  }, [articles, query, status])
```

- [ ] **Step 2: Fallback dans les cellules Journal et Année**

Remplacer les deux cellules (lignes 58-59) :

```tsx
              <TableCell>{article.publishedJournal?.name ?? article.submissions[0]?.journal.name ?? '—'}</TableCell>
              <TableCell>
                {article.publishedAt
                  ? new Date(article.publishedAt).getFullYear()
                  : article.submissions[0]?.submittedAt
                    ? new Date(article.submissions[0].submittedAt).getFullYear()
                    : '—'}
              </TableCell>
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/publications/components/articles-list.tsx
git commit -m "feat(publications): browse falls back to current submission journal/year"
```

---

### Task 5: Dataset de l'audit + runner script

**Files:**
- Create: `scripts/audit-in-submission.data.ts`
- Create: `scripts/audit-in-submission.ts`
- Modify: `package.json` (bloc `scripts`)

- [ ] **Step 1: Créer le dataset typé**

Créer `scripts/audit-in-submission.data.ts`. Recopier les **24 papiers** depuis `scratchpad/audit-inventory.md` en respectant EXACTEMENT ce type (chaîne `submissions` ordonnée du plus ancien au plus récent ; journaux antérieurs rejetés = `REJECTED` ; le plus récent porte le statut courant). Deux entrées de référence complètes :

```ts
// scripts/audit-in-submission.data.ts
import type { AuditPaper } from '@/lib/services/publications/audit-import'

export const AUDIT_PAPERS: AuditPaper[] = [
  {
    title: 'Cardiovascular Magnetic Resonance Late Gadolinium Enhancement Risk Score for Mortality in Patients with Hypertrophic Cardiomyopathy: the HCM-LGE Risk Score',
    articleStatus: 'ACCEPTED',
    authors: [
      { name: 'Jeremy Florence', isCorresponding: true },
      { name: 'Jérôme Garot' },
      { name: 'Alexandre Unger' },
      { name: 'Solenn Toupin' },
      { name: 'Suzanne Duhamel' },
      { name: 'Francesca Sanguineti' },
      { name: 'Mariama Akodad' },
      { name: 'Thomas Hovasse' },
      { name: 'Stephane Champagne' },
      { name: 'Thierry Unterseeh' },
      { name: 'Antoinette Neylon' },
      { name: 'Alexis Hermida' },
      { name: 'Nicolas Martin' },
      { name: 'Julien Hudelo' },
      { name: 'Trecy Gonçalves' },
      { name: 'Aïcha Kante' },
      { name: 'Antoine Lequipar' },
      { name: 'Jean-Guillaume Dillinger' },
      { name: 'Valérie Bousson' },
      { name: 'Philippe Garot' },
      { name: 'Yohann Bohbot' },
      { name: 'Théo Pezel' },
    ],
    submissions: [
      { journalName: 'European Heart Journal - Cardiovascular Imaging', submittedAt: '2026-01-20', status: 'REJECTED' },
      { journalName: 'Circulation: Cardiovascular Imaging', submittedAt: '2026-05-27', status: 'REJECTED' },
      { journalName: 'Radiology', submittedAt: '2026-07-01', status: 'ACCEPTED' },
    ],
  },
  {
    // Papier #26 : rejeté à JCMR, aucune resoumission connue.
    title: 'Optimal cut-off point of left ventricular ejection fraction for prediction of mortality in end-stage hypertrophic cardiomyopathy',
    articleStatus: 'TO_RESUBMIT',
    authors: [{ name: 'Julien Hudelo', isCorresponding: true }, { name: 'Yohann Bohbot' }],
    submissions: [
      { journalName: 'Journal of Cardiovascular Magnetic Resonance', submittedAt: '2026-01-15', status: 'REJECTED' },
    ],
    notes: 'Rejeté JCMR 17-fév-2026, pas de resoumission trouvée. Auteurs partiels (corresponding + 1er).',
  },
  // … recopier les 22 autres papiers depuis scratchpad/audit-inventory.md.
  // Rappels de mapping :
  //  - 6 papiers (#3,10,19,21,23) : ne mettre que corresponding + 1er auteur connus, reste en notes.
  //  - #13 : corresponding = Jérôme Garot, 1re autrice = Sonia Houssany-Pissot, articleStatus 'ACCEPTED'.
  //  - #24 : review publiée, articleStatus 'PUBLISHED'.
  //  - #15 et #16 : deux Articles distincts.
]
```

- [ ] **Step 2: Créer le runner**

Créer `scripts/audit-in-submission.ts`. Il résout l'utilisateur créateur via l'e-mail passé en variable d'environnement `AUDIT_CREATED_BY_EMAIL` (échoue clairement si absent/introuvable), puis écrit et logue le rapport.

```ts
// scripts/audit-in-submission.ts
import { prisma } from '@/lib/prisma'
import { importAuditPapers } from '@/lib/services/publications/audit-import'
import { AUDIT_PAPERS } from './audit-in-submission.data'

async function main() {
  const email = process.env.AUDIT_CREATED_BY_EMAIL
  if (!email) throw new Error('Set AUDIT_CREATED_BY_EMAIL to the email of the admin user creating these records.')

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) throw new Error(`No user found with email ${email}.`)

  const report = await importAuditPapers(AUDIT_PAPERS, user.id)
  console.log(`Created ${report.createdArticleIds.length} articles, ${report.authorsCreated} new authors.`)
  console.log(`Skipped ${report.skippedTitles.length} already-present titles:`)
  for (const title of report.skippedTitles) console.log(`  - ${title}`)
  console.log('Created article IDs:', report.createdArticleIds.join(', '))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

- [ ] **Step 3: Ajouter le script npm**

Dans `package.json`, ajouter dans `"scripts"` (après `"test:check-passwords"`) :

```json
    "audit:submissions": "tsx scripts/audit-in-submission.ts"
```

- [ ] **Step 4: Vérifier le typecheck (le dataset compile contre `AuditPaper`)**

Run: `npx tsc --noEmit`
Expected: PASS. Toute faute de statut (ex. `SubmissionStatus` invalide) échoue ici.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit-in-submission.data.ts scripts/audit-in-submission.ts package.json
git commit -m "feat(publications): audit dataset + one-shot import runner"
```

---

### Task 6: Exécution one-shot + vérification

**Files:** aucun (exécution).

- [ ] **Step 1: Lancer le script sur la base de dev**

Run: `AUDIT_CREATED_BY_EMAIL=serizay.clem@gmail.com npm run audit:submissions`
(Remplacer par l'e-mail réel d'un utilisateur admin PUBLICATIONS présent en base.)
Expected: log « Created N articles … », N ≈ 24, et la liste des IDs.

- [ ] **Step 2: Vérifier en base (compte des articles en vol)**

Run:
```bash
npx tsx -e "import {prisma} from '@/lib/prisma'; prisma.article.count({where:{status:{in:['UNDER_REVIEW','TO_RESUBMIT']}}}).then((n)=>{console.log('in-flight articles:',n);return prisma.\$disconnect()})"
```
Expected: un nombre ≥ 19 (les papiers en cours). Si 0, le script n'a pas écrit — investiguer avant de continuer.

- [ ] **Step 3: Vérifier le browse admin**

Ouvrir `/publications/admin/articles`, filtrer par statut « Under review » puis « To resubmit ». Attendu : les papiers de l'audit apparaissent avec un **journal** (soumission courante) et une **année** non vides, et le compte d'auteurs > 0 pour les papiers à liste complète.

- [ ] **Step 4: Vérifier l'idempotence**

Relancer : `AUDIT_CREATED_BY_EMAIL=<email> npm run audit:submissions`
Expected: « Created 0 articles » et tous les titres en « Skipped » (dédup par titre normalisé). Aucun doublon créé.

- [ ] **Step 5: Commit (si le dataset a été ajusté pendant l'exécution)**

```bash
git add scripts/audit-in-submission.data.ts
git commit -m "chore(publications): finalize audit dataset after one-shot run"
```

---

## Notes d'exécution

- **Ne jamais** utiliser `prisma migrate reset` (interdit projet). Le script est purement additif.
- Après une éventuelle migration Prisma antérieure, redémarrer `npm run dev` (client en mémoire obsolète sinon).
- Les papiers à liste d'auteurs partielle (#3, #10, #19, #21, #23) sont volontairement incomplets : enrichissement ultérieur via les outils auteurs existants, hors périmètre de ce plan.
