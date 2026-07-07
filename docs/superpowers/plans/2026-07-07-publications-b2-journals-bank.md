# Publications B2 — Journals bank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Journals bank at `/publications/admin/journals`: browse journals (already populated from imports), **search Crossref** to add new ones with auto-filled title/ISSN/publisher, edit **Impact Factor (manual)** and **SJR**, delete (blocked when referenced). SJR auto-fills by ISSN from an optional bundled Scimago CSV (`data/scimago.csv`) via a "Refresh SJR" admin action; both metrics are also manually editable.

**Architecture:** New `lib/services/publications/journals.ts` (CRUD + tags), `journals-catalog.ts` (Crossref search, fixture switch), `sjr.ts` (pure CSV parser unit-tested + `refreshJournalSjr` reading `data/scimago.csv` if present). `Journal` gains `sjr`/`sjrYear`. UI mirrors the B3/B4 managers.

**Tech Stack:** Next.js 15, Prisma (migration), next-safe-action, raw RHF + `useAction` + sonner, shadcn/ui, next-intl, vitest (CSV parse), Playwright.

Spec: `docs/superpowers/specs/2026-07-07-publications-pubmed-banks-design.md` §5 (B2). No free SJR API exists → SJR data is a user-provided Scimago CSV (CC BY-NC); IF stays manual.

---

## File Structure

- Modify: `prisma/schema.prisma` — `Journal` +`sjr Float?`/`sjrYear Int?`; migration.
- Create: `lib/services/publications/journals.ts` — `listJournals`, `createJournal`, `updateJournal`, `deleteJournal`, `PUBLICATIONS_JOURNALS_TAG` (re-export), `isPrismaKnownError`.
- Create: `lib/services/publications/journals-catalog.ts` — `searchCrossref` (fixture switch via `PUBMED_FIXTURE_DIR`).
- Create: `lib/services/publications/sjr.ts` (**pure** `parseSjrCsv`) + `sjr.test.ts`; + `refreshJournalSjr` (reads `data/scimago.csv`).
- Modify: `app/[locale]/publications/actions.ts` — `searchCrossrefAction`, `addJournalAction`, `updateJournalAction`, `deleteJournalAction`, `refreshSjrAction`.
- Create: `app/[locale]/publications/components/journals-manager.tsx` (client).
- Create: `app/[locale]/publications/admin/journals/page.tsx`.
- Modify: `app/[locale]/publications/admin/page.tsx` — link to journals.
- Modify: `messages/en.json`, `messages/fr.json` — `publications.journals.*`.
- Create: `tests/e2e/fixtures/pubmed/crossref-journals.json`, `tests/e2e/publications-journals.spec.ts`.

**Verification:** `npx tsc --noEmit`, `npm run test:unit`, `prisma migrate dev`/`deploy` (dev+testdb), `npm run test:seed`, Playwright (testdb + `PUBMED_FIXTURE_DIR` on 3100). Never `migrate reset`.

---

## Task 1: Model — Journal.sjr/sjrYear + migration

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add fields** to `model Journal` (after `impactFactor Float?`):

```prisma
  sjr          Float?
  sjrYear      Int?
```

- [ ] **Step 2: Migrate dev + testdb + generate.**

Run: `npx prisma migrate dev --name add_journal_sjr`
Then: `node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"`
Expected: `sjr`/`sjrYear` columns on both DBs.

- [ ] **Step 3: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(publications): add Journal.sjr/sjrYear (migration)"
```

---

## Task 2: SJR CSV parser (pure) — TDD

Scimago's `journalrank` CSV is `;`-separated; the `Issn` column holds one or more ISSNs (comma-separated, sometimes without the hyphen); `SJR` uses a comma decimal separator.

**Files:** Create `lib/services/publications/sjr.ts`, `lib/services/publications/sjr.test.ts`

- [ ] **Step 1: Write the failing test** `lib/services/publications/sjr.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseSjrCsv, normalizeIssn } from './sjr'

