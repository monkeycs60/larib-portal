# Publications B4 — Affiliations & Centres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distill the noisy per-paper PubMed affiliation strings into (a) deduplicated **Affiliations** (clean lines for the numbered author block) and (b) curated **Centres** (stable institutions/sites, e.g. *Lariboisière – APHP*), auto-guessed by heuristic then curated by an admin (rename, merge, flag "our centre"). Populate affiliations for the already-imported 163 papers (backfill) and for future imports.

**Architecture:** New `Centre` model; `Affiliation` gains `centreId` + `raw`, loses its `@unique(name)` (raw strings are long / dedup done in code). A **pure** `guessCentre` heuristic (keyword map + fallback) is unit-tested. Import (`import.ts`) and a **backfill** service create `Affiliation` + `AuthorshipAffiliation` (per-paper, ordered) and assign a `Centre`. A Centres bank UI (list, rename, merge, toggle `isOwn`) mirrors the B3 authors bank.

**Tech Stack:** Next.js 15, Prisma (migration + transactions), next-safe-action, raw RHF + `useAction` + sonner, shadcn/ui, next-intl, vitest (pure heuristic), Playwright.

Spec: `docs/superpowers/specs/2026-07-07-publications-pubmed-banks-design.md` §10 (B4). Depends on B1 (import), B3 (authors bank patterns).

---

## File Structure

- Modify: `prisma/schema.prisma` — new `Centre`; `Affiliation` +`centreId`/`raw`, −`@unique(name)`; migration.
- Create: `lib/services/publications/centre-extract.ts` (**pure**) + `centre-extract.test.ts` — `guessCentre(raw)`.
- Modify: `lib/services/publications/import.ts` — upsert affiliations + centre + `AuthorshipAffiliation` during import.
- Create: `lib/services/publications/affiliations.ts` — `upsertAffiliationWithCentre`, `backfillAffiliations`, `PUBLICATIONS_CENTRES_TAG`.
- Create: `lib/services/publications/centres.ts` — `listCentres`, `renameCentre`, `mergeCentres`, `setCentreOwn`, `deleteCentre`.
- Modify: `app/[locale]/publications/actions.ts` — `backfillAffiliationsAction`, `renameCentreAction`, `mergeCentresAction`, `setCentreOwnAction`, `deleteCentreAction`.
- Create: `app/[locale]/publications/components/centres-manager.tsx` (client) — table, rename dialog, merge, isOwn toggle.
- Create: `app/[locale]/publications/admin/centres/page.tsx` — server page (gated).
- Modify: `app/[locale]/publications/admin/page.tsx` — add "Backfill affiliations" button + link to centres.
- Modify: `messages/en.json`, `messages/fr.json` — `publications.centres.*`.
- Create: `tests/e2e/publications-centres.spec.ts`.

**Verification:** `npx tsc --noEmit`, `npm run test:unit`, `npx prisma migrate dev`/`migrate deploy` (dev + testdb), `npm run test:seed`, `npx playwright test` (testdb+`PUBMED_FIXTURE_DIR` server on 3100 + temp config — M1/B1/B3 pattern). Never `migrate reset`.

---

## Task 1: Data model — Centre + Affiliation changes + migration

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add the `Centre` model** (near the other publications models):

```prisma
model Centre {
  id        String   @id @default(cuid())
  name      String   @unique
  city      String?
  country   String?
  isOwn     Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  affiliations Affiliation[]

  @@map("Centre")
}
```

- [ ] **Step 2: Change `Affiliation`** — remove `@unique` from `name`, add `raw` + `centreId`/relation. Replace the model with:

```prisma
model Affiliation {
  id          String   @id @default(cuid())
  name        String
  raw         String?
  institution String?
  department  String?
  city        String?
  country     String?
  centreId    String?
  centre      Centre?  @relation(fields: [centreId], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  authorshipAffiliations AuthorshipAffiliation[]
  defaultOfAuthors       Author[]                @relation("AuthorDefaultAffiliation")

  @@index([name])
  @@map("Affiliation")
}
```

- [ ] **Step 3: Migrate dev + testdb + generate.**

Run: `npx prisma migrate dev --name add_centres_and_affiliation_centre`
Then: `node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"`
Expected: `Centre` table + `Affiliation.raw`/`centreId` columns on both DBs; `Affiliation_name_key` unique dropped.

