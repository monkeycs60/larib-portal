# User Publication Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a portal member create a publication from "New publication" and manage it in a dedicated editor (`/publications/articles/[id]/edit`) — editable header, read-only author list with a full "request author list to admin" workflow (email + admin inbox), submission CRUD, read-only journal queue, and references — per the approved spec `docs/superpowers/specs/2026-07-15-publications-user-editor-design.md`.

**Architecture:** Server-first Next.js 15 App Router. New Prisma model `AuthorListRequest` + `Article.contributorsNote`. Services in `lib/services/publications/`, pure logic in `lib/publications/`, mutations via `next-safe-action` (`authenticatedAction` / `appAdminAction`), client editor split into focused components under `app/[locale]/publications/components/editor/`. Status is **manual** (a form select), header journal/date are **derived** from the latest submission. Edit rights = first author OR PUBLICATIONS admin.

**Tech Stack:** Next.js 15.3, Prisma/Postgres (Neon), next-safe-action, next-intl (FR/EN), React Hook Form + Zod, shadcn/ui, sonner, Resend (email), vitest, Playwright.

---

## File Structure

**Create:**
- `lib/publications/editor-logic.ts` — pure: `deriveHeaderContext`, `isDraftDeletable`, `pickAuthorRequestRecipients`. + `.test.ts`.
- `lib/services/publications/publication-editor.ts` — draft create, get-for-edit, update-core, delete-draft, first-author check.
- `lib/services/publications/journal-targets.ts` — `listJournalTargets`.
- `lib/services/publications/author-requests.ts` — request create/list/resolve + recipients.
- `app/[locale]/publications/articles/[id]/edit/page.tsx` — editor page (server).
- `app/[locale]/publications/components/editor/publication-editor.tsx` — shell (form context, save/discard).
- `app/[locale]/publications/components/editor/editor-header.tsx`
- `app/[locale]/publications/components/editor/editor-authors.tsx`
- `app/[locale]/publications/components/editor/editor-submissions.tsx`
- `app/[locale]/publications/components/editor/editor-journal-queue.tsx`
- `app/[locale]/publications/components/editor/editor-references.tsx`
- `app/[locale]/publications/components/new-publication-button.tsx` — client button (create draft → redirect).
- `app/[locale]/publications/components/admin-author-requests.tsx` — admin inbox client rows.
- `tests/e2e/publications-editor.spec.ts`

**Modify:**
- `prisma/schema.prisma` — `Article.contributorsNote`, `AuthorListRequest` model + enum, inverse relations on User/Article.
- `lib/services/publications/submissions.ts` — `updateSubmission`, `deleteSubmission`.
- `lib/services/publications/studies.ts` — `listStudyOptions`.
- `lib/services/email.ts` — `sendAuthorListRequestEmail`.
- `app/[locale]/publications/actions.ts` — 7 new actions.
- `app/[locale]/publications/page.tsx` — replace the "New publication" `Link` with `<NewPublicationButton>`.
- `app/[locale]/publications/components/publications-table.tsx` — pencil (first author) → `/publications/articles/[id]/edit`.
- `app/[locale]/publications/admin/page.tsx` — render admin inbox section.
- `messages/en.json`, `messages/fr.json` — `publications.editor.*`, `publications.adminRequests.*`.
- **Delete:** `app/[locale]/publications/new/page.tsx` (stub) + its i18n keys `myPub.newComingSoon`.

---

## Task 1: Schema — AuthorListRequest + contributorsNote

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the enum + model + relations**

Add near the other publications enums:
```prisma
enum AuthorListRequestStatus {
  PENDING
  RESOLVED
  DISMISSED
}
```

Add `contributorsNote String?` to `Article` (after `abstract`), and to `Article` relations block add:
```prisma
  authorRequests AuthorListRequest[]
```

Add to `User` relations block (after `articlesCreated`):
```prisma
  authorRequestsMade     AuthorListRequest[] @relation("AuthorListRequestedBy")
  authorRequestsResolved AuthorListRequest[] @relation("AuthorListResolvedBy")
```

Add the model (near `Submission`):
```prisma
model AuthorListRequest {
  id            String                  @id @default(cuid())
  articleId     String
  article       Article                 @relation(fields: [articleId], references: [id], onDelete: Cascade)
  requestedById String
  requestedBy   User                    @relation("AuthorListRequestedBy", fields: [requestedById], references: [id], onDelete: Cascade)
  note          String?
  status        AuthorListRequestStatus @default(PENDING)
  createdAt     DateTime                @default(now())
  resolvedAt    DateTime?
  resolvedById  String?
  resolvedBy    User?                   @relation("AuthorListResolvedBy", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@index([articleId, status])
  @@map("AuthorListRequest")
}
```

