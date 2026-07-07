# Publications B3 — Authors bank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Publications admins a screen at `/publications/admin/authors` to browse the authors bank (name, ORCID, #papers, linked portal user), search/sort it, edit an author, **merge duplicates/homonyms** (reassigning authorships), link an author to a portal user, and delete an unreferenced author.

**Architecture:** Server page fetches all authors with paper counts + linkable users, prop-drills to a client `AuthorsManager` (raw RHF dialogs + `useAction` + sonner). Merge is a transactional service that reassigns `Authorship.authorId` while respecting `@@unique([articleId, authorId])`, then deletes the merged-away rows. Guards: `appAdminAction('PUBLICATIONS')` + page `canAdminApp`.

**Tech Stack:** Next.js 15, Prisma (transaction for merge), next-safe-action, raw React Hook Form + `useAction` + sonner, shadcn/ui (Table, Dialog, AlertDialog, Input, Select, Checkbox), next-intl.

Spec: `docs/superpowers/specs/2026-07-07-publications-pubmed-banks-design.md` §6. Depends on B1 (Author.initials, import). No schema changes.

---

## File Structure

- Create: `lib/services/publications/authors.ts` — `listAuthors`, `listLinkableUsers`, `updateAuthor`, `deleteAuthor`, `mergeAuthors`; + `mergeAuthorships` pure helper (unit-tested).
- Create: `lib/services/publications/authors-merge.ts` (**pure**) + `authors-merge.test.ts` — plan which authorships to reassign vs drop on merge.
- Modify: `app/[locale]/publications/actions.ts` — `updateAuthorAction`, `deleteAuthorAction`, `mergeAuthorsAction`, `linkAuthorUserAction`.
- Create: `app/[locale]/publications/admin/authors/page.tsx` — server page (gated) fetching authors + users.
- Create: `app/[locale]/publications/components/authors-manager.tsx` (client) — table, search, edit dialog, merge flow, link-user.
- Modify: `app/[locale]/publications/admin/page.tsx` — add a link to the authors bank.
- Modify: `messages/en.json`, `messages/fr.json` — `publications.authors.*`.
- Create: `tests/e2e/publications-authors.spec.ts` — list + merge flow.

**Verification:** `npx tsc --noEmit`, `npm run test:unit`, `npm run test:seed` + `npx playwright test tests/e2e/publications-authors.spec.ts`. Reuse the testdb+`PUBMED_FIXTURE_DIR` server on port 3100 + temp playwright config for local e2e (M1/B1 pattern).

---

## Task 1: Merge planning (pure) — TDD

The merge algorithm must respect `@@unique([articleId, authorId])`: when merging author B into A, for each of B's authorships, if A is already an author on that article, that authorship must be **dropped** (A stays); otherwise it is **reassigned** to A. Isolate this decision as a pure function.

**Files:** Create `lib/services/publications/authors-merge.ts`, `lib/services/publications/authors-merge.test.ts`

- [ ] **Step 1: Write the failing test** `lib/services/publications/authors-merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { planAuthorshipMerge } from './authors-merge'

describe('planAuthorshipMerge', () => {
  it('reassigns authorships on articles the keeper is absent from, drops the rest', () => {
    const keeperArticleIds = ['a1', 'a2']
    const sourceAuthorships = [
      { id: 's1', articleId: 'a2' }, // keeper already on a2 -> drop
      { id: 's2', articleId: 'a3' }, // keeper absent from a3 -> reassign
    ]
    const plan = planAuthorshipMerge(keeperArticleIds, sourceAuthorships)
    expect(plan).toEqual({ reassignIds: ['s2'], dropIds: ['s1'] })
  })

  it('reassigns everything when the keeper shares no articles', () => {
    const plan = planAuthorshipMerge(['a1'], [{ id: 's1', articleId: 'a9' }, { id: 's2', articleId: 'a8' }])
    expect(plan).toEqual({ reassignIds: ['s1', 's2'], dropIds: [] })
  })
})
```

- [ ] **Step 2: Run — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/services/publications/authors-merge.ts`:**

```ts
export type MergeAuthorship = { id: string; articleId: string }
export type AuthorshipMergePlan = { reassignIds: string[]; dropIds: string[] }