- [ ] **Step 4: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS — existing code doesn't reference the new fields yet)
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(publications): add Centre model + Affiliation.centreId/raw (migration)"
```

---

## Task 2: Centre extraction heuristic (pure) — TDD

**Files:** Create `lib/services/publications/centre-extract.ts`, `lib/services/publications/centre-extract.test.ts`

- [ ] **Step 1: Write the failing test** `lib/services/publications/centre-extract.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { guessCentre } from './centre-extract'

describe('guessCentre', () => {
  it('maps known institutions via keywords', () => {
    expect(guessCentre('CMR Lab, Hopital Lariboisiere, APHP, Paris, France')).toBe('Lariboisière – APHP')
    expect(guessCentre('Institut Cardiovasculaire Paris Sud, Hôpital Privé Jacques Cartier, Massy, France')).toBe('Institut Cardiovasculaire Paris Sud')
  })
  it('falls back to the first segment when no keyword matches', () => {
    expect(guessCentre('Department of Cardiology, Some Unknown Hospital, Berlin, Germany')).toBe('Department of Cardiology')
  })
  it('returns Unknown for empty input', () => {
    expect(guessCentre('')).toBe('Unknown')
  })
})
```

- [ ] **Step 2: Run — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/services/publications/centre-extract.ts`:**

```ts
type CentreRule = { match: RegExp; centre: string }

// Curated keyword map for the team's known centres. Extend as curation reveals more.
const CENTRE_RULES: CentreRule[] = [
  { match: /lariboisi[eè]re/i, centre: 'Lariboisière – APHP' },
  { match: /institut cardiovasculaire paris sud|\bICPS\b|jacques cartier|ramsay/i, centre: 'Institut Cardiovasculaire Paris Sud' },
  { match: /bichat/i, centre: 'Bichat – APHP' },
  { match: /piti[eé][- ]salp[eê]tri[eè]re/i, centre: 'Pitié-Salpêtrière – APHP' },
  { match: /pompidou|\bHEGP\b/i, centre: 'HEGP – APHP' },
]

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function guessCentre(rawAffiliation: string): string {
  const raw = rawAffiliation.trim()
  if (!raw) return 'Unknown'
  const haystack = stripDiacritics(raw)
  for (const rule of CENTRE_RULES) {
    if (rule.match.test(haystack) || rule.match.test(raw)) return rule.centre
  }
  return raw.split(',')[0].trim() || 'Unknown'
}
```

- [ ] **Step 4: Run — verify it passes.**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/services/publications/centre-extract.ts lib/services/publications/centre-extract.test.ts
git commit -m "feat(publications): centre extraction heuristic with unit tests"
```

---

## Task 3: Affiliation upsert + centre wiring (service)

**Files:** Create `lib/services/publications/affiliations.ts`

- [ ] **Step 1: Implement `lib/services/publications/affiliations.ts`:**

```ts
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/app/generated/prisma'
import { guessCentre } from './centre-extract'

export const PUBLICATIONS_CENTRES_TAG = 'publications:centres'
export const PUBLICATIONS_AFFILIATIONS_TAG = 'publications:affiliations'

type Tx = Prisma.TransactionClient

async function upsertCentre(tx: Tx, name: string, report: { centresCreated: number }): Promise<string> {
  const existing = await tx.centre.findFirst({ where: { name }, select: { id: true } })
  if (existing) return existing.id
  const created = await tx.centre.create({ data: { name }, select: { id: true } })
  report.centresCreated += 1
  return created.id
}

export async function upsertAffiliationWithCentre(
  tx: Tx,
  raw: string,
  report: { affiliationsCreated: number; centresCreated: number },
): Promise<string | null> {
  const name = raw.trim()
  if (!name) return null
  const existing = await tx.affiliation.findFirst({ where: { name }, select: { id: true } })
  if (existing) return existing.id
  const centreId = await upsertCentre(tx, guessCentre(name), report)
  const created = await tx.affiliation.create({ data: { name, raw: name, centreId }, select: { id: true } })
  report.affiliationsCreated += 1
  return created.id
}

export type BackfillReport = { articlesTouched: number; affiliationsCreated: number; centresCreated: number; links: number }

