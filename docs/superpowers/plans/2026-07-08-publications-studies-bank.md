# Publications — Studies bank + creation pipeline — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** A Studies bank at `/publications/admin/studies` with a rich **create/edit study** form: title (required) + optional acronym, description, domain, funding, status (Planned/Ongoing/Completed/Stopped), start/end dates, **investigators (PIs + co-investigators) chosen from the Authors bank**, and **linked centres** (pre-fillable from the investigators' primary centres). An author missing from the bank can be **created inline**.

**Architecture:** Enrich `Study` (fields + `StudyStatus` enum); investigators via `StudyInvestigator { studyId, authorId, role }` join (`StudyRole` PI/CO_INVESTIGATOR); centres via implicit M2M `Study.centres Centre[]`. Searchable pickers use the existing `MultiSelect` component. Reuses B3/B4. Server pages fetch; mutations via `appAdminAction('PUBLICATIONS')`.

Spec: `docs/superpowers/specs/2026-07-03-publications-management-design.md` (studies bank). Removes the never-used `Study.leadUserId`/`Study.isClosed` (no studies exist yet).

---

## File Structure

- Modify: `prisma/schema.prisma` — `StudyStatus`/`StudyRole` enums; enrich `Study`; `StudyInvestigator`; `Study.centres`↔`Centre.studies`; drop `leadUserId`/`isClosed`; `Author.studyRoles`; `User` drop `studiesLed`; migration.
- Modify: `lib/services/publications/authors.ts` — `createAuthor`, `listAuthorOptions`.
- Create: `lib/services/publications/studies.ts` — `listStudies`, `getStudy`, `createStudy`, `updateStudy`, `deleteStudy`, `STUDY_STATUSES`, `PUBLICATIONS_STUDIES_TAG`.
- Modify: `app/[locale]/publications/actions.ts` — `createAuthorAction`, `createStudyAction`, `updateStudyAction`, `deleteStudyAction`.
- Create: `app/[locale]/publications/components/studies-manager.tsx` (list), `study-form.tsx` (create/edit form with pickers + inline author create).
- Create: `app/[locale]/publications/admin/studies/page.tsx`.
- Modify: `app/[locale]/publications/admin/page.tsx` — link to studies.
- Modify: `messages/en.json`, `messages/fr.json` — `publications.studies.*`.
- Modify: `prisma/seed.test.ts` — drop `isClosed` from the seeded study.
- Create: `tests/e2e/publications-studies.spec.ts`.

**Verification:** `npx tsc --noEmit`, `npm run test:unit`, migrate dev+testdb, `npm run test:seed`, Playwright (testdb + `PUBMED_FIXTURE_DIR` on 3100).

---

## Task 1: Model + migration

**Files:** Modify `prisma/schema.prisma`, `prisma/seed.test.ts`

- [ ] **Step 1: Add enums** (near other publications enums):
```prisma
enum StudyStatus { PLANNED  ONGOING  COMPLETED  STOPPED }
enum StudyRole { PI  CO_INVESTIGATOR }
```

- [ ] **Step 2: Replace `model Study`** with:
```prisma
model Study {
  id          String       @id @default(cuid())
  title       String
  acronym     String?
  description String?
  domain      String?
  funding     String?
  status      StudyStatus  @default(PLANNED)
  startDate   DateTime?
  endDate     DateTime?
  createdById String
  createdBy   User         @relation("StudyCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  articles     Article[]
  investigators StudyInvestigator[]
  centres      Centre[]     @relation("StudyCentres")

  @@map("Study")
}

model StudyInvestigator {
  studyId  String
  study    Study     @relation(fields: [studyId], references: [id], onDelete: Cascade)
  authorId String
  author   Author    @relation(fields: [authorId], references: [id], onDelete: Cascade)
  role     StudyRole @default(CO_INVESTIGATOR)

  @@id([studyId, authorId])
  @@map("StudyInvestigator")
}
```

- [ ] **Step 3: Update related models.**
  - `model Author`: add `studyRoles StudyInvestigator[]` (near `authorships`).
  - `model Centre`: add `studies Study[] @relation("StudyCentres")` (near `authors`).
  - `model User`: remove the `studiesLed Study[] @relation("StudyLead")` line (leadUser is gone). Keep `studiesCreated`.

- [ ] **Step 4: Seed fix.** In `prisma/seed.test.ts`, remove `isClosed: false,` from the `prisma.study.create` data (the field no longer exists).

- [ ] **Step 5: Migrate + generate.**
Run: `npx prisma migrate dev --name studies_bank`
Then testdb: `node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"`
Expected: Study columns changed, StudyInvestigator + `_StudyCentres` join created, `leadUserId`/`isClosed` dropped.