- [ ] **Step 2: Migrate (dev + testdb) and regenerate**

Run:
```bash
npx prisma migrate dev --name author_list_request
```
Expected: "migration created and applied", "Generated Prisma Client". Retry on advisory-lock timeout.

Then apply to testdb (create `scripts/_with-testenv.mjs` loading `.env.test` with `override:true`, spawning the command):
```bash
node scripts/_with-testenv.mjs npx prisma migrate deploy
```
Expected: "All migrations have been successfully applied." Remove the helper after.

- [ ] **Step 3: Commit**
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(publications): AuthorListRequest model + Article.contributorsNote"
```

**Reminder:** the user must restart their dev server (new Prisma client).

---

## Task 2: Pure editor logic + tests

**Files:**
- Create: `lib/publications/editor-logic.ts`, `lib/publications/editor-logic.test.ts`

- [ ] **Step 1: Write the failing test** (`editor-logic.test.ts`)
```typescript
import { describe, it, expect } from 'vitest'
import { deriveHeaderContext, isDraftDeletable, pickAuthorRequestRecipients } from './editor-logic'

describe('deriveHeaderContext', () => {
  it('uses the latest submission journal + date', () => {
    const ctx = deriveHeaderContext({
      submissions: [
        { journalName: 'N Engl J Med', submittedAt: '2025-01-12T00:00:00.000Z' },
        { journalName: 'European Heart Journal', submittedAt: '2025-05-18T00:00:00.000Z' },
      ],
      publishedJournal: null,
      publishedAt: null,
    })
    expect(ctx).toEqual({ journal: 'European Heart Journal', at: '2025-05-18T00:00:00.000Z' })
  })
  it('falls back to the published journal when there are no submissions', () => {
    const ctx = deriveHeaderContext({
      submissions: [],
      publishedJournal: 'Circulation',
      publishedAt: '2024-02-01T00:00:00.000Z',
    })
    expect(ctx).toEqual({ journal: 'Circulation', at: '2024-02-01T00:00:00.000Z' })
  })
  it('returns nulls when nothing is available', () => {
    expect(deriveHeaderContext({ submissions: [], publishedJournal: null, publishedAt: null }))
      .toEqual({ journal: null, at: null })
  })
})

describe('isDraftDeletable', () => {
  it('is deletable only when empty title and IN_PREPARATION', () => {
    expect(isDraftDeletable('', 'IN_PREPARATION')).toBe(true)
    expect(isDraftDeletable('  ', 'IN_PREPARATION')).toBe(true)
    expect(isDraftDeletable('Title', 'IN_PREPARATION')).toBe(false)
    expect(isDraftDeletable('', 'UNDER_REVIEW')).toBe(false)
  })
})