export function planAuthorshipMerge(keeperArticleIds: string[], sourceAuthorships: MergeAuthorship[]): AuthorshipMergePlan {
  const keeperArticles = new Set(keeperArticleIds)
  const reassignIds: string[] = []
  const dropIds: string[] = []
  for (const authorship of sourceAuthorships) {
    if (keeperArticles.has(authorship.articleId)) dropIds.push(authorship.id)
    else reassignIds.push(authorship.id)
  }
  return { reassignIds, dropIds }
}
```

- [ ] **Step 4: Run — verify it passes.**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/services/publications/authors-merge.ts lib/services/publications/authors-merge.test.ts
git commit -m "feat(publications): pure author-merge planner with unit tests"
```

---

## Task 2: Authors service

**Files:** Create `lib/services/publications/authors.ts`

- [ ] **Step 1: Implement `lib/services/publications/authors.ts`:**

```ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { planAuthorshipMerge } from './authors-merge'
import { PUBLICATIONS_AUTHORS_TAG, PUBLICATIONS_ARTICLES_TAG } from './import'

export type AuthorListItem = Prisma.AuthorGetPayload<{
  select: {
    id: true; firstName: true; lastName: true; initials: true; degrees: true; email: true; orcid: true
    userId: true
    user: { select: { id: true; firstName: true; lastName: true; email: true } }
    _count: { select: { authorships: true } }
  }
}>

export async function listAuthors(): Promise<AuthorListItem[]> {
  return prisma.author.findMany({
    orderBy: [{ authorships: { _count: 'desc' } }, { lastName: 'asc' }],
    select: {
      id: true, firstName: true, lastName: true, initials: true, degrees: true, email: true, orcid: true,
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { authorships: true } },
    },
  })
}

export type LinkableUser = { id: string; firstName: string | null; lastName: string | null; email: string }

export async function listLinkableUsers(): Promise<LinkableUser[]> {
  return prisma.user.findMany({
    orderBy: [{ lastName: 'asc' }, { email: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true },
  })
}

export type UpdateAuthorInput = {
  id: string; firstName: string; lastName: string; degrees?: string | null; email?: string | null; orcid?: string | null; userId?: string | null
}

export async function updateAuthor(data: UpdateAuthorInput) {
  return prisma.author.update({
    where: { id: data.id },
    data: {
      firstName: data.firstName, lastName: data.lastName,
      degrees: data.degrees ?? null, email: data.email ?? null, orcid: data.orcid ?? null,
      userId: data.userId ?? null,
    },
    select: { id: true },
  })
}

export async function deleteAuthor(id: string) {
  return prisma.author.delete({ where: { id }, select: { id: true } })
}

export async function mergeAuthors(keepId: string, mergeIds: string[]): Promise<{ reassigned: number; dropped: number; deleted: number }> {
  const sources = mergeIds.filter((id) => id !== keepId)
  if (sources.length === 0) return { reassigned: 0, dropped: 0, deleted: 0 }

  return prisma.$transaction(async (tx) => {
    const keeperArticleIds = (await tx.authorship.findMany({ where: { authorId: keepId }, select: { articleId: true } })).map((a) => a.articleId)
    let reassigned = 0
    let dropped = 0
    for (const sourceId of sources) {
      const sourceAuthorships = await tx.authorship.findMany({ where: { authorId: sourceId }, select: { id: true, articleId: true } })
      const plan = planAuthorshipMerge(keeperArticleIds, sourceAuthorships)
      if (plan.dropIds.length) await tx.authorship.deleteMany({ where: { id: { in: plan.dropIds } } })
      if (plan.reassignIds.length) {
        await tx.authorship.updateMany({ where: { id: { in: plan.reassignIds } }, data: { authorId: keepId } })
        keeperArticleIds.push(...sourceAuthorships.filter((a) => plan.reassignIds.includes(a.id)).map((a) => a.articleId))
      }
      reassigned += plan.reassignIds.length
      dropped += plan.dropIds.length
    }
    await tx.author.deleteMany({ where: { id: { in: sources } } })
    return { reassigned, dropped, deleted: sources.length }
  })
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

export { PUBLICATIONS_AUTHORS_TAG, PUBLICATIONS_ARTICLES_TAG }
```

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add lib/services/publications/authors.ts
git commit -m "feat(publications): authors service (list, update, delete, merge)"
```

---

## Task 3: Server actions

**Files:** Modify `app/[locale]/publications/actions.ts`

- [ ] **Step 1: Append actions** to `app/[locale]/publications/actions.ts` (keep the existing imports; add these):

```ts
import { updateAuthor, deleteAuthor, mergeAuthors, isPrismaKnownError } from '@/lib/services/publications/authors'