- [ ] **Step 6: Type-check.** `npx tsc --noEmit` — may error where `leadUserId`/`isClosed` were referenced (import.ts doesn't; seed fixed in Step 4). Fix any stragglers. Then commit.
```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.test.ts
git commit -m "feat(publications): enrich Study (status/fields), investigators + centres relations (migration)"
```

---

## Task 2: Authors service — create + options

**Files:** Modify `lib/services/publications/authors.ts`

- [ ] **Step 1:** Add:
```ts
export type CreateAuthorInput = { firstName: string; lastName: string; degrees?: string | null; orcid?: string | null; centreId?: string | null }
export async function createAuthor(data: CreateAuthorInput) {
  return prisma.author.create({
    data: { firstName: data.firstName, lastName: data.lastName, degrees: data.degrees ?? null, orcid: data.orcid ?? null, centreId: data.centreId ?? null },
    select: { id: true, firstName: true, lastName: true },
  })
}

export type AuthorOption = { id: string; firstName: string; lastName: string; centreId: string | null }
export async function listAuthorOptions(): Promise<AuthorOption[]> {
  return prisma.author.findMany({ orderBy: [{ lastName: 'asc' }], select: { id: true, firstName: true, lastName: true, centreId: true } })
}
```
- [ ] **Step 2:** `npx tsc --noEmit` (PASS); commit `feat(publications): author create + options for pickers`.

---

## Task 3: Studies service

**Files:** Create `lib/services/publications/studies.ts`

- [ ] **Step 1: Implement:**
```ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

export const PUBLICATIONS_STUDIES_TAG = 'publications:studies'
export const STUDY_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED', 'STOPPED'] as const
export type StudyStatusValue = (typeof STUDY_STATUSES)[number]

export type StudyListItem = Prisma.StudyGetPayload<{
  select: {
    id: true; title: true; acronym: true; status: true; startDate: true
    _count: { select: { articles: true; investigators: true; centres: true } }
  }
}>

export async function listStudies(): Promise<StudyListItem[]> {
  return prisma.study.findMany({
    orderBy: [{ createdAt: 'desc' }],
    select: { id: true, title: true, acronym: true, status: true, startDate: true, _count: { select: { articles: true, investigators: true, centres: true } } },
  })
}

export type StudyInput = {
  title: string
  acronym?: string | null
  description?: string | null
  domain?: string | null
  funding?: string | null
  status: StudyStatusValue
  startDate?: string | null
  endDate?: string | null
  piIds: string[]
  coInvestigatorIds: string[]
  centreIds: string[]
}

function investigatorCreate(input: StudyInput) {
  const seen = new Set<string>()
  const rows: Array<{ authorId: string; role: 'PI' | 'CO_INVESTIGATOR' }> = []
  for (const authorId of input.piIds) { if (seen.has(authorId)) continue; seen.add(authorId); rows.push({ authorId, role: 'PI' }) }
  for (const authorId of input.coInvestigatorIds) { if (seen.has(authorId)) continue; seen.add(authorId); rows.push({ authorId, role: 'CO_INVESTIGATOR' }) }
  return rows
}

export async function createStudy(input: StudyInput, createdById: string) {
  return prisma.study.create({
    data: {
      title: input.title, acronym: input.acronym ?? null, description: input.description ?? null,
      domain: input.domain ?? null, funding: input.funding ?? null, status: input.status,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      createdById,
      investigators: { create: investigatorCreate(input) },
      centres: { connect: input.centreIds.map((id) => ({ id })) },
    },
    select: { id: true },
  })
}

export async function updateStudy(id: string, input: StudyInput) {
  return prisma.$transaction(async (tx) => {
    await tx.studyInvestigator.deleteMany({ where: { studyId: id } })
    return tx.study.update({
      where: { id },
      data: {
        title: input.title, acronym: input.acronym ?? null, description: input.description ?? null,
        domain: input.domain ?? null, funding: input.funding ?? null, status: input.status,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        investigators: { create: investigatorCreate(input) },
        centres: { set: input.centreIds.map((cid) => ({ id: cid })) },
      },
      select: { id: true },
    })
  })
}

export async function getStudy(id: string) {
  return prisma.study.findUnique({
    where: { id },
    select: {
      id: true, title: true, acronym: true, description: true, domain: true, funding: true, status: true, startDate: true, endDate: true,
      investigators: { select: { authorId: true, role: true } },
      centres: { select: { id: true } },
    },
  })
}

export async function deleteStudy(id: string) {
  return prisma.study.delete({ where: { id }, select: { id: true } })
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
```
- [ ] **Step 2:** `npx tsc --noEmit` (PASS); commit `feat(publications): studies service (CRUD, investigators, centres)`.

---

## Task 4: Actions

**Files:** Modify `app/[locale]/publications/actions.ts`

- [ ] **Step 1:** Add imports + actions:
```ts
import { createAuthor } from '@/lib/services/publications/authors'
import { createStudy, updateStudy, deleteStudy, STUDY_STATUSES, PUBLICATIONS_STUDIES_TAG } from '@/lib/services/publications/studies'

export const createAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ firstName: z.string().min(1), lastName: z.string().min(1), degrees: z.string().optional().nullable(), orcid: z.string().optional().nullable(), centreId: z.string().optional().nullable() }))
  .action(async ({ parsedInput }) => {
    const created = await createAuthor(parsedInput)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return created
  })

const StudyInputSchema = z.object({
  title: z.string().min(1),
  acronym: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  funding: z.string().optional().nullable(),
  status: z.enum(STUDY_STATUSES),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  piIds: z.array(z.string()),
  coInvestigatorIds: z.array(z.string()),
  centreIds: z.array(z.string()),
})

export const createStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(StudyInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const created = await createStudy(parsedInput, ctx.userId)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return created
  })

export const updateStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(StudyInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const updated = await updateStudy(id, rest)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return updated
  })

export const deleteStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const deleted = await deleteStudy(parsedInput.id)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return deleted
  })
```
- [ ] **Step 2:** `npx tsc --noEmit` (PASS); commit `feat(publications): study + author-create actions`.

---

## Task 5: i18n

**Files:** Modify `messages/en.json`, `messages/fr.json`

- [ ] **Step 1:** In `publications` (both locales) add a `studies` block with keys: `title`, `subtitle`, `manageLink`, `new`, `editTitle`, `newTitle`, field labels (`titleField`, `acronym`, `description`, `domain`, `funding`, `statusField`, `startDate`, `endDate`, `pis`, `coInvestigators`, `centres`, `addInvestigatorsCentres` "Add investigators' centres"), `newAuthor` "New author", `authorFirstName`, `authorLastName`, `addAuthor` "Add", `save`, `cancel`, `delete`, `deleteConfirm`, `deleteConfirmDesc`, `created`, `updated`, `deleted`, `colTitle`, `colStatus`, `colArticles`, `colInvestigators`, `colCentres`, `search`, and a `status` sub-object (`PLANNED`/`ONGOING`/`COMPLETED`/`STOPPED`). FR mirror. Validate JSON.
- [ ] **Step 2:** commit `feat(publications): i18n for studies bank`.

---

## Task 6: Study form + studies bank UI + page + link

**Files:** Create `app/[locale]/publications/components/study-form.tsx`, `studies-manager.tsx`, `app/[locale]/publications/admin/studies/page.tsx`; Modify `app/[locale]/publications/admin/page.tsx`

- [ ] **Step 1: `study-form.tsx`** (client) — the create/edit form used inside a dialog. Props: `authors: AuthorOption[]`, `centres: {id;name}[]`, `study?: <getStudy result>` (edit mode), `onDone: () => void`. Uses React Hook Form for text fields, and local state for `piIds`/`coIds`/`centreIds` driven by three `MultiSelect`s (`options` mapped from authors/centres; `onValueChange` updates state; `defaultValue` from edit study). "**Add investigators' centres**" button merges the selected investigators' `centreId`s into `centreIds`. An inline "**New author**" row (two inputs + Add) calls `createAuthorAction`; on success, appends to a local `authorOptions` state and selects the new author as a co-investigator. Submit → `createStudyAction`/`updateStudyAction` with all fields; toast + `onDone()`.

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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multiselect'
import { DialogFooter } from '@/components/ui/dialog'
import { createStudyAction, updateStudyAction, createAuthorAction } from '../actions'
import { STUDY_STATUSES } from '@/lib/services/publications/studies'
import type { AuthorOption } from '@/lib/services/publications/authors'

const FormSchema = z.object({
  title: z.string().min(1),
  acronym: z.string().optional(),
  description: z.string().optional(),
  domain: z.string().optional(),
  funding: z.string().optional(),
  status: z.enum(STUDY_STATUSES),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
type FormValues = z.infer<typeof FormSchema>

type StudyEdit = {
  id: string; title: string; acronym: string | null; description: string | null; domain: string | null; funding: string | null
  status: string; startDate: string | null; endDate: string | null
  investigators: { authorId: string; role: 'PI' | 'CO_INVESTIGATOR' }[]; centres: { id: string }[]
}

export function StudyForm({ authors, centres, study, onDone }: { authors: AuthorOption[]; centres: { id: string; name: string }[]; study?: StudyEdit; onDone: () => void }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [authorOptions, setAuthorOptions] = useState(authors)
  const [piIds, setPiIds] = useState<string[]>(study?.investigators.filter((row) => row.role === 'PI').map((row) => row.authorId) ?? [])
  const [coIds, setCoIds] = useState<string[]>(study?.investigators.filter((row) => row.role === 'CO_INVESTIGATOR').map((row) => row.authorId) ?? [])
  const [centreIds, setCentreIds] = useState<string[]>(study?.centres.map((centre) => centre.id) ?? [])
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')

  const authorItems = useMemo(() => authorOptions.map((author) => ({ label: `${author.firstName} ${author.lastName.toUpperCase()}`.trim(), value: author.id })), [authorOptions])
  const centreItems = useMemo(() => centres.map((centre) => ({ label: centre.name, value: centre.id })), [centres])

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: study?.title ?? '', acronym: study?.acronym ?? '', description: study?.description ?? '', domain: study?.domain ?? '',
      funding: study?.funding ?? '', status: (study?.status as FormValues['status']) ?? 'PLANNED',
      startDate: study?.startDate ? study.startDate.slice(0, 10) : '', endDate: study?.endDate ? study.endDate.slice(0, 10) : '',
    },
  })

  const { executeAsync: execCreate, isExecuting: creating } = useAction(createStudyAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execUpdate, isExecuting: updating } = useAction(updateStudyAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execAddAuthor } = useAction(createAuthorAction, { onError() { toast.error(t('actionError')) } })

  function addInvestigatorsCentres() {
    const ids = new Set(centreIds)
    for (const authorId of [...piIds, ...coIds]) {
      const author = authorOptions.find((entry) => entry.id === authorId)
      if (author?.centreId) ids.add(author.centreId)
    }
    setCentreIds(Array.from(ids))
  }

  async function addNewAuthor() {
    if (!newFirst.trim() || !newLast.trim()) return
    const res = await execAddAuthor({ firstName: newFirst.trim(), lastName: newLast.trim() })
    if (!res?.data) return
    setAuthorOptions((prev) => [...prev, { id: res.data!.id, firstName: res.data!.firstName, lastName: res.data!.lastName, centreId: null }])
    setCoIds((prev) => [...prev, res.data!.id])
    setNewFirst(''); setNewLast('')
    toast.success(t('authors.saved'))
  }

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      title: values.title.trim(), acronym: values.acronym?.trim() || null, description: values.description?.trim() || null,
      domain: values.domain?.trim() || null, funding: values.funding?.trim() || null, status: values.status,
      startDate: values.startDate || null, endDate: values.endDate || null,
      piIds, coInvestigatorIds: coIds, centreIds,
    }
    const res = study ? await execUpdate({ id: study.id, ...payload }) : await execCreate(payload)
    if (!res?.data) return
    toast.success(study ? t('studies.updated') : t('studies.created'))
    onDone(); router.refresh()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.titleField')}</label><Input required {...register('title')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.acronym')}</label><Input {...register('acronym')} /></div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.statusField')}</label>
          <Select {...register('status')}>{STUDY_STATUSES.map((value) => <option key={value} value={value}>{t(`studies.status.${value}`)}</option>)}</Select>
        </div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.startDate')}</label><Input type="date" {...register('startDate')} /></div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.endDate')}</label><Input type="date" {...register('endDate')} /></div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.domain')}</label><Input {...register('domain')} /></div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.funding')}</label><Input {...register('funding')} /></div>
      </div>
      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.description')}</label><Textarea {...register('description')} /></div>

      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.pis')}</label>
        <MultiSelect options={authorItems} defaultValue={piIds} onValueChange={setPiIds} placeholder={t('studies.pis')} maxCount={4} />
      </div>
      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.coInvestigators')}</label>
        <MultiSelect options={authorItems} defaultValue={coIds} onValueChange={setCoIds} placeholder={t('studies.coInvestigators')} maxCount={4} />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1"><label className="text-sm text-text-secondary">{t('studies.newAuthor')}</label>
          <div className="flex gap-2">
            <Input value={newFirst} onChange={(event) => setNewFirst(event.target.value)} placeholder={t('studies.authorFirstName')} />
            <Input value={newLast} onChange={(event) => setNewLast(event.target.value)} placeholder={t('studies.authorLastName')} />
            <Button type="button" variant="outline" onClick={addNewAuthor} disabled={!newFirst.trim() || !newLast.trim()}>{t('studies.addAuthor')}</Button>
          </div>
        </div>
      </div>

      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.centres')}</label>
        <MultiSelect options={centreItems} defaultValue={centreIds} onValueChange={setCentreIds} placeholder={t('studies.centres')} maxCount={4} />
        <Button type="button" variant="outline" size="sm" onClick={addInvestigatorsCentres}>{t('studies.addInvestigatorsCentres')}</Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>{t('studies.cancel')}</Button>
        <Button type="submit" disabled={creating || updating}>{t('studies.save')}</Button>
      </DialogFooter>
    </form>
  )
}
```

- [ ] **Step 2: `studies-manager.tsx`** (client) — table of studies (title/acronym, status badge, #articles, #investigators, #centres) with a **New study** button + edit/delete. New/Edit open a `<Dialog>` (`sm:max-w-2xl`) containing `<StudyForm authors centres study? onDone={closeDialog} />`. Fetches nothing (props: `studies`, `authors`, `centres`, and for edit it needs the full study — fetch on the server for the list is enough; for edit, pass a `getStudy` result. Simplest: edit navigates by re-using the create dialog with the study loaded via a prop — since list rows don't have full study, keep **edit minimal**: reopen the form pre-filled from a `getStudy` call is heavy; for this slice, support **create** + **delete** in the manager, and status via the list. Full edit form re-fetch is a follow-up.) Implement: `New study` dialog with `StudyForm` (no `study`); a delete AlertDialog per row. (Edit reuses `StudyForm` with `study` when available — pass `studiesFull` map if provided; otherwise omit edit button.)

> To keep Task 6 shippable: the manager supports **create** (dialog) + **delete** + list. Editing an existing study is wired the same way once `getStudy` is fetched — include an Edit button that loads the study via a lightweight client `useAction`-wrapped fetch is out of scope; leave edit for a follow-up or fetch all studies' full form data in the page. (Choose: page fetches `listStudies` for the table; the New dialog uses `authors`+`centres`.)

- [ ] **Step 3: `admin/studies/page.tsx`:**
```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listStudies } from '@/lib/services/publications/studies'
import { listAuthorOptions } from '@/lib/services/publications/authors'
import { listCentres } from '@/lib/services/publications/centres'
import { StudiesManager } from '@/app/[locale]/publications/components/studies-manager'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }
export default async function PublicationsStudiesPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications' })
  const [studies, authors, centres] = await Promise.all([listStudies(), listAuthorOptions(), listCentres()])
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('studies.title')} subtitle={t('studies.subtitle')} />
      <StudiesManager studies={studies} authors={authors} centres={centres} />
    </div>
  )
}
```

- [ ] **Step 4:** Add a `/publications/admin/studies` link on `admin/page.tsx` (in the links div).

- [ ] **Step 5:** `node -e "...JSON parse..."`; `npx tsc --noEmit` (PASS); commit `feat(publications): studies bank UI + create form (investigators, centres, inline author)`.

---

## Task 7: E2E

**Files:** Create `tests/e2e/publications-studies.spec.ts`

- [ ] **Step 1:** After seeding, `publications-admin` opens `/en/publications/admin/studies`, clicks **New study**, fills a title, picks a co-investigator (the seeded author), creates it, and sees it in the list.
```tsx
import { test, expect, type Page } from '@playwright/test'
test.setTimeout(60000)
async function login(page: Page, email: string) {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}
test('admin creates a study', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/studies', { timeout: 60000 })
  await page.getByRole('button', { name: /new study/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel(/title/i).first().fill('MULTIVALVE registry E2E')
  await page.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByRole('cell', { name: /MULTIVALVE registry E2E/i })).toBeVisible()
})
```
- [ ] **Step 2:** `npm run test:seed && npx playwright test tests/e2e/publications-studies.spec.ts` (server: testdb + fixtures on 3100). 1 passed.
- [ ] **Step 3:** commit `test(publications): e2e create a study`.

---

## DoD

- [ ] tsc green; unit green.
- [ ] Migration dev+testdb (`studies_bank`); no `migrate reset`; seed fixed.
- [ ] `/publications/admin/studies`: list + **New study** form with all fields, PI/co-investigator/centre multi-selects, "add investigators' centres", inline **new author**; create persists; delete works.
- [ ] e2e create-study passes.
- [ ] Reminder: user restarts dev server after the migration.

> Note: investigators link to **Authors** (bank). Centres via M2M, pre-fillable from investigators' primary centres. Editing an existing study's full form and article↔study attachment are follow-ups.