describe('pickAuthorRequestRecipients', () => {
  it('keeps super-admins and PUBLICATIONS app-admins, dedups, drops others', () => {
    const emails = pickAuthorRequestRecipients([
      { email: 'a@x.io', role: 'ADMIN', adminApplications: [] },
      { email: 'b@x.io', role: 'USER', adminApplications: ['PUBLICATIONS'] },
      { email: 'c@x.io', role: 'USER', adminApplications: ['CONGES'] },
      { email: 'a@x.io', role: 'ADMIN', adminApplications: ['PUBLICATIONS'] },
    ])
    expect(emails).toEqual(['a@x.io', 'b@x.io'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**
Run: `npx vitest run lib/publications/editor-logic.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** (`editor-logic.ts`)
```typescript
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

type HeaderInput = {
  submissions: Array<{ journalName: string; submittedAt: string }>
  publishedJournal: string | null
  publishedAt: string | null
}

export function deriveHeaderContext(input: HeaderInput): { journal: string | null; at: string | null } {
  const latest = input.submissions.at(-1)
  if (latest) return { journal: latest.journalName, at: latest.submittedAt }
  return { journal: input.publishedJournal, at: input.publishedAt }
}

export function isDraftDeletable(title: string, status: ArticleStatusValue): boolean {
  return title.trim() === '' && status === 'IN_PREPARATION'
}

type RecipientCandidate = { email: string; role: 'ADMIN' | 'USER'; adminApplications: string[] }

export function pickAuthorRequestRecipients(candidates: RecipientCandidate[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const candidate of candidates) {
    const isAdmin = candidate.role === 'ADMIN' || candidate.adminApplications.includes('PUBLICATIONS')
    if (!isAdmin || seen.has(candidate.email)) continue
    seen.add(candidate.email)
    result.push(candidate.email)
  }
  return result
}
```

- [ ] **Step 4: Run to verify it passes** — Run: `npx vitest run lib/publications/editor-logic.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/publications/editor-logic.ts lib/publications/editor-logic.test.ts
git commit -m "feat(publications): pure editor logic (header derive, draft deletable, recipients)"
```

---

## Task 3: publication-editor service

**Files:**
- Create: `lib/services/publications/publication-editor.ts`

- [ ] **Step 1: Implement the service**
```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import type { ArticleStatusValue } from './articles'
import { ARTICLE_TYPE_VALUES, type ArticleTypeValue } from '@/lib/publications/article-type'

export const PUBLICATIONS_ARTICLES_TAG = 'publications:articles'

async function findOrCreateAuthorForUser(userId: string): Promise<string> {
  const existing = await prisma.author.findFirst({ where: { userId }, select: { id: true } })
  if (existing) return existing.id
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  })
  const author = await prisma.author.create({
    data: {
      firstName: user.firstName ?? user.email.split('@')[0],
      lastName: user.lastName ?? '',
      userId,
    },
    select: { id: true },
  })
  return author.id
}

export async function createDraftArticle(userId: string): Promise<{ id: string }> {
  const authorId = await findOrCreateAuthorForUser(userId)
  return prisma.article.create({
    data: {
      title: '',
      status: 'IN_PREPARATION',
      type: 'ORIGINAL',
      createdById: userId,
      authorships: { create: { authorId, order: 1, isCorresponding: true } },
    },
    select: { id: true },
  })
}

export async function userIsFirstAuthor(userId: string, articleId: string): Promise<boolean> {
  const found = await prisma.authorship.findFirst({
    where: { articleId, order: 1, author: { userId } },
    select: { articleId: true },
  })
  return found != null
}

export type PublicationEditData = Awaited<ReturnType<typeof getPublicationForEdit>>

export async function getPublicationForEdit(articleId: string) {
  return prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true, title: true, type: true, status: true, studyId: true,
      pubmedId: true, doi: true, contributorsNote: true,
      publishedAt: true, publishedJournal: { select: { name: true, abbreviation: true } },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          order: true, isCorresponding: true,
          author: {
            select: {
              firstName: true, lastName: true, degrees: true, userId: true,
              centre: { select: { name: true } },
              defaultAffiliation: { select: { name: true } },
            },
          },
        },
      },
      submissions: {
        orderBy: { submittedAt: 'asc' },
        select: { id: true, submittedAt: true, status: true, decidedAt: true, journal: { select: { name: true, abbreviation: true } } },
      },
      authorRequests: { where: { status: 'PENDING' }, select: { id: true } },
    },
  })
}

export type UpdateArticleCoreInput = {
  title: string
  type: ArticleTypeValue
  status: ArticleStatusValue
  studyId: string | null
  pubmedId: string | null
  doi: string | null
  contributorsNote: string | null
}

export async function updateArticleCore(articleId: string, input: UpdateArticleCoreInput) {
  return prisma.article.update({
    where: { id: articleId },
    data: {
      title: input.title,
      type: input.type,
      status: input.status,
      studyId: input.studyId,
      pubmedId: input.pubmedId,
      doi: input.doi,
      contributorsNote: input.contributorsNote,
    },
    select: { id: true },
  })
}

export async function deleteDraft(articleId: string): Promise<{ deleted: boolean }> {
  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { title: true, status: true } })
  if (!article) return { deleted: false }
  if (article.title.trim() !== '' || article.status !== 'IN_PREPARATION') return { deleted: false }
  await prisma.article.delete({ where: { id: articleId } })
  return { deleted: true }
}

export { ARTICLE_TYPE_VALUES }
export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add lib/services/publications/publication-editor.ts
git commit -m "feat(publications): publication-editor service (draft, get-for-edit, update-core, delete-draft)"
```

---

## Task 4: Extend submissions service (edit + delete)

**Files:**
- Modify: `lib/services/publications/submissions.ts`

- [ ] **Step 1: Add `updateSubmission` and `deleteSubmission`** (before `userOwnsSubmission`)
```typescript
export type UpdateSubmissionInput = {
  submissionId: string
  journalName: string
  submittedAt: Date
}