// Backfill affiliations for already-imported articles, matching PubMed authors to authorships by order.
export async function backfillAffiliations(
  records: Array<{ pmid: string; authors: Array<{ affiliation: string | null }> }>,
): Promise<BackfillReport> {
  const report: BackfillReport = { articlesTouched: 0, affiliationsCreated: 0, centresCreated: 0, links: 0 }
  for (const record of records) {
    const article = await prisma.article.findFirst({
      where: { pubmedId: record.pmid },
      select: { id: true, authorships: { select: { id: true, order: true }, orderBy: { order: 'asc' } } },
    })
    if (!article) continue
    let touched = false
    await prisma.$transaction(async (tx) => {
      for (const authorship of article.authorships) {
        const pubmedAuthor = record.authors[authorship.order - 1]
        const raw = pubmedAuthor?.affiliation?.trim()
        if (!raw) continue
        const existingLink = await tx.authorshipAffiliation.findFirst({ where: { authorshipId: authorship.id }, select: { authorshipId: true } })
        if (existingLink) continue
        const affiliationId = await upsertAffiliationWithCentre(tx, raw, report)
        if (!affiliationId) continue
        await tx.authorshipAffiliation.create({ data: { authorshipId: authorship.id, affiliationId, order: 1 } })
        report.links += 1
        touched = true
      }
    })
    if (touched) report.articlesTouched += 1
  }
  return report
}
```

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add lib/services/publications/affiliations.ts
git commit -m "feat(publications): affiliation+centre upsert and backfill service"
```

---

## Task 4: Backfill action + button + i18n

**Files:** Modify `app/[locale]/publications/actions.ts`, `app/[locale]/publications/admin/page.tsx`, `app/[locale]/publications/components/backlog-import.tsx`, `messages/*.json`

- [ ] **Step 1: Add the backfill action** to `app/[locale]/publications/actions.ts`:

```ts
import { backfillAffiliations, PUBLICATIONS_CENTRES_TAG, PUBLICATIONS_AFFILIATIONS_TAG } from '@/lib/services/publications/affiliations'

export const backfillAffiliationsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ anchor: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const candidates = await searchByAuthor(parsedInput.anchor, 500)
    const records = await fetchByPmids(candidates.map((candidate) => candidate.pmid))
    const report = await backfillAffiliations(records)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    revalidateTag(PUBLICATIONS_AFFILIATIONS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return report
  })
```

- [ ] **Step 2: i18n** — add to the `publications` object in both `messages/en.json` and `messages/fr.json` a `centres` block (EN shown; mirror in FR):

```json
    "centres": {
      "title": "Centres",
      "subtitle": "Curate the institutions behind author affiliations.",
      "backfill": "Import affiliations from PubMed",
      "backfilling": "Importing affiliations…",
      "backfillDone": "{articles} articles updated, {affiliations} affiliations, {centres} centres.",
      "search": "Search centres…",
      "colName": "Centre",
      "colOwn": "Our centre",
      "colAffiliations": "Affiliations",
      "colActions": "Actions",
      "rename": "Rename",
      "renameTitle": "Rename centre",
      "name": "Name",
      "save": "Save",
      "cancel": "Cancel",
      "merge": "Merge selected",
      "mergeTitle": "Merge centres",
      "mergeChooseKeeper": "Choose the centre to keep.",
      "mergeConfirm": "Merge",
      "delete": "Delete",
      "deleteConfirm": "Delete this centre?",
      "deleteConfirmDesc": "Affiliations keep their data but lose the centre link.",
      "selected": "{count} selected",
      "renamed": "Centre renamed",
      "merged": "Centres merged",
      "deleted": "Centre deleted",
      "ownSet": "Updated",
      "manageLink": "Manage centres"
    }
```

FR values: `title` "Centres", `subtitle` "Curez les institutions derrière les affiliations.", `backfill` "Importer les affiliations depuis PubMed", `backfilling` "Import des affiliations…", `backfillDone` "{articles} articles mis à jour, {affiliations} affiliations, {centres} centres.", `search` "Rechercher un centre…", `colName` "Centre", `colOwn` "Notre centre", `colAffiliations` "Affiliations", `colActions` "Actions", `rename` "Renommer", `renameTitle` "Renommer le centre", `name` "Nom", `save` "Enregistrer", `cancel` "Annuler", `merge` "Fusionner la sélection", `mergeTitle` "Fusionner des centres", `mergeChooseKeeper` "Choisissez le centre à conserver.", `mergeConfirm` "Fusionner", `delete` "Supprimer", `deleteConfirm` "Supprimer ce centre ?", `deleteConfirmDesc` "Les affiliations gardent leurs données mais perdent le lien au centre.", `selected` "{count} sélectionné(s)", `renamed` "Centre renommé", `merged` "Centres fusionnés", `deleted` "Centre supprimé", `ownSet` "Mis à jour", `manageLink` "Gérer les centres".