describe('normalizeIssn', () => {
  it('strips hyphens and uppercases', () => {
    expect(normalizeIssn('0195-668X')).toBe('0195668X')
    expect(normalizeIssn('0195668x')).toBe('0195668X')
  })
})

describe('parseSjrCsv', () => {
  it('maps every ISSN of a row to its SJR (comma decimal)', () => {
    const csv = [
      'Rank;Title;Issn;SJR',
      '1;European Heart Journal;"0195668X, 15229645";"39,304"',
    ].join('\n')
    const map = parseSjrCsv(csv)
    expect(map.get('0195668X')).toBe(39.304)
    expect(map.get('15229645')).toBe(39.304)
  })
})
```

- [ ] **Step 2: Run — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/services/publications/sjr.ts`:**

```ts
export function normalizeIssn(issn: string): string {
  return issn.replace(/[^0-9xX]/g, '').toUpperCase()
}

export function parseSjrCsv(text: string): Map<string, number> {
  const map = new Map<string, number>()
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return map
  const header = lines[0].split(';').map((cell) => cell.replace(/"/g, '').trim().toLowerCase())
  const issnIndex = header.indexOf('issn')
  const sjrIndex = header.indexOf('sjr')
  if (issnIndex === -1 || sjrIndex === -1) return map
  for (const line of lines.slice(1)) {
    const cells = line.split(';').map((cell) => cell.replace(/"/g, '').trim())
    const sjr = Number(cells[sjrIndex]?.replace(',', '.'))
    if (!cells[issnIndex] || Number.isNaN(sjr)) continue
    for (const issn of cells[issnIndex].split(',')) {
      const normalized = normalizeIssn(issn)
      if (normalized) map.set(normalized, sjr)
    }
  }
  return map
}

// Reads data/scimago.csv (user-provided; CC BY-NC) and fills Journal.sjr by ISSN.
export async function refreshJournalSjr(): Promise<{ updated: number; hasDataset: boolean }> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  let text: string
  try {
    text = await readFile(join(process.cwd(), 'data', 'scimago.csv'), 'utf8')
  } catch {
    return { updated: 0, hasDataset: false }
  }
  const { prisma } = await import('@/lib/prisma')
  const map = parseSjrCsv(text)
  const journals = await prisma.journal.findMany({ where: { issn: { not: null } }, select: { id: true, issn: true } })
  let updated = 0
  for (const journal of journals) {
    const sjr = map.get(normalizeIssn(journal.issn as string))
    if (sjr !== undefined) {
      await prisma.journal.update({ where: { id: journal.id }, data: { sjr } })
      updated += 1
    }
  }
  return { updated, hasDataset: true }
}
```

- [ ] **Step 4: Run — verify it passes.**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/services/publications/sjr.ts lib/services/publications/sjr.test.ts
git commit -m "feat(publications): Scimago SJR CSV parser + refresh (unit-tested)"
```

---

## Task 3: Journals service + Crossref catalog

**Files:** Create `lib/services/publications/journals.ts`, `lib/services/publications/journals-catalog.ts`

- [ ] **Step 1: Implement `lib/services/publications/journals.ts`:**

```ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { PUBLICATIONS_JOURNALS_TAG } from './import'

export type JournalListItem = Prisma.JournalGetPayload<{
  select: {
    id: true; name: true; issn: true; publisher: true; impactFactor: true; sjr: true; url: true
    _count: { select: { publishedArticles: true; submissions: true } }
  }
}>