export async function updateSubmission(input: UpdateSubmissionInput): Promise<{ id: string }> {
  const journalId = await findOrCreateJournalId(input.journalName)
  return prisma.submission.update({
    where: { id: input.submissionId },
    data: { journalId, submittedAt: input.submittedAt },
    select: { id: true },
  })
}

export async function deleteSubmission(submissionId: string): Promise<{ id: string }> {
  return prisma.submission.delete({ where: { id: submissionId }, select: { id: true } })
}
```
(`findOrCreateJournalId` already exists in this file.)

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add lib/services/publications/submissions.ts
git commit -m "feat(publications): submission update + delete services"
```

---

## Task 5: journal-targets service

**Files:**
- Create: `lib/services/publications/journal-targets.ts`

- [ ] **Step 1: Implement**
```typescript
import { prisma } from '@/lib/prisma'

export type JournalTargetItem = {
  id: string
  rank: number
  name: string
  abbreviation: string | null
  impactFactor: number | null
  sjr: number | null
}

export async function listJournalTargets(articleId: string): Promise<JournalTargetItem[]> {
  const targets = await prisma.journalTarget.findMany({
    where: { articleId },
    orderBy: { rank: 'asc' },
    select: { id: true, rank: true, journal: { select: { name: true, abbreviation: true, impactFactor: true, sjr: true } } },
  })
  return targets.map((target) => ({
    id: target.id,
    rank: target.rank,
    name: target.journal.name,
    abbreviation: target.journal.abbreviation,
    impactFactor: target.journal.impactFactor,
    sjr: target.journal.sjr,
  }))
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add lib/services/publications/journal-targets.ts
git commit -m "feat(publications): journal-targets read service"
```

---

## Task 6: author-requests service + email

**Files:**
- Create: `lib/services/publications/author-requests.ts`
- Modify: `lib/services/email.ts`

- [ ] **Step 1: Email sender** — append to `lib/services/email.ts`
```typescript
export type AuthorListRequestEmailParams = {
  recipients: string[]
  articleTitle: string
  requesterName: string
  note: string | null
}

export async function sendAuthorListRequestEmail(params: AuthorListRequestEmailParams): Promise<{ ok: boolean }> {
  if (params.recipients.length === 0) return { ok: true }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false }
  const from = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const title = params.articleTitle || 'Untitled publication'
  const subject = `Author list request — ${title}`
  const body = `${params.requesterName} requested the author list for "${title}".` +
    (params.note ? `\n\nContributors reported:\n${params.note}` : '')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: params.recipients, subject, text: body }),
  })
  return { ok: res.ok }
}
```

- [ ] **Step 2: author-requests service** (`author-requests.ts`)
```typescript
import { prisma } from '@/lib/prisma'
import { pickAuthorRequestRecipients } from '@/lib/publications/editor-logic'
import { sendAuthorListRequestEmail } from '@/lib/services/email'

export const PUBLICATIONS_REQUESTS_TAG = 'publications:requests'

export async function createAuthorListRequest(articleId: string, userId: string, note: string | null) {
  const existing = await prisma.authorListRequest.findFirst({
    where: { articleId, status: 'PENDING' },
    select: { id: true },
  })
  if (existing) throw new Error('REQUEST_EXISTS')

  const request = await prisma.authorListRequest.create({
    data: { articleId, requestedById: userId, note, status: 'PENDING' },
    select: { id: true, article: { select: { title: true } }, requestedBy: { select: { firstName: true, lastName: true, email: true } } },
  })

  const candidates = await prisma.user.findMany({
    where: { OR: [{ role: 'ADMIN' }, { adminApplications: { has: 'PUBLICATIONS' } }] },
    select: { email: true, role: true, adminApplications: true },
  })
  const recipients = pickAuthorRequestRecipients(
    candidates.map((c) => ({ email: c.email, role: c.role, adminApplications: c.adminApplications as string[] })),
  )
  const requester = request.requestedBy
  const requesterName = [requester.firstName, requester.lastName].filter(Boolean).join(' ') || requester.email
  try {
    await sendAuthorListRequestEmail({ recipients, articleTitle: request.article.title, requesterName, note })
  } catch (error) {
    console.error('sendAuthorListRequestEmail failed', error)
  }
  return { id: request.id }
}

export type PendingAuthorRequest = {
  id: string
  articleId: string
  articleTitle: string
  requesterName: string
  note: string | null
  createdAt: Date
}

export async function listPendingAuthorRequests(): Promise<PendingAuthorRequest[]> {
  const rows = await prisma.authorListRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, note: true, createdAt: true,
      article: { select: { id: true, title: true } },
      requestedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    articleId: row.article.id,
    articleTitle: row.article.title,
    requesterName: [row.requestedBy.firstName, row.requestedBy.lastName].filter(Boolean).join(' ') || row.requestedBy.email,
    note: row.note,
    createdAt: row.createdAt,
  }))
}

export async function resolveAuthorRequest(id: string, adminId: string, outcome: 'RESOLVED' | 'DISMISSED') {
  return prisma.authorListRequest.update({
    where: { id },
    data: { status: outcome, resolvedAt: new Date(), resolvedById: adminId },
    select: { id: true },
  })
}
```

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add lib/services/publications/author-requests.ts lib/services/email.ts
git commit -m "feat(publications): author-list request service + admin email"
```

---

## Task 7: study options

**Files:**
- Modify: `lib/services/publications/studies.ts`

- [ ] **Step 1: Add `listStudyOptions`** (after `listStudies`)
```typescript
export type StudyOption = { id: string; label: string }