- [ ] **Step 3: Add a "Backfill affiliations" button** to `app/[locale]/publications/components/backlog-import.tsx`. Add `useAction(backfillAffiliationsAction, …)` and, next to the Search button, a button that calls `runBackfill({ anchor })` and toasts `t('centres.backfillDone', {...})`. (Import `backfillAffiliationsAction` from `../actions`.)

```tsx
const { execute: runBackfill, isExecuting: backfilling } = useAction(backfillAffiliationsAction, {
  onSuccess({ data }) { if (data) toast.success(t('centres.backfillDone', { articles: data.articlesTouched, affiliations: data.affiliationsCreated, centres: data.centresCreated })) },
  onError() { toast.error(t('import.importError')) },
})
```
```tsx
<Button variant="outline" onClick={() => runBackfill({ anchor })} disabled={backfilling || anchor.trim().length === 0}>
  {backfilling ? t('centres.backfilling') : t('centres.backfill')}
</Button>
```
And add a link to the centres bank on `app/[locale]/publications/admin/page.tsx` (mirror the authors link): `<Link href="/publications/admin/centres">{t('centres.manageLink')} →</Link>`.

- [ ] **Step 4: Validate JSON, type-check, commit.**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('ok')"`
Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications messages/en.json messages/fr.json
git commit -m "feat(publications): affiliation backfill action, button, and i18n"
```

---

## Task 5: New imports also create affiliations

**Files:** Modify `lib/services/publications/import.ts`

- [ ] **Step 1: Wire affiliations into `importRecords`.** Inside the per-author loop, after obtaining `authorId`, also upsert the affiliation and remember it, then include a nested `affiliations` create in the authorship. Replace the authorships-building block:

```ts
      const { upsertAffiliationWithCentre } = await import('./affiliations')
      const authorships: Array<{ authorId: string; order: number; affiliations: { create: Array<{ affiliationId: string; order: number }> } }> = []
      const seenAuthorIds = new Set<string>()
      const affReport = { affiliationsCreated: 0, centresCreated: 0 }
      for (const author of record.authors) {
        const authorId = await upsertAuthor(author, authorCache, report)
        if (seenAuthorIds.has(authorId)) continue
        seenAuthorIds.add(authorId)
        const affiliationCreate: Array<{ affiliationId: string; order: number }> = []
        if (author.affiliation) {
          const affiliationId = await prisma.$transaction((tx) => upsertAffiliationWithCentre(tx, author.affiliation as string, affReport))
          if (affiliationId) affiliationCreate.push({ affiliationId, order: 1 })
        }
        authorships.push({ authorId, order: authorships.length + 1, affiliations: { create: affiliationCreate } })
      }
```

And keep the `prisma.article.create({ data: { …, authorships: { create: authorships } } })` — Prisma nests `AuthorshipAffiliation` via the `affiliations` relation on each authorship.

> Note: this makes journals/authors/affiliations all populate on fresh imports. Existing 163 use the Task 3 backfill.

- [ ] **Step 2: Type-check + unit + commit.**

Run: `npx tsc --noEmit` (PASS); `npm run test:unit` (PASS)
```bash
git add lib/services/publications/import.ts
git commit -m "feat(publications): import affiliations+centres alongside articles"
```

---

## Task 6: Centres service + actions

**Files:** Create `lib/services/publications/centres.ts`; Modify `app/[locale]/publications/actions.ts`

- [ ] **Step 1: Implement `lib/services/publications/centres.ts`:**

```ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

export type CentreListItem = Prisma.CentreGetPayload<{
  select: { id: true; name: true; city: true; country: true; isOwn: true; _count: { select: { affiliations: true } } }
}>