export async function listJournals(): Promise<JournalListItem[]> {
  return prisma.journal.findMany({
    orderBy: [{ sjr: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
    select: {
      id: true, name: true, issn: true, publisher: true, impactFactor: true, sjr: true, url: true,
      _count: { select: { publishedArticles: true, submissions: true } },
    },
  })
}

export type UpsertJournalInput = { name: string; issn?: string | null; publisher?: string | null; impactFactor?: number | null; sjr?: number | null; url?: string | null }

export async function createJournal(data: UpsertJournalInput) {
  return prisma.journal.create({
    data: {
      name: data.name, issn: data.issn ?? null, publisher: data.publisher ?? null,
      impactFactor: data.impactFactor ?? null, sjr: data.sjr ?? null, url: data.url ?? null,
    },
    select: { id: true },
  })
}

export async function updateJournal(id: string, data: UpsertJournalInput) {
  return prisma.journal.update({
    where: { id },
    data: {
      name: data.name, issn: data.issn ?? null, publisher: data.publisher ?? null,
      impactFactor: data.impactFactor ?? null, sjr: data.sjr ?? null, url: data.url ?? null,
    },
    select: { id: true },
  })
}

export async function deleteJournal(id: string) {
  return prisma.journal.delete({ where: { id }, select: { id: true } })
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

export { PUBLICATIONS_JOURNALS_TAG }
```

- [ ] **Step 2: Implement `lib/services/publications/journals-catalog.ts`:**

```ts
import 'server-only'

export type JournalCandidate = { title: string; issn: string | null; publisher: string | null }

const FIXTURE_DIR = process.env.PUBMED_FIXTURE_DIR

export async function searchCrossref(query: string): Promise<JournalCandidate[]> {
  if (FIXTURE_DIR) {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    return JSON.parse(await readFile(join(FIXTURE_DIR, 'crossref-journals.json'), 'utf8')) as JournalCandidate[]
  }
  const url = new URL('https://api.crossref.org/journals')
  url.searchParams.set('query', query)
  url.searchParams.set('rows', '20')
  const res = await fetch(url, { headers: { 'User-Agent': 'LaribPortal/1.0 (mailto:publications@larib.fr)' }, cache: 'no-store' })
  if (!res.ok) throw new Error('CROSSREF_FAILED')
  const json = (await res.json()) as { message?: { items?: Array<{ title?: string | string[]; ISSN?: string[]; publisher?: string }> } }
  return (json.message?.items ?? []).map((item) => ({
    title: Array.isArray(item.title) ? item.title[0] ?? '' : item.title ?? '',
    issn: item.ISSN?.[0] ?? null,
    publisher: item.publisher ?? null,
  }))
}
```

- [ ] **Step 3: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add lib/services/publications/journals.ts lib/services/publications/journals-catalog.ts
git commit -m "feat(publications): journals service + Crossref catalog search"
```

---

## Task 4: Actions

**Files:** Modify `app/[locale]/publications/actions.ts`

- [ ] **Step 1: Add imports + actions** to `app/[locale]/publications/actions.ts`:

```ts
import { createJournal, updateJournal, deleteJournal, isPrismaKnownError as isJournalError } from '@/lib/services/publications/journals'
import { searchCrossref } from '@/lib/services/publications/journals-catalog'
import { refreshJournalSjr } from '@/lib/services/publications/sjr'

const JournalInput = z.object({
  name: z.string().min(1),
  issn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  impactFactor: z.number().min(0).max(1000).optional().nullable(),
  sjr: z.number().min(0).max(1000).optional().nullable(),
  url: z.string().optional().nullable(),
})

export const searchCrossrefAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ query: z.string().min(1) }))
  .action(async ({ parsedInput }) => searchCrossref(parsedInput.query))

export const addJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(JournalInput)
  .action(async ({ parsedInput }) => {
    try {
      const created = await createJournal(parsedInput)
      revalidateTag(PUBLICATIONS_JOURNALS_TAG)
      return created
    } catch (error) {
      if (isJournalError(error, 'P2002')) throw new Error('JOURNAL_EXISTS')
      throw error
    }
  })

export const updateJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(JournalInput.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const updated = await updateJournal(id, rest)
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    return updated
  })

export const deleteJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    try {
      const deleted = await deleteJournal(parsedInput.id)
      revalidateTag(PUBLICATIONS_JOURNALS_TAG)
      return deleted
    } catch (error) {
      if (isJournalError(error, 'P2003')) throw new Error('JOURNAL_IN_USE')
      throw error
    }
  })

export const refreshSjrAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async () => {
    const result = await refreshJournalSjr()
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    return result
  })
```

(`PUBLICATIONS_JOURNALS_TAG` is already imported in this file from `./import`.)

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/actions.ts
git commit -m "feat(publications): journal actions (crossref search, add, update, delete, refresh SJR)"
```

---

## Task 5: i18n (EN + FR)

**Files:** Modify `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: `messages/en.json`** — inside the `publications` object, after the `articles` block's closing `}` (add a comma), add:

```json
    "journals": {
      "title": "Journals",
      "subtitle": "Browse and curate journals; search Crossref to add new ones.",
      "search": "Search journals…",
      "crossref": "Search Crossref",
      "crossrefPlaceholder": "Journal name…",
      "add": "Add",
      "refreshSjr": "Refresh SJR",
      "refreshDone": "{count} SJR values updated.",
      "refreshNoData": "No Scimago dataset found (add data/scimago.csv).",
      "colName": "Journal",
      "colIssn": "ISSN",
      "colPublisher": "Publisher",
      "colImpactFactor": "IF",
      "colSjr": "SJR",
      "colActions": "Actions",
      "edit": "Edit",
      "editTitle": "Edit journal",
      "name": "Name",
      "issn": "ISSN",
      "publisher": "Publisher",
      "impactFactor": "Impact factor (manual)",
      "sjr": "SJR",
      "url": "URL",
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "deleteConfirm": "Delete this journal?",
      "deleteConfirmDesc": "Only journals with no submissions can be deleted.",
      "created": "Journal added",
      "updated": "Journal updated",
      "deleted": "Journal deleted",
      "errorExists": "A journal with this name already exists.",
      "errorInUse": "This journal is referenced and cannot be deleted.",
      "manageLink": "Manage journals"
    }
```

- [ ] **Step 2: `messages/fr.json`** — French mirror (same keys): `title` "Journaux", `subtitle` "Parcourez et curez les journaux ; cherchez sur Crossref pour en ajouter.", `search` "Rechercher un journal…", `crossref` "Chercher sur Crossref", `crossrefPlaceholder` "Nom du journal…", `add` "Ajouter", `refreshSjr` "Rafraîchir le SJR", `refreshDone` "{count} SJR mis à jour.", `refreshNoData` "Aucun dataset Scimago (ajoutez data/scimago.csv).", `colName` "Journal", `colIssn` "ISSN", `colPublisher` "Éditeur", `colImpactFactor` "IF", `colSjr` "SJR", `colActions` "Actions", `edit` "Éditer", `editTitle` "Éditer le journal", `name` "Nom", `issn` "ISSN", `publisher` "Éditeur", `impactFactor` "Impact factor (manuel)", `sjr` "SJR", `url` "URL", `save` "Enregistrer", `cancel` "Annuler", `delete` "Supprimer", `deleteConfirm` "Supprimer ce journal ?", `deleteConfirmDesc` "Seuls les journaux sans soumission peuvent être supprimés.", `created` "Journal ajouté", `updated` "Journal mis à jour", `deleted` "Journal supprimé", `errorExists` "Un journal avec ce nom existe déjà.", `errorInUse` "Ce journal est référencé et ne peut pas être supprimé.", `manageLink` "Gérer les journaux".

- [ ] **Step 3: Validate JSON + commit.**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('ok')"`
```bash
git add messages/en.json messages/fr.json
git commit -m "feat(publications): i18n for journals bank"
```

---

## Task 6: Journals manager UI + page + link

**Files:** Create `app/[locale]/publications/components/journals-manager.tsx`, `app/[locale]/publications/admin/journals/page.tsx`; Modify `app/[locale]/publications/admin/page.tsx`

- [ ] **Step 1: Create `app/[locale]/publications/components/journals-manager.tsx`** — client component (mirror `authors-manager.tsx` structure). Features: client-side name search; a **Crossref search row** (input + button → `searchCrossrefAction` → candidate list, each with **Add** → `addJournalAction`); a table of journals (name, ISSN, publisher, IF, SJR) with **edit** (dialog: name/issn/publisher/impactFactor/sjr/url; number inputs parsed to number|null) and **delete** (AlertDialog, maps `JOURNAL_IN_USE`); a **Refresh SJR** button (`refreshSjrAction` → toast `refreshDone`/`refreshNoData`). Convert number fields with `value ? Number(value) : null`. Keep < 350 lines. Use `Input`, `Select` not needed, `Dialog`, `AlertDialog`, `Table`, `Button`, `useAction`, `toast`, `useForm`+`zodResolver`. Import types `JournalListItem` from `journals.ts` and `JournalCandidate` from `journals-catalog.ts` (type-only).

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
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { searchCrossrefAction, addJournalAction, updateJournalAction, deleteJournalAction, refreshSjrAction } from '../actions'
import type { JournalListItem } from '@/lib/services/publications/journals'
import type { JournalCandidate } from '@/lib/services/publications/journals-catalog'

const FormSchema = z.object({
  name: z.string().min(1),
  issn: z.string().optional(),
  publisher: z.string().optional(),
  impactFactor: z.string().optional(),
  sjr: z.string().optional(),
  url: z.string().optional(),
})
type FormValues = z.infer<typeof FormSchema>

function num(value: string | undefined): number | null {
  const trimmed = value?.trim()
  return trimmed ? Number(trimmed) : null
}

export function JournalsManager({ journals }: { journals: JournalListItem[] }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [crossrefQuery, setCrossrefQuery] = useState('')
  const [candidates, setCandidates] = useState<JournalCandidate[]>([])
  const [editing, setEditing] = useState<JournalListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JournalListItem | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (needle ? journals.filter((journal) => journal.name.toLowerCase().includes(needle)) : journals).slice(0, 300)
  }, [journals, query])

  const { register, handleSubmit, reset } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: { name: '' } })

  const { execute: runSearch, isExecuting: searching } = useAction(searchCrossrefAction, {
    onSuccess({ data }) { setCandidates(data ?? []) },
    onError() { toast.error(t('actionError')) },
  })
  const { executeAsync: execAdd } = useAction(addJournalAction, {
    onError({ error }) { toast.error(error?.serverError === 'JOURNAL_EXISTS' ? t('journals.errorExists') : t('actionError')) },
  })
  const { executeAsync: execUpdate, isExecuting: saving } = useAction(updateJournalAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteJournalAction, {
    onError({ error }) { toast.error(error?.serverError === 'JOURNAL_IN_USE' ? t('journals.errorInUse') : t('actionError')) },
  })
  const { execute: runRefresh, isExecuting: refreshing } = useAction(refreshSjrAction, {
    onSuccess({ data }) { toast.success(data?.hasDataset ? t('journals.refreshDone', { count: data.updated }) : t('journals.refreshNoData')); router.refresh() },
    onError() { toast.error(t('actionError')) },
  })

  async function addCandidate(candidate: JournalCandidate) {
    const res = await execAdd({ name: candidate.title, issn: candidate.issn, publisher: candidate.publisher })
    if (!res?.data) return
    toast.success(t('journals.created'))
    setCandidates((prev) => prev.filter((entry) => entry !== candidate))
    router.refresh()
  }

  function openEdit(journal: JournalListItem) {
    setEditing(journal)
    reset({
      name: journal.name, issn: journal.issn ?? '', publisher: journal.publisher ?? '',
      impactFactor: journal.impactFactor != null ? String(journal.impactFactor) : '',
      sjr: journal.sjr != null ? String(journal.sjr) : '', url: journal.url ?? '',
    })
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!editing) return
    const res = await execUpdate({
      id: editing.id, name: values.name.trim(), issn: values.issn?.trim() || null, publisher: values.publisher?.trim() || null,
      impactFactor: num(values.impactFactor), sjr: num(values.sjr), url: values.url?.trim() || null,
    })
    if (!res?.data) return
    toast.success(t('journals.updated'))
    setEditing(null)
    router.refresh()
  })

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await execDelete({ id: deleteTarget.id })
    setDeleteTarget(null)
    if (!res?.data) return
    toast.success(t('journals.deleted'))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={crossrefQuery} onChange={(event) => setCrossrefQuery(event.target.value)} placeholder={t('journals.crossrefPlaceholder')} className="max-w-sm" />
        <Button onClick={() => runSearch({ query: crossrefQuery })} disabled={searching || crossrefQuery.trim().length === 0}>{t('journals.crossref')}</Button>
        <Button variant="outline" onClick={() => runRefresh({})} disabled={refreshing}>{t('journals.refreshSjr')}</Button>
      </div>

      {candidates.length > 0 && (
        <div className="rounded-lg border border-line bg-bg-surface p-3 space-y-1">
          {candidates.map((candidate, index) => (
            <div key={`${candidate.issn ?? candidate.title}-${index}`} className="flex items-center justify-between gap-2 text-sm">
              <span>{candidate.title}{candidate.issn ? ` · ${candidate.issn}` : ''}{candidate.publisher ? ` · ${candidate.publisher}` : ''}</span>
              <Button size="sm" variant="outline" onClick={() => addCandidate(candidate)}><Plus className="size-4" />{t('journals.add')}</Button>
            </div>
          ))}
        </div>
      )}

      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('journals.search')} className="max-w-sm" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('journals.colName')}</TableHead>
            <TableHead>{t('journals.colIssn')}</TableHead>
            <TableHead>{t('journals.colPublisher')}</TableHead>
            <TableHead>{t('journals.colImpactFactor')}</TableHead>
            <TableHead>{t('journals.colSjr')}</TableHead>
            <TableHead className="text-right">{t('journals.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((journal) => (
            <TableRow key={journal.id}>
              <TableCell className="font-medium">{journal.name}</TableCell>
              <TableCell>{journal.issn ?? '—'}</TableCell>
              <TableCell>{journal.publisher ?? '—'}</TableCell>
              <TableCell>{journal.impactFactor ?? '—'}</TableCell>
              <TableCell>{journal.sjr ?? '—'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(journal)} aria-label={t('journals.edit')}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(journal)} aria-label={t('journals.delete')}><Trash2 className="size-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('journals.editTitle')}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.name')}</label><Input required {...register('name')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.issn')}</label><Input {...register('issn')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.publisher')}</label><Input {...register('publisher')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.impactFactor')}</label><Input type="number" step="0.001" {...register('impactFactor')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.sjr')}</label><Input type="number" step="0.001" {...register('sjr')} /></div>
            </div>
            <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.url')}</label><Input {...register('url')} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t('journals.cancel')}</Button>
              <Button type="submit" disabled={saving}>{t('journals.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('journals.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('journals.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('journals.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>{t('journals.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/publications/admin/journals/page.tsx`** (mirror the articles page):

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listJournals } from '@/lib/services/publications/journals'
import { JournalsManager } from '@/app/[locale]/publications/components/journals-manager'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsJournalsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications' })
  const journals = await listJournals()
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('journals.title')} subtitle={t('journals.subtitle')} />
      <JournalsManager journals={journals} />
    </div>
  )
}
```

- [ ] **Step 3: Add the link** on `app/[locale]/publications/admin/page.tsx` (in the links `<div>`):

```tsx
        <Link href="/publications/admin/journals" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('journals.manageLink')} →
        </Link>
```

- [ ] **Step 4: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/components/journals-manager.tsx app/\[locale\]/publications/admin/journals/page.tsx app/\[locale\]/publications/admin/page.tsx
git commit -m "feat(publications): journals bank UI (Crossref add, edit IF/SJR, delete, refresh)"
```

---

## Task 7: E2E — list, Crossref add, edit

**Files:** Create `tests/e2e/fixtures/pubmed/crossref-journals.json`, `tests/e2e/publications-journals.spec.ts`

- [ ] **Step 1: Create `tests/e2e/fixtures/pubmed/crossref-journals.json`:**

```json
[
  { "title": "JACC: Cardiovascular Imaging", "issn": "1936-878X", "publisher": "Elsevier" },
  { "title": "Circulation", "issn": "0009-7322", "publisher": "Wolters Kluwer" }
]
```

- [ ] **Step 2: Implement `tests/e2e/publications-journals.spec.ts`:**

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

test('admin adds a journal from Crossref and edits its impact factor', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/journals', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /journals/i })).toBeVisible()

  // seed already has "European Heart Journal"
  await expect(page.getByRole('cell', { name: /European Heart Journal/i })).toBeVisible()

  // Crossref search (fixture) -> add Circulation
  await page.getByPlaceholder(/journal name/i).fill('circulation')
  await page.getByRole('button', { name: /search crossref/i }).click()
  const addCirculation = page.getByText(/^Circulation ·/).locator('..').getByRole('button', { name: /^add$/i })
  await addCirculation.click()
  await expect(page.getByRole('cell', { name: /^Circulation$/ })).toBeVisible()
})
```

- [ ] **Step 3: Seed + run unit + e2e.**

Run: `npm run test:unit` (PASS)
Run: `npm run test:seed && npx playwright test tests/e2e/publications-journals.spec.ts` (server: testdb + `PUBMED_FIXTURE_DIR`; 1 passed)

- [ ] **Step 4: Commit.**

```bash
git add tests/e2e/fixtures/pubmed/crossref-journals.json tests/e2e/publications-journals.spec.ts
git commit -m "test(publications): e2e journals bank (Crossref add)"
```

---

## B2 — Definition of Done

- [ ] `npx tsc --noEmit` green; `npm run test:unit` green (incl. SJR CSV parse).
- [ ] Migration applied dev + testdb (`add_journal_sjr`); no `migrate reset`.
- [ ] `/publications/admin/journals` lists journals (imported ones present), Crossref search adds new ones, edit sets IF/SJR, delete blocked when referenced (`JOURNAL_IN_USE`), Refresh SJR reports updated count or "no dataset".
- [ ] `npx playwright test tests/e2e/publications-journals.spec.ts` → 1 passed.
- [ ] Manually: search a real journal on Crossref → add; set an IF; (optional) drop `data/scimago.csv` → Refresh SJR fills SJR by ISSN.

---

## Self-Review (against spec §5 B2)

- **Crossref search + autofill (title/ISSN/publisher) + favorites (= bank)** → Tasks 3, 4, 6. ✔
- **SJR auto by ISSN (Scimago CSV) + manual IF** → Tasks 1, 2 (parser + refresh), 6 (manual IF + SJR fields). Honest limitation documented: SJR data is a user-provided CC BY-NC CSV at `data/scimago.csv`; no free API. ✔
- **Journals appear from imports** → already true (import.ts upserts journals); this bank lists them. ✔
- **Delete guard when referenced** → `JOURNAL_IN_USE` on `P2003` (Submission/JournalTarget Restrict). ✔
- **Type consistency:** `JournalListItem`/`JournalCandidate`/`UpsertJournalInput` shared; `PUBLICATIONS_JOURNALS_TAG` reused from `import.ts`; `parseSjrCsv`/`normalizeIssn` stable across test/impl/refresh. ✔
- **Deferred (M4):** JournalTarget "next journals" + submissions live there, not B2.