export async function listStudyOptions(): Promise<StudyOption[]> {
  const studies = await prisma.study.findMany({
    orderBy: [{ acronym: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, acronym: true },
  })
  return studies.map((study) => ({ id: study.id, label: study.acronym ?? study.title }))
}
```

- [ ] **Step 2: Typecheck + commit**
```bash
npx tsc --noEmit
git add lib/services/publications/studies.ts
git commit -m "feat(publications): listStudyOptions for the linked-study select"
```

---

## Task 8: Server actions

**Files:**
- Modify: `app/[locale]/publications/actions.ts`

- [ ] **Step 1: Add imports**
```typescript
import { createDraftArticle, updateArticleCore, deleteDraft, userIsFirstAuthor, ARTICLE_TYPE_VALUES as EDITOR_TYPES } from '@/lib/services/publications/publication-editor'
import { updateSubmission, deleteSubmission } from '@/lib/services/publications/submissions'
import { createAuthorListRequest, resolveAuthorRequest } from '@/lib/services/publications/author-requests'
import { isFirstAuthor as _unusedIsFirst } from '@/lib/publications/status-display'
```
(Remove the last line if unused — it's only a reminder that `isFirstAuthor` exists; do not import it.)

- [ ] **Step 2: Add the actions** (append)
```typescript
async function assertCanEdit(userId: string, user: { role: 'ADMIN' | 'USER'; adminApplications: string[] } & Record<string, unknown>, articleId: string) {
  if (canAdminApp(user as never, 'PUBLICATIONS')) return
  if (await userIsFirstAuthor(userId, articleId)) return
  throw new Error('Forbidden')
}

export const createDraftArticleAction = authenticatedAction
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    return createDraftArticle(ctx.userId)
  })

export const updateArticleCoreAction = authenticatedAction
  .inputSchema(z.object({
    id: z.string().min(1),
    title: z.string(),
    type: z.enum(EDITOR_TYPES),
    status: z.enum(ARTICLE_STATUSES),
    studyId: z.string().nullable(),
    pubmedId: z.string().nullable(),
    doi: z.string().nullable(),
    contributorsNote: z.string().nullable(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await assertCanEdit(ctx.userId, ctx.user, parsedInput.id)
    const { id, ...rest } = parsedInput
    const updated = await updateArticleCore(id, {
      ...rest,
      studyId: rest.studyId || null,
      pubmedId: rest.pubmedId || null,
      doi: rest.doi || null,
      contributorsNote: rest.contributorsNote || null,
    })
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

export const deleteDraftArticleAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    await assertCanEdit(ctx.userId, ctx.user, parsedInput.id)
    return deleteDraft(parsedInput.id)
  })

export const updateSubmissionAction = authenticatedAction
  .inputSchema(z.object({ submissionId: z.string().min(1), journalName: z.string().min(1), submittedAt: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!(await userOwnsSubmission(ctx.userId, parsedInput.submissionId))) throw new Error('Forbidden')
    return updateSubmission({ submissionId: parsedInput.submissionId, journalName: parsedInput.journalName, submittedAt: new Date(parsedInput.submittedAt) })
  })

export const deleteSubmissionAction = authenticatedAction
  .inputSchema(z.object({ submissionId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!(await userOwnsSubmission(ctx.userId, parsedInput.submissionId))) throw new Error('Forbidden')
    return deleteSubmission(parsedInput.submissionId)
  })

export const requestAuthorListAction = authenticatedAction
  .inputSchema(z.object({ articleId: z.string().min(1), note: z.string().nullable() }))
  .action(async ({ parsedInput, ctx }) => {
    if (!(await userIsAuthorOfArticle(ctx.userId, parsedInput.articleId))) throw new Error('Forbidden')
    try {
      return await createAuthorListRequest(parsedInput.articleId, ctx.userId, parsedInput.note || null)
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_EXISTS') throw new Error('REQUEST_EXISTS')
      throw error
    }
  })

export const resolveAuthorRequestAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), outcome: z.enum(['RESOLVED', 'DISMISSED']) }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await resolveAuthorRequest(parsedInput.id, ctx.userId, parsedInput.outcome)
    revalidateTag('publications:requests')
    return result
  })