const AuthorInput = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  degrees: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  orcid: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
})

export const updateAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(AuthorInput)
  .action(async ({ parsedInput }) => {
    const updated = await updateAuthor({ ...parsedInput, email: parsedInput.email || null })
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return updated
  })

export const deleteAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    try {
      const deleted = await deleteAuthor(parsedInput.id)
      revalidateTag(PUBLICATIONS_AUTHORS_TAG)
      return deleted
    } catch (error) {
      if (isPrismaKnownError(error, 'P2003')) throw new Error('AUTHOR_IN_USE')
      throw error
    }
  })

export const mergeAuthorsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ keepId: z.string().min(1), mergeIds: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await mergeAuthors(parsedInput.keepId, parsedInput.mergeIds)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return result
  })
```

(`PUBLICATIONS_AUTHORS_TAG` / `PUBLICATIONS_ARTICLES_TAG` are already imported in this file from B1; if not, add them to the existing import from `@/lib/services/publications/import`.)

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/actions.ts
git commit -m "feat(publications): author update/delete/merge actions"
```

---

## Task 4: i18n keys (EN + FR)

**Files:** Modify `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: `messages/en.json`** — inside the `publications` object, after the `import` block's closing `}`, add an `authors` block (mind the comma after `import`'s `}`):

```json
    "authors": {
      "title": "Authors bank",
      "subtitle": "Browse, edit, link to a user, and merge duplicate authors.",
      "search": "Search authors…",
      "colName": "Author",
      "colPapers": "Papers",
      "colOrcid": "ORCID",
      "colUser": "Portal user",
      "colActions": "Actions",
      "edit": "Edit",
      "editTitle": "Edit author",
      "firstName": "First name",
      "lastName": "Last name",
      "degrees": "Degrees",
      "email": "Email",
      "orcid": "ORCID",
      "linkUser": "Linked portal user",
      "noUser": "None",
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "deleteConfirm": "Delete this author?",
      "deleteConfirmDesc": "Only authors with no papers can be deleted.",
      "merge": "Merge selected",
      "mergeTitle": "Merge authors",
      "mergeChooseKeeper": "Choose the author to keep; the others are merged into it.",
      "mergeConfirm": "Merge",
      "selected": "{count} selected",
      "saved": "Author updated",
      "deleted": "Author deleted",
      "merged": "Merged: {reassigned} papers reassigned, {deleted} authors removed.",
      "errorInUse": "This author is linked to papers and cannot be deleted (merge instead).",
      "manageLink": "Manage authors"
    }