export async function listCentres(): Promise<CentreListItem[]> {
  return prisma.centre.findMany({
    orderBy: [{ isOwn: 'desc' }, { affiliations: { _count: 'desc' } }, { name: 'asc' }],
    select: { id: true, name: true, city: true, country: true, isOwn: true, _count: { select: { affiliations: true } } },
  })
}

export async function renameCentre(id: string, name: string) {
  return prisma.centre.update({ where: { id }, data: { name }, select: { id: true } })
}

export async function setCentreOwn(id: string, isOwn: boolean) {
  return prisma.centre.update({ where: { id }, data: { isOwn }, select: { id: true } })
}

export async function deleteCentre(id: string) {
  return prisma.centre.delete({ where: { id }, select: { id: true } })
}

export async function mergeCentres(keepId: string, mergeIds: string[]): Promise<{ reassigned: number; deleted: number }> {
  const sources = mergeIds.filter((id) => id !== keepId)
  if (sources.length === 0) return { reassigned: 0, deleted: 0 }
  return prisma.$transaction(async (tx) => {
    const reassigned = (await tx.affiliation.updateMany({ where: { centreId: { in: sources } }, data: { centreId: keepId } })).count
    await tx.centre.deleteMany({ where: { id: { in: sources } } })
    return { reassigned, deleted: sources.length }
  })
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
```

- [ ] **Step 2: Add centre actions** to `app/[locale]/publications/actions.ts` (import from `centres.ts` and `PUBLICATIONS_CENTRES_TAG` from `affiliations.ts`):

```ts
import { renameCentre, setCentreOwn, deleteCentre, mergeCentres } from '@/lib/services/publications/centres'

export const renameCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => { const r = await renameCentre(parsedInput.id, parsedInput.name); revalidateTag(PUBLICATIONS_CENTRES_TAG); return r })

export const setCentreOwnAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), isOwn: z.boolean() }))
  .action(async ({ parsedInput }) => { const r = await setCentreOwn(parsedInput.id, parsedInput.isOwn); revalidateTag(PUBLICATIONS_CENTRES_TAG); return r })

export const mergeCentresAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ keepId: z.string().min(1), mergeIds: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => { const r = await mergeCentres(parsedInput.keepId, parsedInput.mergeIds); revalidateTag(PUBLICATIONS_CENTRES_TAG); return r })

export const deleteCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => { const r = await deleteCentre(parsedInput.id); revalidateTag(PUBLICATIONS_CENTRES_TAG); return r })
```

- [ ] **Step 3: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add lib/services/publications/centres.ts app/\[locale\]/publications/actions.ts
git commit -m "feat(publications): centres service + actions (rename/merge/own/delete)"
```

---

## Task 7: Centres bank UI + page

**Files:** Create `app/[locale]/publications/components/centres-manager.tsx`, `app/[locale]/publications/admin/centres/page.tsx`

- [ ] **Step 1: Create `centres-manager.tsx`** — a client component mirroring `authors-manager.tsx` (Task 5 of B3), with: client-side search, a row per centre showing name / `isOwn` Switch (`@/components/ui/switch`, calling `setCentreOwnAction`) / affiliation count / rename (Pencil→dialog) / delete; checkbox selection + "Merge selected" → dialog picking keeper → `mergeCentresAction`. Toasts via `t('centres.*')`. Follow the exact structure of `authors-manager.tsx` (imports, `useAction`, dialogs, AlertDialog); swap author fields for `CentreListItem` (`name`, `isOwn`, `_count.affiliations`) and the actions for the centre actions. Keep < 350 lines.