```
Note: `canAdminApp`, `canAccessApp`, `authenticatedAction`, `appAdminAction`, `userOwnsSubmission`, `userIsAuthorOfArticle`, `ARTICLE_STATUSES`, `PUBLICATIONS_ARTICLES_TAG`, `revalidateTag`, `z` are already imported in this file (verify; add `canAdminApp` to the permissions import if missing).

- [ ] **Step 3: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/[locale]/publications/actions.ts
git commit -m "feat(publications): editor + author-request server actions"
```

---

## Task 9: Editor page (server) + guards

**Files:**
- Create: `app/[locale]/publications/articles/[id]/edit/page.tsx`

- [ ] **Step 1: Implement**
```tsx
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { getPublicationForEdit, userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { listJournalTargets } from '@/lib/services/publications/journal-targets'
import { listStudyOptions } from '@/lib/services/publications/studies'
import { PublicationEditor } from '@/app/[locale]/publications/components/editor/publication-editor'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function EditPublicationPage({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))

  const article = await getPublicationForEdit(id)
  if (!article) notFound()

  const isAdmin = canAdminApp(session.user, 'PUBLICATIONS')
  const isFirstAuthor = await userIsFirstAuthor(session.user.id, id)
  if (!isAdmin && !isFirstAuthor) redirect(applicationLink(locale, `/publications/articles/${id}`))

  const [journalTargets, studyOptions] = await Promise.all([listJournalTargets(id), listStudyOptions()])

  return (
    <PublicationEditor
      locale={locale}
      article={article}
      journalTargets={journalTargets}
      studyOptions={studyOptions}
      viewer={{ userId: session.user.id, isFirstAuthor, isAdmin }}
    />
  )
}
```

- [ ] **Step 2: Typecheck** — will fail until `PublicationEditor` exists (Task 10). Skip run; commit after Task 10.

---

## Task 10: Editor shell + header

**Files:**
- Create: `app/[locale]/publications/components/editor/publication-editor.tsx`, `editor-header.tsx`

**`publication-editor.tsx`** — responsibilities:
- `'use client'`. Props (≤5): `{ locale, article, journalTargets, studyOptions, viewer }`.
- RHF `useForm` with defaults from `article` (title, type, status, studyId ?? '', pubmedId ?? '', doi ?? '', contributorsNote ?? '').
- `useAction(updateArticleCoreAction)` → onSuccess toast `editor.saved` + `router.refresh()` + `form.reset(currentValues)`; onError toast.
- `useAction(deleteDraftArticleAction)` for Discard-on-empty-draft.
- Top bar: breadcrumb (`My publications` link → `/publications`, `Edit publication`, unsaved-changes dot when `form.formState.isDirty`), **Discard** (if dirty → `form.reset(defaults)`; if pristine AND `isDraftDeletable(defaults.title, defaults.status)` → `deleteDraftArticleAction` then `router.push('/publications')`), **Save changes** (coral gradient; `form.handleSubmit` → execute action).
- Layout: header card full width; then a 2-col grid `lg:grid-cols-2 gap-5` with left = authors + references stacked, right = submissions + journal-queue stacked (matches mockups). Uses `app-gradient` page wrapper, `max-w-[1800px]`.
- Renders `<EditorHeader>`, `<EditorAuthors>`, `<EditorSubmissions>`, `<EditorJournalQueue>`, `<EditorReferences>`, passing the RHF `control`/`register` where those cards own form fields (header: title/type/status; references: pubmedId/doi/studyId; authors: contributorsNote).

**`editor-header.tsx`** — props `{ article, viewer, form }` (form = the RHF methods subset). Coral-accent card: badge `viewer.isFirstAuthor ? editor.firstAuthorCanEdit : editor.adminCanEdit`, year (from derived `at`), study chip; inline-editable **title** input (large, borderless, pencil affordance); **Type** select (`ARTICLE_TYPE_VALUES` → `myPub.type.*`) and **Status** select (`ARTICLE_STATUSES` → `articles.status.*`); derived info pill using `deriveHeaderContext` + `articles.status.<status>` + Intl relative date (`editor.statusAtJournal`).