```

- [ ] **Step 2: `messages/fr.json`** — same shape, French:

```json
    "authors": {
      "title": "Banque d'auteurs",
      "subtitle": "Parcourez, éditez, liez à un utilisateur et fusionnez les doublons.",
      "search": "Rechercher un auteur…",
      "colName": "Auteur",
      "colPapers": "Papiers",
      "colOrcid": "ORCID",
      "colUser": "Utilisateur portail",
      "colActions": "Actions",
      "edit": "Éditer",
      "editTitle": "Éditer l'auteur",
      "firstName": "Prénom",
      "lastName": "Nom",
      "degrees": "Diplômes",
      "email": "E-mail",
      "orcid": "ORCID",
      "linkUser": "Utilisateur portail lié",
      "noUser": "Aucun",
      "save": "Enregistrer",
      "cancel": "Annuler",
      "delete": "Supprimer",
      "deleteConfirm": "Supprimer cet auteur ?",
      "deleteConfirmDesc": "Seuls les auteurs sans papier peuvent être supprimés.",
      "merge": "Fusionner la sélection",
      "mergeTitle": "Fusionner des auteurs",
      "mergeChooseKeeper": "Choisissez l'auteur à conserver ; les autres y sont fusionnés.",
      "mergeConfirm": "Fusionner",
      "selected": "{count} sélectionné(s)",
      "saved": "Auteur mis à jour",
      "deleted": "Auteur supprimé",
      "merged": "Fusion : {reassigned} papiers réassignés, {deleted} auteurs supprimés.",
      "errorInUse": "Cet auteur est lié à des papiers et ne peut pas être supprimé (fusionnez plutôt).",
      "manageLink": "Gérer les auteurs"
    }
```

- [ ] **Step 3: Validate JSON + commit.**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('ok')"`
Expected: `ok`.
```bash
git add messages/en.json messages/fr.json
git commit -m "feat(publications): i18n for authors bank"
```

---

## Task 5: AuthorsManager client component

**Files:** Create `app/[locale]/publications/components/authors-manager.tsx`

- [ ] **Step 1: Implement `app/[locale]/publications/components/authors-manager.tsx`** (client-side search + edit dialog + selection/merge + delete). Keep < 350 lines:

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
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { updateAuthorAction, deleteAuthorAction, mergeAuthorsAction } from '../actions'
import type { AuthorListItem, LinkableUser } from '@/lib/services/publications/authors'

const EditSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  degrees: z.string().optional(),
  email: z.string().optional(),
  orcid: z.string().optional(),
  userId: z.string().optional(),
})
type EditValues = z.infer<typeof EditSchema>

function authorLabel(author: AuthorListItem): string {
  return `${author.lastName} ${author.firstName}`.trim()
}