```tsx
'use client'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Trash2, GitMerge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { renameCentreAction, setCentreOwnAction, mergeCentresAction, deleteCentreAction } from '../actions'
import type { CentreListItem } from '@/lib/services/publications/centres'

const RenameSchema = z.object({ name: z.string().min(1) })
type RenameValues = z.infer<typeof RenameSchema>

export function CentresManager({ centres }: { centres: CentreListItem[] }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CentreListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CentreListItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mergeOpen, setMergeOpen] = useState(false)
  const [keepId, setKeepId] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (needle ? centres.filter((centre) => centre.name.toLowerCase().includes(needle)) : centres).slice(0, 300)
  }, [centres, query])

  const { register, handleSubmit, reset } = useForm<RenameValues>({ resolver: zodResolver(RenameSchema) })
  const { executeAsync: execRename, isExecuting: saving } = useAction(renameCentreAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execOwn } = useAction(setCentreOwnAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execMerge, isExecuting: merging } = useAction(mergeCentresAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteCentreAction, { onError() { toast.error(t('actionError')) } })

  function openRename(centre: CentreListItem) { setEditing(centre); reset({ name: centre.name }) }
  const onRename = handleSubmit(async (values) => {
    if (!editing) return
    const res = await execRename({ id: editing.id, name: values.name })
    if (!res?.data) return
    toast.success(t('centres.renamed')); setEditing(null); router.refresh()
  })
  async function toggleOwn(centre: CentreListItem) {
    const res = await execOwn({ id: centre.id, isOwn: !centre.isOwn })
    if (res?.data) { toast.success(t('centres.ownSet')); router.refresh() }
  }
  function toggle(id: string) { setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function openMerge() { setKeepId(Array.from(selected)[0] ?? ''); setMergeOpen(true) }
  async function confirmMerge() {
    const res = await execMerge({ keepId, mergeIds: Array.from(selected) })
    setMergeOpen(false); if (!res?.data) return
    toast.success(t('centres.merged')); setSelected(new Set()); router.refresh()
  }
  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await execDelete({ id: deleteTarget.id }); setDeleteTarget(null)
    if (res?.data) { toast.success(t('centres.deleted')); router.refresh() }
  }
  const selectedCentres = centres.filter((centre) => selected.has(centre.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('centres.search')} className="max-w-sm" />
        <Button variant="outline" size="sm" onClick={openMerge} disabled={selected.size < 2}><GitMerge className="size-4" />{t('centres.merge')}</Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="w-10" /><TableHead>{t('centres.colName')}</TableHead><TableHead>{t('centres.colOwn')}</TableHead>
          <TableHead>{t('centres.colAffiliations')}</TableHead><TableHead className="text-right">{t('centres.colActions')}</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map((centre) => (
            <TableRow key={centre.id}>
              <TableCell><Checkbox checked={selected.has(centre.id)} onCheckedChange={() => toggle(centre.id)} aria-label={centre.name} /></TableCell>
              <TableCell className="font-medium">{centre.name}</TableCell>
              <TableCell><Switch checked={centre.isOwn} onCheckedChange={() => toggleOwn(centre)} aria-label={t('centres.colOwn')} /></TableCell>
              <TableCell>{centre._count.affiliations}</TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => openRename(centre)} aria-label={t('centres.rename')}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(centre)} aria-label={t('centres.delete')}><Trash2 className="size-4" /></Button>
              </div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('centres.renameTitle')}</DialogTitle></DialogHeader>
          <form onSubmit={onRename} className="space-y-3">
            <div className="space-y-1"><label className="text-sm text-text-secondary">{t('centres.name')}</label><Input {...register('name')} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t('centres.cancel')}</Button>
              <Button type="submit" disabled={saving}>{t('centres.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('centres.mergeTitle')}</DialogTitle></DialogHeader>
          <p className="text-sm text-text-secondary">{t('centres.mergeChooseKeeper')}</p>
          <Select value={keepId} onChange={(event) => setKeepId(event.target.value)}>
            {selectedCentres.map((centre) => (<option key={centre.id} value={centre.id}>{`${centre.name} (${centre._count.affiliations})`}</option>))}
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMergeOpen(false)}>{t('centres.cancel')}</Button>
            <Button onClick={confirmMerge} disabled={merging || !keepId}>{t('centres.mergeConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('centres.deleteConfirm')}</AlertDialogTitle><AlertDialogDescription>{t('centres.deleteConfirmDesc')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('centres.cancel')}</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} disabled={deleting}>{t('centres.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/publications/admin/centres/page.tsx`** (mirror the authors page):

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listCentres } from '@/lib/services/publications/centres'
import { CentresManager } from '@/app/[locale]/publications/components/centres-manager'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsCentresPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications' })
  const centres = await listCentres()
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('centres.title')} subtitle={t('centres.subtitle')} />
      <CentresManager centres={centres} />
    </div>
  )
}
```

- [ ] **Step 3: Verify `components/ui/switch.tsx` exposes `Switch` with `checked`/`onCheckedChange`.**

Run: `grep -n "onCheckedChange\|export" components/ui/switch.tsx | head`
Expected: a shadcn/Radix switch. (Adapt handler if the prop differs.)

- [ ] **Step 4: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/components/centres-manager.tsx app/\[locale\]/publications/admin/centres/page.tsx
git commit -m "feat(publications): centres bank UI + page"
```