- [ ] **Step 1: Implement both files** (full code written during execution following the above; reuse tokens/patterns from `page.tsx` + `publications-table.tsx`).
- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: no errors (with Task 9 page present).
- [ ] **Step 3: Commit**
```bash
git add app/[locale]/publications/articles/[id]/edit/page.tsx app/[locale]/publications/components/editor/publication-editor.tsx app/[locale]/publications/components/editor/editor-header.tsx
git commit -m "feat(publications): editor shell + header card"
```

---

## Task 11: Authors + References cards

**Files:**
- Create: `editor-authors.tsx`, `editor-references.tsx`

**`editor-authors.tsx`** — props `{ article, viewer, form, articleId }` (bundle to ≤5). Shows "AUTHORS N", "The full co-author list is proposed and maintained by the admin.", numbered author rows (name with `LASTNAME` uppercased, degrees badges, **YOU** badge when `author.userId === viewer.userId`, **Corresponding** badge, centre/affiliation subtitle). Divider. "Report contributors to the study" + textarea bound to `contributorsNote`. **Request author list to admin** button → `useAction(requestAuthorListAction)`; disabled + label `editor.alreadyRequested` when `article.authorRequests.length > 0`; onSuccess toast `editor.requestSent` + `router.refresh()`; onError: if `REQUEST_EXISTS` toast `editor.alreadyRequested` else generic. The note sent = current `contributorsNote` field value.

**`editor-references.tsx`** — props `{ form, studyOptions }`. Card "REFERENCES" + "No references yet · fill them in when available." PMID input (`pubmedId`), DOI input (`doi`), Linked study `<select>` (`studyId`) over `studyOptions` + a "Select a study" empty option.

- [ ] **Step 1: Implement both.**
- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: no errors.
- [ ] **Step 3: Commit**
```bash
git add app/[locale]/publications/components/editor/editor-authors.tsx app/[locale]/publications/components/editor/editor-references.tsx
git commit -m "feat(publications): editor authors + references cards"
```

---

## Task 12: Submissions card (add/edit/delete)

**Files:**
- Create: `editor-submissions.tsx`

Reuse the visual language and status logic of `submission-history.tsx` (dots/line, `SUBMISSION_STATUSES`, `pillClassName`, `TONE_DOT_HEX`). Props `{ articleId, submissions, locale }`. Per submission: journal + "Submitted on {date} · {decision}", status dropdown (reuse `updateSubmissionStatusAction`), **edit** button → inline row (journal input + date input) → `useAction(updateSubmissionAction)`, **delete** button → confirm (shadcn AlertDialog) → `useAction(deleteSubmissionAction)`. "Add a submission" identical to existing add flow (`addSubmissionAction`). All onSuccess → toast + `router.refresh()`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: no errors.
- [ ] **Step 3: Commit**
```bash
git add app/[locale]/publications/components/editor/editor-submissions.tsx
git commit -m "feat(publications): editor submissions card with edit/delete"
```

---

## Task 13: Journal queue card

**Files:**
- Create: `editor-journal-queue.tsx`