export function AuthorsManager({ authors, users }: { authors: AuthorListItem[]; users: LinkableUser[] }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<AuthorListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AuthorListItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mergeOpen, setMergeOpen] = useState(false)
  const [keepId, setKeepId] = useState<string>('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = needle ? authors.filter((a) => authorLabel(a).toLowerCase().includes(needle)) : authors
    return list.slice(0, 200)
  }, [authors, query])

  const { register, handleSubmit, reset } = useForm<EditValues>({ resolver: zodResolver(EditSchema) })

  function openEdit(author: AuthorListItem) {
    setEditing(author)
    reset({
      firstName: author.firstName, lastName: author.lastName,
      degrees: author.degrees ?? '', email: author.email ?? '', orcid: author.orcid ?? '',
      userId: author.userId ?? '',
    })
  }

  const { executeAsync: execUpdate, isExecuting: saving } = useAction(updateAuthorAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteAuthorAction, {
    onError({ error }) { toast.error(error?.serverError === 'AUTHOR_IN_USE' ? t('authors.errorInUse') : t('actionError')) },
  })
  const { executeAsync: execMerge, isExecuting: merging } = useAction(mergeAuthorsAction, { onError() { toast.error(t('actionError')) } })

  const onSubmit = handleSubmit(async (values) => {
    if (!editing) return
    const res = await execUpdate({
      id: editing.id, firstName: values.firstName, lastName: values.lastName,
      degrees: values.degrees || null, email: values.email || null, orcid: values.orcid || null,
      userId: values.userId || null,
    })
    if (!res?.data) return
    toast.success(t('authors.saved'))
    setEditing(null)
    router.refresh()
  })

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await execDelete({ id: deleteTarget.id })
    setDeleteTarget(null)
    if (!res?.data) return
    toast.success(t('authors.deleted'))
    router.refresh()
  }

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  function openMerge() {
    const ids = Array.from(selected)
    setKeepId(ids[0] ?? '')
    setMergeOpen(true)
  }

  async function confirmMerge() {
    const ids = Array.from(selected)
    const res = await execMerge({ keepId, mergeIds: ids })
    setMergeOpen(false)
    if (!res?.data) return
    toast.success(t('authors.merged', { reassigned: res.data.reassigned, deleted: res.data.deleted }))
    setSelected(new Set())
    router.refresh()
  }

  const selectedAuthors = authors.filter((a) => selected.has(a.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('authors.search')} className="max-w-sm" />
        <div className="flex items-center gap-2">
          {selected.size > 0 && <span className="text-sm text-text-secondary">{t('authors.selected', { count: selected.size })}</span>}
          <Button variant="outline" size="sm" onClick={openMerge} disabled={selected.size < 2}>
            <GitMerge className="size-4" />{t('authors.merge')}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t('authors.colName')}</TableHead>
            <TableHead>{t('authors.colPapers')}</TableHead>
            <TableHead>{t('authors.colOrcid')}</TableHead>
            <TableHead>{t('authors.colUser')}</TableHead>
            <TableHead className="text-right">{t('authors.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((author) => (
            <TableRow key={author.id}>
              <TableCell><Checkbox checked={selected.has(author.id)} onCheckedChange={() => toggle(author.id)} aria-label={authorLabel(author)} /></TableCell>
              <TableCell className="font-medium">{authorLabel(author)}{author.degrees ? `, ${author.degrees}` : ''}</TableCell>
              <TableCell>{author._count.authorships}</TableCell>
              <TableCell>{author.orcid ?? '—'}</TableCell>
              <TableCell>{author.user ? (author.user.email) : '—'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(author)} aria-label={t('authors.edit')}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(author)} aria-label={t('authors.delete')}><Trash2 className="size-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('authors.editTitle')}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.firstName')}</label><Input {...register('firstName')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.lastName')}</label><Input {...register('lastName')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.degrees')}</label><Input {...register('degrees')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.orcid')}</label><Input {...register('orcid')} /></div>
            </div>
            <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.email')}</label><Input {...register('email')} /></div>
            <div className="space-y-1">
              <label className="text-sm text-text-secondary">{t('authors.linkUser')}</label>
              <Select {...register('userId')} defaultValue={editing?.userId ?? ''}>
                <option value="">{t('authors.noUser')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{`${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || user.email}</option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t('authors.cancel')}</Button>
              <Button type="submit" disabled={saving}>{t('authors.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('authors.mergeTitle')}</DialogTitle></DialogHeader>
          <p className="text-sm text-text-secondary">{t('authors.mergeChooseKeeper')}</p>
          <Select value={keepId} onChange={(e) => setKeepId(e.target.value)}>
            {selectedAuthors.map((author) => (
              <option key={author.id} value={author.id}>{`${authorLabel(author)} (${author._count.authorships})`}</option>
            ))}
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMergeOpen(false)}>{t('authors.cancel')}</Button>
            <Button onClick={confirmMerge} disabled={merging || !keepId}>{t('authors.mergeConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('authors.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('authors.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('authors.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>{t('authors.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify `components/ui/select.tsx` accepts native `<option>` children + `register`/`value`.**

Run: `grep -n "export\|props" components/ui/select.tsx | head`
Expected: a native `<select>` wrapper (from B1/M1 exploration it is). If it needs `children`, the code above already passes `<option>`s.

- [ ] **Step 3: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/components/authors-manager.tsx
git commit -m "feat(publications): authors bank UI (search, edit, link user, merge, delete)"
```

---

## Task 6: Authors admin page + link from import page

**Files:** Create `app/[locale]/publications/admin/authors/page.tsx`; Modify `app/[locale]/publications/admin/page.tsx`

- [ ] **Step 1: Create `app/[locale]/publications/admin/authors/page.tsx`:**

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listAuthors, listLinkableUsers } from '@/lib/services/publications/authors'
import { AuthorsManager } from '@/app/[locale]/publications/components/authors-manager'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsAuthorsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/publications'))
  }

  const t = await getTranslations({ locale, namespace: 'publications' })
  const [authors, users] = await Promise.all([listAuthors(), listLinkableUsers()])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('authors.title')} subtitle={t('authors.subtitle')} />
      <AuthorsManager authors={authors} users={users} />
    </div>
  )
}
```

- [ ] **Step 2: Add a link to the authors bank on the import admin page.** In `app/[locale]/publications/admin/page.tsx`, add an import for the i18n `Link` and a link under the header:

Add import:
```tsx
import { Link } from '@/app/i18n/navigation'
```
And inside the returned JSX, right after `<PageHeader ... />`, add:
```tsx
      <div>
        <Link href="/publications/admin/authors" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('authors.manageLink')} →
        </Link>
      </div>