---

## Task 8: E2E — backfill + centres curation

**Files:** Create `tests/e2e/publications-centres.spec.ts`

The seeded article's 2 authorships have no affiliations. Extend the seed fixture OR rely on the fixture-backed backlog import: this test imports via the PubMed fixture (which has affiliations in `records.json`), then backfills/imports affiliations, then curates a centre. Simpler deterministic path: the fixture `records.json` author "Pezel" has affiliation "Lariboisiere Hospital, APHP, Paris, France." → import creates it + centre "Lariboisière – APHP".

- [ ] **Step 1: Ensure the fixture drives a centre.** The B1 fixture `tests/e2e/fixtures/pubmed/records.json` already has Pezel's affiliation "Lariboisiere Hospital, APHP, Paris, France." With Task 5, importing it creates an Affiliation + Centre "Lariboisière – APHP".

- [ ] **Step 2: Implement `tests/e2e/publications-centres.spec.ts`:**

```tsx
import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('import creates a centre, admin curates it', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // Import a paper (fixture) -> creates affiliation + centre
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByRole('button', { name: /import selected \(2\)/i })).toBeVisible()
  await page.getByRole('button', { name: /import selected \(2\)/i }).click()
  await expect(page.getByRole('paragraph').filter({ hasText: /imported/i })).toBeVisible()

  // Centres bank shows the auto-extracted centre
  await page.goto('/en/publications/admin/centres', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /centres/i })).toBeVisible()
  await expect(page.getByRole('row', { name: /Lariboisière/i })).toBeVisible()

  // Flag it as our centre
  await page.getByRole('row', { name: /Lariboisière/i }).getByRole('switch').click()
  await expect(page.getByText(/updated/i)).toBeVisible()
})
```

- [ ] **Step 3: Seed + run unit + e2e.**

Run: `npm run test:unit` (PASS)
Run: `npm run test:seed && npx playwright test tests/e2e/publications-centres.spec.ts` (server needs testdb + `PUBMED_FIXTURE_DIR`; 1 passed)

- [ ] **Step 4: Commit.**

```bash
git add tests/e2e/publications-centres.spec.ts
git commit -m "test(publications): e2e centres auto-extract + curation"
```

---

## B4 — Definition of Done

- [ ] `npx tsc --noEmit` green; `npm run test:unit` green (incl. `guessCentre`).
- [ ] Migrations applied dev + testdb (`add_centres_and_affiliation_centre`); no `migrate reset`.
- [ ] "Import affiliations from PubMed" backfills the 163 existing articles → affiliations + centres appear.
- [ ] `/publications/admin/centres` lists centres (ordered our-centre first), rename/merge/delete work, `isOwn` toggle persists.
- [ ] `npx playwright test tests/e2e/publications-centres.spec.ts` → 1 passed.
- [ ] Manually on real data: after backfill, "Lariboisière" and "ICPS" appear as centres; merge the noisy variants; flag Lariboisière as our centre.

---

## Self-Review (against spec §10 B4)

- **Centre = curated institution; Affiliation = clean line; raw = noisy input** → Task 1 model. ✔
- **Auto-extract centre by heuristic (keywords + fallback)** → Task 2 (unit-tested). ✔
- **Re-import affiliations (B1 didn't store them): backfill existing + import new** → Task 3 (backfill), Task 5 (new imports). ✔
- **Curation: rename/merge centres, flag `isOwn`** → Task 6 service/actions, Task 7 UI. ✔
- **Per-paper link (numbered) via AuthorshipAffiliation** → Tasks 3/5 create `AuthorshipAffiliation` (order). ✔
- **Type consistency:** `CentreListItem` used in page+component; `PUBLICATIONS_CENTRES_TAG` from `affiliations.ts` reused in actions; `guessCentre` shape stable; `upsertAffiliationWithCentre(tx, raw, report)` signature identical across import + backfill. ✔
- **Placeholder scan:** UI in Task 7 is fully written; other steps have concrete code/commands. ✔
- **Open follow-up (not B4):** ORCID-format dedup for residual duplicate authors (noted separately); numbered multi-affiliation rendering for the docx builder is Phase 2.