Props `{ targets }` (`JournalTargetItem[]`). Card "JOURNAL LIST" + "Submission queue proposed by the admin · read-only." Ranked rows: numbered chip + journal name (bold) + `IF {impactFactor} · SJR {sjr}` subtitle (omit missing metrics). Empty state `editor.journalQueueEmpty` when no targets.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/[locale]/publications/components/editor/editor-journal-queue.tsx
git commit -m "feat(publications): editor journal-queue card (read-only)"
```

---

## Task 14: Wire entry points

**Files:**
- Create: `app/[locale]/publications/components/new-publication-button.tsx`
- Modify: `app/[locale]/publications/page.tsx`, `app/[locale]/publications/components/publications-table.tsx`
- Delete: `app/[locale]/publications/new/page.tsx`

**`new-publication-button.tsx`** — `'use client'`, props `{ locale }`. `useAction(createDraftArticleAction)` → onSuccess `router.push(applicationLink(locale, \`/publications/articles/${data.id}/edit\`))`. Renders the coral gradient button (same styles as the current `Link`).

- [ ] **Step 1:** Implement the button; in `page.tsx` replace the `<Link href="/publications/new">…</Link>` with `<NewPublicationButton locale={locale} />`.
- [ ] **Step 2:** In `publications-table.tsx`, the first-author pencil `Link` → `/publications/articles/${item.id}/edit` (co-author eye stays `/publications/articles/${item.id}`).
- [ ] **Step 3:** `rm app/[locale]/publications/new/page.tsx` (and remove `myPub.newComingSoon` / `myPub.backToList`-if-unused keys later in Task 15's i18n pass — keep `backToList`, it may be reused).
- [ ] **Step 4: Typecheck + commit**
```bash
npx tsc --noEmit
git add -A
git commit -m "feat(publications): New publication creates a draft + opens editor; pencil → edit"
```

---

## Task 15: Admin inbox (author list requests)

**Files:**
- Create: `app/[locale]/publications/components/admin-author-requests.tsx`
- Modify: `app/[locale]/publications/admin/page.tsx`

**`admin-author-requests.tsx`** — `'use client'`, props `{ requests, locale }` (`PendingAuthorRequest[]`). Section "Author list requests (N)". Each row: article title (Link → `/publications/articles/{id}`), requester, note, date; **Resolve** + **Dismiss** buttons → `useAction(resolveAuthorRequestAction)` → toast + `router.refresh()`. Empty state.

- [ ] **Step 1:** Implement the client component.
- [ ] **Step 2:** In `admin/page.tsx`, `const requests = await listPendingAuthorRequests()` and render `<AdminAuthorRequests requests={requests} locale={locale} />` above/below the existing admin links.
- [ ] **Step 3: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/[locale]/publications/components/admin-author-requests.tsx app/[locale]/publications/admin/page.tsx
git commit -m "feat(publications): admin inbox for author-list requests"
```

---

## Task 16: i18n (EN/FR)

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1:** Add `publications.editor.*` and `publications.adminRequests.*` blocks (all keys referenced in Tasks 10–15): breadcrumb, editPublication, unsavedChanges, save, discard, saved, deleted, discardDraftConfirm, firstAuthorCanEdit, adminCanEdit, statusAtJournal, titlePlaceholder, authorsTitle, authorsManagedByAdmin, you, corresponding, contributorsLabel, contributorsHint, contributorsPlaceholder, requestAuthorList, requestSent, alreadyRequested, submissionsTitle, addSubmission, editSubmission, deleteSubmission, deleteSubmissionConfirm, journalListTitle, journalQueueSubtitle, journalQueueEmpty, referencesTitle, referencesSubtitle, pmid, addPmid, doi, addDoi, linkedStudy, selectStudy, actionError; and `adminRequests`: title, empty, requestedBy, resolve, dismiss, resolved, dismissed. Remove `myPub.newComingSoon`.
- [ ] **Step 2:** `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('JSON OK')"` + `npx tsc --noEmit`.
- [ ] **Step 3: Commit**
```bash
git add messages/en.json messages/fr.json
git commit -m "i18n(publications): editor + admin-requests strings"
```

---

## Task 17: E2E + verification

**Files:**
- Create: `tests/e2e/publications-editor.spec.ts`

- [ ] **Step 1:** One flow: login `publications-user` → click "New publication" → assert editor URL `**/edit` → fill title + select type/status → Save → assert "saved" toast → "Add a submission" (journal + date + status) → assert it appears → click "Request author list to admin" → assert `requestSent`. Then login `publications-admin` → `/publications/admin` → assert the request row → click Resolve → assert it disappears.
- [ ] **Step 2:** Run against testdb (restore first: `migrate deploy` + `npm run test:seed`), via the port-3100 server + a temp `playwright.editor.config.ts`. Expected: PASS.
- [ ] **Step 3:** `npm run test:unit` (all pass), `npx tsc --noEmit` (clean). Clean up temp harness files.
- [ ] **Step 4: Commit**
```bash
git add tests/e2e/publications-editor.spec.ts
git commit -m "test(publications): e2e editor + author-request flow"
```

---

## Self-review notes
- Spec coverage: draft-create (T3/T8/T14), editor page+guards (T9), header manual status + derived journal (T2/T10), authors + contributor note + request+email+idempotency (T2/T6/T8/T11), submissions CRUD (T4/T8/T12), journal queue read-only (T5/T13), references (T11), admin inbox (T6/T8/T15), i18n (T16), tests (T2/T17). ✓
- Deferred per spec: admin journal-queue management, PDF, PubMed auto-fill, other emails. ✓
- Type consistency: `UpdateArticleCoreInput`, `JournalTargetItem`, `PendingAuthorRequest`, `StudyOption`, `PublicationEditData` used consistently across service→action→page→component.