```

- [ ] **Step 3: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/admin/authors/page.tsx app/\[locale\]/publications/admin/page.tsx
git commit -m "feat(publications): authors bank page + link from import"
```

---

## Task 7: E2E — list, edit, merge

**Files:** Create `tests/e2e/publications-authors.spec.ts`

Uses seeded data: `publications-user`'s article (from `prisma/seed.test.ts`) has 2 authors — "Publications User" (order 1) and "Jane Coauthor" (order 2). We add a **merge** case by editing then merging is hard on 2 unrelated authors; instead assert the list renders, edit works, and a merge of the two seeded authors reassigns correctly (they are on the same 1 article → keeper stays, other dropped).

- [ ] **Step 1: Implement `tests/e2e/publications-authors.spec.ts`:**

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

test('admin browses, edits and merges authors', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/authors', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /authors bank/i })).toBeVisible()

  // Two seeded authors are present
  await expect(page.getByRole('cell', { name: /Coauthor Jane/i })).toBeVisible()

  // Edit: set degrees on the first-author row
  await page.getByRole('row', { name: /User Publications/i }).getByRole('button', { name: /edit/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByText(/author updated/i)).toBeVisible()

  // Merge the two seeded authors (same single article -> keeper keeps 1 authorship)
  const rows = page.locator('tbody tr')
  await rows.nth(0).getByRole('checkbox').click()
  await rows.nth(1).getByRole('checkbox').click()
  await page.getByRole('button', { name: /merge selected/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /^merge$/i }).click()
  await expect(page.getByText(/merged:/i)).toBeVisible()
})
```

- [ ] **Step 2: Seed + run unit + e2e.**

Run: `npm run test:unit` (all PASS)
Run: `npm run test:seed && npx playwright test tests/e2e/publications-authors.spec.ts` (server needs testdb; 1 passed)

- [ ] **Step 3: Commit.**

```bash
git add tests/e2e/publications-authors.spec.ts
git commit -m "test(publications): e2e authors bank list/edit/merge"
```

---

## B3 — Definition of Done

- [ ] `npx tsc --noEmit` green; `npm run test:unit` green (incl. merge planner).
- [ ] `/publications/admin/authors` lists authors with paper counts; search filters; edit + link-to-user works; merge reassigns authorships and removes the merged authors; delete blocked when the author has papers (`AUTHOR_IN_USE`).
- [ ] `npx playwright test tests/e2e/publications-authors.spec.ts` → 1 passed.
- [ ] Manually on the real 900-author dataset: search "Pezel" → 1 row / 163 papers; merging two homonyms reassigns correctly.

---

## Self-Review (against spec §6)

- **List (name, degrees, #papers, ORCID, linked user)** → Task 2 `listAuthors` + Task 5 table. ✔
- **Edit** (name/degrees/email/orcid) → Task 3 `updateAuthorAction` + Task 5 dialog. ✔
- **Merge duplicates (reassign authorships)** → Task 1 pure planner (unit-tested), Task 2 `mergeAuthors` transaction respecting `@@unique([articleId, authorId])`, Task 5 merge flow. ✔
- **Link to a portal user** (`Author.userId`) → Task 2/3 update with `userId`, Task 5 user `<Select>`. ✔
- **Delete if not referenced** → Task 3 `deleteAuthorAction` maps `P2003` → `AUTHOR_IN_USE`. ✔
- **Type consistency:** `AuthorListItem`/`LinkableUser` from `authors.ts` used in page + component; `planAuthorshipMerge` shape (`reassignIds`/`dropIds`) consistent across test/impl/service; tag consts reused from `import.ts`. ✔
- **Placeholder scan:** every step has concrete code/commands. ✔
