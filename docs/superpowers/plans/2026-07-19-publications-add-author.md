# Publications Add Author — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any Publications member or admin add a new author to the bank — either manually or by pulling authors from a DOI/PMID — with duplicate protection.

**Architecture:** New member-gated routes under `app/[locale]/publications/authors/`. A data-preserving Prisma migration adds `AuthorType`, an `emails` array, and `AuthorCentre` / `AuthorAffiliation` join tables (legacy `centreId`/`email` kept in sync so existing readers are untouched). Pure helpers (name-normalize, dedup, Crossref parse) are unit-tested; the network lookup sits behind a fixture-dir seam mirroring `pubmed.ts` so E2E stays offline.

**Tech Stack:** Next.js 15 App Router, Prisma/Postgres, next-safe-action, React Hook Form + Zod, shadcn/ui, next-intl, Vitest (unit), Playwright (E2E).

**Reference spec:** `docs/superpowers/specs/2026-07-19-publications-add-author-design.md`

---

## File Structure

- `prisma/schema.prisma` — add enum + 2 models + relations (modify)
- `prisma/migrations/<ts>_add_author_type_emails_centres_affiliations/migration.sql` — create
- `prisma/seed.test.ts` — add centres to the bank + set `emails` (modify)
- `actions/safe-action.ts` — add `appMemberAction` factory (modify)
- `lib/services/publications/author-dedup.ts` — `normalizeName`, `findAuthorDuplicates`, `matchAuthorsAgainstBank` (create)
- `lib/services/publications/authors.ts` — `buildAuthorCreateData` + extend `createAuthor` (modify)
- `lib/services/publications/publication-lookup.ts` — Crossref parse + `fetchPublicationByIdentifier` (create)
- `app/[locale]/publications/actions.ts` — re-gate + extend `createAuthorAction`, add 2 lookup actions (modify)
- `app/[locale]/publications/authors/page.tsx` — member authors list (create)
- `app/[locale]/publications/authors/new/page.tsx` — add-author server page (create)
- `app/[locale]/publications/components/add-author-form.tsx` — tab shell (create)
- `app/[locale]/publications/components/manual-entry-form.tsx` — manual tab (create)
- `app/[locale]/publications/components/doi-import-panel.tsx` — DOI tab (create)
- `app/[locale]/publications/components/author-dedup-list.tsx` — fetched-authors list (create)
- `messages/en.json`, `messages/fr.json` — `publications.authors.add.*` (modify)
- `tests/e2e/fixtures/crossref/work-nejm.json` — Crossref fixture (create)
- `tests/e2e/fixtures/pubmed/` — reuse existing dir (records.json) (maybe add)
- `lib/services/publications/author-dedup.test.ts` — unit (create)
- `lib/services/publications/publication-lookup.test.ts` — unit (create)
- `lib/services/publications/authors-build.test.ts` — unit for `buildAuthorCreateData` (create)
- `tests/e2e/publications-add-author.spec.ts` — E2E (create)
- `playwright.config.ts` — ensure `CROSSREF_FIXTURE_DIR` + `PUBMED_FIXTURE_DIR` set for E2E (modify)

---

## Task 1: Prisma schema — enum, arrays, join tables

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `AuthorType` enum**

Near the other enums (after `Application`), add:

```prisma
enum AuthorType {
  OUR_TEAM
  EXTERNAL
}
```

- [ ] **Step 2: Extend the `Author` model**

In `model Author { ... }` add these fields/relations (leave existing `degrees`, `email`, `centreId` as-is):

```prisma
  type              AuthorType          @default(OUR_TEAM)
  emails            String[]            @default([])
  centres           AuthorCentre[]
  paperAffiliations AuthorAffiliation[]
```

- [ ] **Step 3: Add the two join models**

After the `Author` model add:

```prisma
model AuthorCentre {
  id        String  @id @default(cuid())
  authorId  String
  author    Author  @relation(fields: [authorId], references: [id], onDelete: Cascade)
  centreId  String
  centre    Centre  @relation("CentreAuthorLinks", fields: [centreId], references: [id], onDelete: Cascade)
  isPrimary Boolean @default(false)
  order     Int
  createdAt DateTime @default(now())

  @@unique([authorId, centreId])
  @@index([centreId])
}

model AuthorAffiliation {
  id       String @id @default(cuid())
  authorId String
  author   Author @relation(fields: [authorId], references: [id], onDelete: Cascade)
  raw      String
  order    Int

  @@index([authorId])
}
```

- [ ] **Step 4: Add the back-relation on `Centre`**

In `model Centre { ... }` add:

```prisma
  authorLinks AuthorCentre[] @relation("CentreAuthorLinks")
```

- [ ] **Step 5: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🎉`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(publications): author type, emails, centre & affiliation joins in schema"
```

---

## Task 2: Create & apply the migration

**Files:**
- Create: `prisma/migrations/<timestamp>_author_type_emails_centres/migration.sql`

- [ ] **Step 1: Generate the migration (without applying auto data-loss)**

Run: `npx prisma migrate dev --name author_type_emails_centres --create-only`
Expected: a new migration folder is created; NOT yet applied.

- [ ] **Step 2: Verify the generated SQL is additive**

Open the generated `migration.sql`. Confirm it only CREATEs the enum/tables and ADDs columns (`type`, `emails`) — it must NOT drop or retype `degrees`, `email`, or `centreId`. It should look like:

```sql
CREATE TYPE "AuthorType" AS ENUM ('OUR_TEAM', 'EXTERNAL');
ALTER TABLE "Author" ADD COLUMN "type" "AuthorType" NOT NULL DEFAULT 'OUR_TEAM';
ALTER TABLE "Author" ADD COLUMN "emails" TEXT[] DEFAULT ARRAY[]::TEXT[];
CREATE TABLE "AuthorCentre" ( ... );
CREATE TABLE "AuthorAffiliation" ( ... );
-- FKs + indexes
```

- [ ] **Step 3: Append the backfill SQL**

At the end of `migration.sql`, add the data backfill (seed emails from the legacy column, and one primary AuthorCentre per author that has a centre):

```sql
-- Backfill emails[] from legacy single email
UPDATE "Author" SET "emails" = ARRAY["email"] WHERE "email" IS NOT NULL AND "email" <> '';

-- Backfill AuthorCentre from the denormalized primary centreId
INSERT INTO "AuthorCentre" ("id", "authorId", "centreId", "isPrimary", "order", "createdAt")
SELECT gen_random_uuid()::text, "id", "centreId", true, 0, now()
FROM "Author"
WHERE "centreId" IS NOT NULL;
```

- [ ] **Step 4: Apply the migration**

Run: `npx prisma migrate dev`
Expected: migration applies, `Prisma Client` regenerated. (Do NOT run `migrate reset`.)

- [ ] **Step 5: Restart the dev server**

Per project memory: after a migration adding fields, the running `npm run dev` holds a stale client. Stop and restart it (or note to the executor to restart) so writes with the new fields succeed.

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations
git commit -m "feat(publications): migration for author type, emails, centre/affiliation joins"
```

---

## Task 3: Duplicate-detection helpers (pure, TDD)

**Files:**
- Create: `lib/services/publications/author-dedup.ts`
- Test: `lib/services/publications/author-dedup.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeName, pickDuplicates, matchAuthorsAgainstBank } from './author-dedup'

describe('normalizeName', () => {
  it('lowercases, strips accents and collapses spaces', () => {
    expect(normalizeName('  Pierre   Lefèvre ')).toBe('pierre lefevre')
    expect(normalizeName("James  O'Connor")).toBe("james o'connor")
  })
})

describe('pickDuplicates', () => {
  const bank = [
    { id: 'a1', firstName: 'Pierre', lastName: 'Lefèvre', orcid: '0000-0002-1825-0097' },
    { id: 'a2', firstName: 'Sofia', lastName: 'Marino', orcid: null },
  ]
  it('returns an ORCID match when orcid collides', () => {
    const r = pickDuplicates(bank, { orcid: '0000-0002-1825-0097', firstName: 'X', lastName: 'Y' })
    expect(r.orcidMatch?.id).toBe('a1')
    expect(r.nameMatches).toHaveLength(0)
  })
  it('returns name matches (accent-insensitive) when no orcid collision', () => {
    const r = pickDuplicates(bank, { orcid: null, firstName: 'pierre', lastName: 'lefevre' })
    expect(r.orcidMatch).toBeNull()
    expect(r.nameMatches.map((m) => m.id)).toEqual(['a1'])
  })
})

describe('matchAuthorsAgainstBank', () => {
  const bank = [{ id: 'a1', firstName: 'Pierre', lastName: 'Lefèvre', orcid: '0000-0002-1825-0097' }]
  it('flags existing by orcid and new otherwise', () => {
    const rows = matchAuthorsAgainstBank(bank, [
      { firstName: 'Pierre', lastName: 'Lefevre', orcid: '0000-0002-1825-0097' },
      { firstName: 'Sofia', lastName: 'Marino', orcid: '0000-0002-9931-5522' },
    ])
    expect(rows[0]).toMatchObject({ status: 'existing', existingId: 'a1' })
    expect(rows[1]).toMatchObject({ status: 'new' })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- author-dedup`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
export type BankAuthor = { id: string; firstName: string; lastName: string; orcid: string | null }
export type NameQuery = { orcid: string | null; firstName: string; lastName: string }
export type FetchedAuthorLite = { firstName: string; lastName: string; orcid?: string | null }

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function fullKey(firstName: string, lastName: string): string {
  return `${normalizeName(firstName)}|${normalizeName(lastName)}`
}

function normalizeOrcid(orcid: string | null | undefined): string | null {
  if (!orcid) return null
  const trimmed = orcid.trim()
  return trimmed.length ? trimmed : null
}

export function pickDuplicates(
  bank: BankAuthor[],
  query: NameQuery,
): { orcidMatch: BankAuthor | null; nameMatches: BankAuthor[] } {
  const queryOrcid = normalizeOrcid(query.orcid)
  const orcidMatch = queryOrcid
    ? bank.find((author) => normalizeOrcid(author.orcid) === queryOrcid) ?? null
    : null
  if (orcidMatch) return { orcidMatch, nameMatches: [] }
  const key = fullKey(query.firstName, query.lastName)
  const nameMatches = bank.filter((author) => fullKey(author.firstName, author.lastName) === key)
  return { orcidMatch: null, nameMatches }
}

export type MatchedAuthor<T extends FetchedAuthorLite> = T & {
  status: 'existing' | 'new'
  existingId?: string
}

export function matchAuthorsAgainstBank<T extends FetchedAuthorLite>(
  bank: BankAuthor[],
  fetched: T[],
): MatchedAuthor<T>[] {
  return fetched.map((author) => {
    const { orcidMatch, nameMatches } = pickDuplicates(bank, {
      orcid: author.orcid ?? null,
      firstName: author.firstName,
      lastName: author.lastName,
    })
    const existing = orcidMatch ?? nameMatches[0] ?? null
    return existing
      ? { ...author, status: 'existing' as const, existingId: existing.id }
      : { ...author, status: 'new' as const }
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:unit -- author-dedup`
Expected: PASS (3 describes green).

- [ ] **Step 5: Add the DB-backed `findAuthorDuplicates` wrapper**

Append to `author-dedup.ts`:

```typescript
import { prisma } from '@/lib/prisma'

export async function findAuthorDuplicates(query: NameQuery) {
  const bank = await prisma.author.findMany({
    select: { id: true, firstName: true, lastName: true, orcid: true },
  })
  return pickDuplicates(bank, query)
}
```

(No unit test — it is a thin Prisma wrapper over the tested `pickDuplicates`; covered by E2E.)

- [ ] **Step 6: Commit**

```bash
git add lib/services/publications/author-dedup.ts lib/services/publications/author-dedup.test.ts
git commit -m "feat(publications): author duplicate-detection helpers"
```

---

## Task 4: Extend `createAuthor` via a pure builder (TDD)

**Files:**
- Modify: `lib/services/publications/authors.ts`
- Test: `lib/services/publications/authors-build.test.ts`

- [ ] **Step 1: Write the failing test for the pure builder**

```typescript
import { describe, it, expect } from 'vitest'
import { buildAuthorCreateData } from './authors'

describe('buildAuthorCreateData', () => {
  it('maps full input incl. primary centre, emails mirror and affiliations', () => {
    const data = buildAuthorCreateData({
      firstName: 'Sofia',
      lastName: 'Marino',
      type: 'EXTERNAL',
      degrees: 'MD, PhD',
      emails: ['sofia@uni.it', 'sm@lab.it'],
      orcid: '0000-0002-9931-5522',
      centreIds: ['c1', 'c2'],
      affiliations: ['Università degli Studi di Milano, Italy'],
      userId: null,
    })
    expect(data.type).toBe('EXTERNAL')
    expect(data.emails).toEqual(['sofia@uni.it', 'sm@lab.it'])
    expect(data.email).toBe('sofia@uni.it')       // legacy mirror = first
    expect(data.centreId).toBe('c1')              // denormalized primary = first
    expect(data.centres.create).toEqual([
      { centreId: 'c1', isPrimary: true, order: 0 },
      { centreId: 'c2', isPrimary: false, order: 1 },
    ])
    expect(data.paperAffiliations.create).toEqual([
      { raw: 'Università degli Studi di Milano, Italy', order: 0 },
    ])
  })

  it('defaults empty collections and null mirrors', () => {
    const data = buildAuthorCreateData({ firstName: 'A', lastName: 'B' })
    expect(data.type).toBe('OUR_TEAM')
    expect(data.emails).toEqual([])
    expect(data.email).toBeNull()
    expect(data.centreId).toBeNull()
    expect(data.centres.create).toEqual([])
    expect(data.paperAffiliations.create).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- authors-build`
Expected: FAIL — `buildAuthorCreateData` not exported.

- [ ] **Step 3: Implement the builder + rewire `createAuthor`**

In `lib/services/publications/authors.ts`, replace the `CreateAuthorInput`/`createAuthor` block with:

```typescript
import type { AuthorType, Prisma } from '@/app/generated/prisma'

export type CreateAuthorInput = {
  firstName: string
  lastName: string
  type?: AuthorType
  degrees?: string | null
  emails?: string[]
  orcid?: string | null
  centreIds?: string[]
  affiliations?: string[]
  userId?: string | null
}

export function buildAuthorCreateData(input: CreateAuthorInput): Prisma.AuthorCreateInput & {
  centres: { create: { centreId: string; isPrimary: boolean; order: number }[] }
  paperAffiliations: { create: { raw: string; order: number }[] }
} {
  const emails = (input.emails ?? []).map((email) => email.trim()).filter(Boolean)
  const centreIds = input.centreIds ?? []
  const affiliations = (input.affiliations ?? []).map((raw) => raw.trim()).filter(Boolean)
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    type: input.type ?? 'OUR_TEAM',
    degrees: input.degrees ?? null,
    emails,
    email: emails[0] ?? null,
    orcid: input.orcid ?? null,
    centreId: centreIds[0] ?? null,
    user: input.userId ? { connect: { id: input.userId } } : undefined,
    centres: {
      create: centreIds.map((centreId, index) => ({
        centreId,
        isPrimary: index === 0,
        order: index,
      })),
    },
    paperAffiliations: {
      create: affiliations.map((raw, index) => ({ raw, order: index })),
    },
  }
}

export async function createAuthor(input: CreateAuthorInput) {
  return prisma.author.create({
    data: buildAuthorCreateData(input),
    select: { id: true, firstName: true, lastName: true },
  })
}
```

Note: `user: { connect }` cannot coexist with a scalar `userId` in `AuthorCreateInput`; the builder returns `user` (relation) form, which is compatible with the pure test asserting `centres`/`paperAffiliations`/`emails`/`email`/`centreId` (the test does not assert on `user`). Keep the `type`, `emails`, `centres`, `paperAffiliations` keys exactly as asserted.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:unit -- authors-build`
Expected: PASS.

- [ ] **Step 5: Full unit suite still green**

Run: `npm run test:unit`
Expected: PASS (no regressions in existing author tests).

- [ ] **Step 6: Commit**

```bash
git add lib/services/publications/authors.ts lib/services/publications/authors-build.test.ts
git commit -m "feat(publications): extend createAuthor with type, emails, centres, affiliations, user link"
```

---

## Task 5: Publication lookup service (Crossref parse + seam, TDD)

**Files:**
- Create: `lib/services/publications/publication-lookup.ts`
- Create: `tests/e2e/fixtures/crossref/work-nejm.json`
- Test: `lib/services/publications/publication-lookup.test.ts`

- [ ] **Step 1: Add the Crossref fixture**

Create `tests/e2e/fixtures/crossref/work-nejm.json` (a trimmed real-shaped Crossref `works/{doi}` response):

```json
{
  "message": {
    "DOI": "10.1056/nejmoa2501144",
    "title": ["Transcatheter aortic-valve replacement in low-risk patients: 5-year outcomes of a randomized trial"],
    "container-title": ["N Engl J Med"],
    "published": { "date-parts": [[2025, 3, 1]] },
    "author": [
      { "given": "Pierre", "family": "Lefèvre", "ORCID": "https://orcid.org/0000-0002-1825-0097", "affiliation": [{ "name": "Hôpital Lariboisière, AP-HP, Paris" }] },
      { "given": "Sofia", "family": "Marino", "ORCID": "https://orcid.org/0000-0002-9931-5522", "affiliation": [{ "name": "Università degli Studi di Milano, Italy" }] },
      { "given": "James", "family": "O'Connor", "affiliation": [{ "name": "Cleveland Clinic, Ohio, USA" }] }
    ]
  }
}
```

- [ ] **Step 2: Write the failing test**

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseCrossrefWork } from './publication-lookup'

const work = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/e2e/fixtures/crossref/work-nejm.json'), 'utf8'),
)

describe('parseCrossrefWork', () => {
  it('maps title, journal, year and authors (given/family/orcid/affiliation)', () => {
    const pub = parseCrossrefWork(work)
    expect(pub.source).toBe('doi')
    expect(pub.doi).toBe('10.1056/nejmoa2501144')
    expect(pub.title).toContain('Transcatheter aortic-valve replacement')
    expect(pub.journal).toBe('N Engl J Med')
    expect(pub.year).toBe(2025)
    expect(pub.authors).toHaveLength(3)
    expect(pub.authors[0]).toEqual({
      firstName: 'Pierre',
      lastName: 'Lefèvre',
      orcid: '0000-0002-1825-0097',
      affiliationRaw: 'Hôpital Lariboisière, AP-HP, Paris',
    })
    expect(pub.authors[2].orcid).toBeNull()
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:unit -- publication-lookup`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the service (parse + seam + PMID reuse)**

```typescript
import 'server-only'
import { fetchByPmids } from './pubmed'
import type { PubmedRecord } from '@/types/publications'

export type FetchedAuthor = {
  firstName: string
  lastName: string
  orcid: string | null
  affiliationRaw: string | null
}

export type FetchedPublication = {
  source: 'doi' | 'pmid'
  doi: string | null
  pmid: string | null
  title: string
  journal: string | null
  year: number | null
  authors: FetchedAuthor[]
}

const CROSSREF_FIXTURE_DIR = process.env.CROSSREF_FIXTURE_DIR

function stripOrcid(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i)
  return match ? match[1] : null
}

export function parseCrossrefWork(json: unknown): FetchedPublication {
  const message = (json as { message?: Record<string, unknown> }).message ?? {}
  const authorsRaw = (message['author'] as Array<Record<string, unknown>> | undefined) ?? []
  const dateParts = (message['published'] as { 'date-parts'?: number[][] } | undefined)?.['date-parts']
  const year = dateParts?.[0]?.[0] ?? null
  const title = ((message['title'] as string[] | undefined) ?? [])[0] ?? ''
  const journal = ((message['container-title'] as string[] | undefined) ?? [])[0] ?? null
  const authors: FetchedAuthor[] = authorsRaw.map((author) => {
    const affiliation = (author['affiliation'] as Array<{ name?: string }> | undefined)?.[0]?.name ?? null
    return {
      firstName: (author['given'] as string | undefined)?.trim() ?? '',
      lastName: (author['family'] as string | undefined)?.trim() ?? '',
      orcid: stripOrcid(author['ORCID'] as string | undefined),
      affiliationRaw: affiliation,
    }
  })
  return {
    source: 'doi',
    doi: ((message['DOI'] as string | undefined) ?? null),
    pmid: null,
    title,
    journal,
    year,
    authors,
  }
}

function pubmedRecordToPublication(record: PubmedRecord): FetchedPublication {
  return {
    source: 'pmid',
    doi: record.doi,
    pmid: record.pmid,
    title: record.title,
    journal: record.journal.name,
    year: record.publishedAt ? Number(record.publishedAt.slice(0, 4)) : null,
    authors: record.authors.map((author) => ({
      firstName: author.foreName?.trim() ?? '',
      lastName: author.lastName.trim(),
      orcid: author.orcid,
      affiliationRaw: author.affiliation,
    })),
  }
}

async function fetchCrossrefWork(doi: string): Promise<FetchedPublication> {
  if (CROSSREF_FIXTURE_DIR) {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const json = JSON.parse(await readFile(join(CROSSREF_FIXTURE_DIR, 'work-nejm.json'), 'utf8'))
    return parseCrossrefWork(json)
  }
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('CROSSREF_FETCH_FAILED')
  return parseCrossrefWork(await res.json())
}

export function classifyIdentifier(raw: string): { kind: 'doi' | 'pmid'; value: string } | null {
  const value = raw.trim()
  if (!value) return null
  if (/^10\.\d{4,9}\//.test(value)) return { kind: 'doi', value }
  if (/^\d+$/.test(value)) return { kind: 'pmid', value }
  const doiInUrl = value.match(/10\.\d{4,9}\/[^\s]+/)
  if (doiInUrl) return { kind: 'doi', value: doiInUrl[0] }
  return null
}

export async function fetchPublicationByIdentifier(raw: string): Promise<FetchedPublication> {
  const parsed = classifyIdentifier(raw)
  if (!parsed) throw new Error('INVALID_IDENTIFIER')
  if (parsed.kind === 'doi') return fetchCrossrefWork(parsed.value)
  const records = await fetchByPmids([parsed.value])
  if (records.length === 0) throw new Error('PUBLICATION_NOT_FOUND')
  return pubmedRecordToPublication(records[0])
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:unit -- publication-lookup`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/services/publications/publication-lookup.ts lib/services/publications/publication-lookup.test.ts tests/e2e/fixtures/crossref
git commit -m "feat(publications): DOI/PMID publication lookup with Crossref parse and fixture seam"
```

---

## Task 6: `appMemberAction` factory

**Files:**
- Modify: `actions/safe-action.ts`

- [ ] **Step 1: Add the factory**

After `appAdminAction`, add (import `canAccessApp`):

```typescript
import { canAccessApp } from '@/lib/permissions'

export const appMemberAction = (app: Application) =>
  authenticatedAction.use(async ({ next, ctx }) => {
    if (!canAccessApp(ctx.user, app)) {
      throw new Error('Forbidden')
    }
    return next({ ctx })
  })
```

Update the existing import line to include `canAccessApp` alongside `canAdminApp, isSuperAdmin`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add actions/safe-action.ts
git commit -m "feat(actions): appMemberAction factory (canAccessApp gate)"
```

---

## Task 7: Actions — create (dup flow) + DOI/PMID fetch + bulk add

**Files:**
- Modify: `app/[locale]/publications/actions.ts`

- [ ] **Step 1: Update imports**

Add to the top imports:

```typescript
import { appMemberAction } from '@/actions/safe-action'
import { createAuthor } from '@/lib/services/publications/authors'
import { findAuthorDuplicates, matchAuthorsAgainstBank } from '@/lib/services/publications/author-dedup'
import { fetchPublicationByIdentifier } from '@/lib/services/publications/publication-lookup'
import { AuthorType } from '@/app/generated/prisma'
```

(Keep the existing `createAuthor` import if already present — dedupe so it is imported once.)

- [ ] **Step 2: Replace `createAuthorAction` with the member-gated, extended version**

```typescript
const CreateAuthorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  type: z.nativeEnum(AuthorType).default(AuthorType.OUR_TEAM),
  degrees: z.array(z.string()).default([]),
  emails: z.array(z.string().email()).default([]),
  orcid: z.string().trim().optional().nullable(),
  centreIds: z.array(z.string()).default([]),
  affiliations: z.array(z.string()).default([]),
  userId: z.string().optional().nullable(),
  confirmDuplicate: z.boolean().default(false),
})

export const createAuthorAction = appMemberAction('PUBLICATIONS')
  .inputSchema(CreateAuthorSchema)
  .action(async ({ parsedInput }) => {
    const { orcidMatch, nameMatches } = await findAuthorDuplicates({
      orcid: parsedInput.orcid ?? null,
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
    })
    if (orcidMatch) {
      return {
        status: 'blocked' as const,
        reason: 'ORCID' as const,
        match: { id: orcidMatch.id, firstName: orcidMatch.firstName, lastName: orcidMatch.lastName },
      }
    }
    if (nameMatches.length > 0 && !parsedInput.confirmDuplicate) {
      return {
        status: 'warning' as const,
        reason: 'NAME' as const,
        matches: nameMatches.map((match) => ({ id: match.id, firstName: match.firstName, lastName: match.lastName })),
      }
    }
    const created = await createAuthor({
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      type: parsedInput.type,
      degrees: parsedInput.degrees.length ? parsedInput.degrees.join(', ') : null,
      emails: parsedInput.emails,
      orcid: parsedInput.orcid ?? null,
      centreIds: parsedInput.centreIds,
      affiliations: parsedInput.affiliations,
      userId: parsedInput.userId ?? null,
    })
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return { status: 'created' as const, author: created }
  })
```

- [ ] **Step 3: Add the fetch action**

```typescript
export const fetchPublicationAuthorsAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({ identifier: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const publication = await fetchPublicationByIdentifier(parsedInput.identifier)
    const bank = await prisma.author.findMany({
      select: { id: true, firstName: true, lastName: true, orcid: true },
    })
    const authors = matchAuthorsAgainstBank(bank, publication.authors)
    return { publication: { ...publication, authors: undefined }, authors }
  })
```

(Ensure `prisma` is imported in this file; if not, `import { prisma } from '@/lib/prisma'`.)

- [ ] **Step 4: Add the bulk-add action**

```typescript
export const addAuthorsFromPublicationAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({
    authors: z.array(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      orcid: z.string().nullable().optional(),
      affiliationRaw: z.string().nullable().optional(),
    })).min(1),
  }))
  .action(async ({ parsedInput }) => {
    const bank = await prisma.author.findMany({
      select: { id: true, firstName: true, lastName: true, orcid: true },
    })
    const rows = matchAuthorsAgainstBank(bank, parsedInput.authors)
    const toCreate = rows.filter((row) => row.status === 'new')
    let created = 0
    for (const author of toCreate) {
      await createAuthor({
        firstName: author.firstName,
        lastName: author.lastName,
        type: AuthorType.EXTERNAL,
        orcid: author.orcid ?? null,
        affiliations: author.affiliationRaw ? [author.affiliationRaw] : [],
      })
      created += 1
    }
    if (created > 0) revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return { created, skipped: rows.length - created }
  })
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (Confirm `study-form.tsx`'s existing `createAuthorAction` call still typechecks — it sends `firstName`/`lastName` only; the new schema defaults the rest.)

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/publications/actions.ts
git commit -m "feat(publications): member-gated create-author with dup guard + DOI/PMID import actions"
```

---

## Task 8: i18n keys (FR/EN)

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: Add the `add` block under `publications.authors`**

In `messages/en.json`, inside `publications.authors`, add:

```json
"add": {
  "breadcrumbRoot": "Authors",
  "title": "Add author",
  "subtitle": "Create an author manually, or pull one in from a publication by DOI or PMID.",
  "tabManual": "Manual entry",
  "tabDoi": "From DOI / PMID",
  "identity": "Identity",
  "firstName": "First name",
  "lastName": "Last name",
  "degrees": "Degrees",
  "orcid": "ORCID",
  "orcidOptional": "optional",
  "emails": "Emails",
  "typeCentreAffiliations": "Type, centre & affiliations",
  "authorType": "Author type",
  "ourTeam": "Our team",
  "external": "External",
  "centre": "Centre",
  "centreHint": "pick from your centre bank · first one is primary",
  "addCentre": "Add centre",
  "linkedUser": "Linked portal user",
  "linkedUserHint": "optional",
  "affiliations": "Affiliations",
  "affiliationsHint": "free text, exactly as printed on the paper",
  "cancel": "Cancel",
  "submit": "Add to bank",
  "identifierLabel": "Publication identifier",
  "identifierHint": "Paste a DOI (starts with 10.) or a PubMed ID (digits). We'll look up the article and list its authors.",
  "fetch": "Fetch",
  "emptyTitle": "Paste a DOI or PMID to start",
  "emptyBody": "We'll fetch the article and show every author so you can tick the ones to add to your bank.",
  "publicationFound": "Publication found",
  "authorsCount": "Authors",
  "alreadyInBank": "Already in bank",
  "new": "New",
  "deselectAll": "Deselect all",
  "willBeAdded": "{count} authors will be added to your bank.",
  "addNToBank": "Add {count} to bank",
  "dupBlocked": "An author with this ORCID already exists: {name}.",
  "dupWarning": "A possible duplicate exists: {names}. Add anyway?",
  "confirmAdd": "Add anyway",
  "created": "Author added to the bank.",
  "importedToast": "{count} author(s) added to your bank.",
  "fetchError": "Could not find a publication for that identifier.",
  "list": {
    "title": "Authors",
    "addButton": "Add author",
    "empty": "No authors yet."
  }
}
```

- [ ] **Step 2: Add the French translations**

In `messages/fr.json`, same structure, translated (e.g. `"title": "Ajouter un auteur"`, `"tabManual": "Saisie manuelle"`, `"tabDoi": "Depuis DOI / PMID"`, `"authorType": "Type d'auteur"`, `"ourTeam": "Notre équipe"`, `"external": "Externe"`, `"centre": "Centre"`, `"addCentre": "Ajouter un centre"`, `"affiliations": "Affiliations"`, `"submit": "Ajouter à la banque"`, `"fetch": "Rechercher"`, `"alreadyInBank": "Déjà dans la banque"`, `"new": "Nouveau"`, `"deselectAll": "Tout désélectionner"`, `"willBeAdded": "{count} auteurs seront ajoutés à votre banque."`, `"addNToBank": "Ajouter {count} à la banque"`, `"dupBlocked": "Un auteur avec cet ORCID existe déjà : {name}.", "dupWarning": "Un doublon possible existe : {names}. Ajouter quand même ?", "confirmAdd": "Ajouter quand même", "created": "Auteur ajouté à la banque.", "importedToast": "{count} auteur(s) ajouté(s) à votre banque.", "fetchError": "Aucune publication trouvée pour cet identifiant.", "linkedUser": "Utilisateur du portail lié", "emails": "E-mails"` etc. — translate every key from Step 1).

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/fr.json
git commit -m "i18n(publications): add-author strings (FR/EN)"
```

---

## Task 9: Server pages (member list + add form)

**Files:**
- Create: `app/[locale]/publications/authors/page.tsx`
- Create: `app/[locale]/publications/authors/new/page.tsx`

- [ ] **Step 1: Member authors list page**

`app/[locale]/publications/authors/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { canAccessApp } from '@/lib/permissions'
import { applicationLink } from '@/lib/application-link'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { listAuthors } from '@/lib/services/publications/authors'

export default async function AuthorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))
  const t = await getTranslations({ locale, namespace: 'publications.authors.add.list' })
  const authors = await listAuthors()

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button asChild>
          <Link href={applicationLink(locale, '/publications/authors/new')}>{t('addButton')}</Link>
        </Button>
      </div>
      {authors.length === 0 ? (
        <p className="text-text-secondary">{t('empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {authors.map((author) => (
            <li key={author.id} className="flex items-center justify-between px-4 py-3">
              <span>{author.firstName} <strong>{author.lastName}</strong>{author.degrees ? `, ${author.degrees}` : ''}</span>
              <span className="text-sm text-text-secondary">{author.centre?.name ?? ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add-author server page**

`app/[locale]/publications/authors/new/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { canAccessApp } from '@/lib/permissions'
import { applicationLink } from '@/lib/application-link'
import { Link } from '@/app/i18n/navigation'
import { listCentres } from '@/lib/services/publications/centres'
import { listLinkableUsers } from '@/lib/services/publications/authors'
import { AddAuthorForm } from '@/app/[locale]/publications/components/add-author-form'

export default async function NewAuthorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))
  const t = await getTranslations({ locale, namespace: 'publications.authors.add' })
  const [centres, users] = await Promise.all([listCentres(), listLinkableUsers()])

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="space-y-1">
        <nav className="text-sm text-text-secondary">
          <Link href={applicationLink(locale, '/publications/authors')}>{t('breadcrumbRoot')}</Link>
          <span> › {t('title')}</span>
        </nav>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-text-secondary">{t('subtitle')}</p>
      </div>
      <AddAuthorForm
        locale={locale}
        centres={centres.map((centre) => ({ value: centre.id, label: centre.name }))}
        users={users.map((user) => ({
          value: user.id,
          label: `${user.firstName ?? ''} ${user.lastName ?? ''} (${user.email})`.trim(),
        }))}
      />
    </div>
  )
}
```

Note: confirm `listCentres()` return shape in `lib/services/publications/centres.ts` and adjust `.map` accordingly (it returns centres with `id`/`name`).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: fails only on the not-yet-created `AddAuthorForm` import — that is expected until Task 10. (Or scaffold the component first if executing strictly.)

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/publications/authors"
git commit -m "feat(publications): member authors list + add-author server pages"
```

---

## Task 10: Client components (form shell + 3 panels)

**Files:**
- Create: `app/[locale]/publications/components/add-author-form.tsx`
- Create: `app/[locale]/publications/components/manual-entry-form.tsx`
- Create: `app/[locale]/publications/components/doi-import-panel.tsx`
- Create: `app/[locale]/publications/components/author-dedup-list.tsx`

- [ ] **Step 1: Tab shell (`add-author-form.tsx`)**

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ManualEntryForm } from './manual-entry-form'
import { DoiImportPanel } from './doi-import-panel'

type Option = { value: string; label: string }
type Props = { locale: string; centres: Option[]; users: Option[] }

export function AddAuthorForm({ locale, centres, users }: Props) {
  const t = useTranslations('publications.authors.add')
  const [tab, setTab] = useState<'manual' | 'doi'>('manual')
  return (
    <div className="space-y-6">
      <ToggleGroup type="single" value={tab} onValueChange={(value) => value && setTab(value as 'manual' | 'doi')} className="grid grid-cols-2 gap-2">
        <ToggleGroupItem value="manual">{t('tabManual')}</ToggleGroupItem>
        <ToggleGroupItem value="doi">{t('tabDoi')}</ToggleGroupItem>
      </ToggleGroup>
      {tab === 'manual'
        ? <ManualEntryForm locale={locale} centres={centres} users={users} />
        : <DoiImportPanel locale={locale} />}
    </div>
  )
}
```

- [ ] **Step 2: Manual form (`manual-entry-form.tsx`)**

RHF + zod; degree chips + type toggle via `ToggleGroup`; centre bank via ordered `SingleSelect` add-list; emails/affiliations via `TagInput`; optional user `SingleSelect`; dup-warning `AlertDialog` confirm.

```tsx
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/app/i18n/navigation'
import { applicationLink } from '@/lib/application-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SingleSelect } from '@/components/ui/single-select'
import { TagInput } from '@/components/ui/tag-input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createAuthorAction } from '@/app/[locale]/publications/actions'

const DEGREE_OPTIONS = ['MD', 'PhD', 'MSc', 'PharmD'] as const

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  orcid: z.string().trim().optional(),
})
type FormValues = z.infer<typeof schema>
type Option = { value: string; label: string }
type Props = { locale: string; centres: Option[]; users: Option[] }

export function ManualEntryForm({ locale, centres, users }: Props) {
  const t = useTranslations('publications.authors.add')
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const [degrees, setDegrees] = useState<string[]>([])
  const [type, setType] = useState<'OUR_TEAM' | 'EXTERNAL'>('OUR_TEAM')
  const [emails, setEmails] = useState<string[]>([])
  const [affiliations, setAffiliations] = useState<string[]>([])
  const [centreIds, setCentreIds] = useState<string[]>([])
  const [userId, setUserId] = useState<string>('')
  const [pending, setPending] = useState<FormValues | null>(null)
  const [warnNames, setWarnNames] = useState<string[]>([])

  const action = useAction(createAuthorAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      if (data.status === 'blocked') { toast.error(t('dupBlocked', { name: `${data.match.firstName} ${data.match.lastName}` })); return }
      if (data.status === 'warning') {
        setWarnNames(data.matches.map((match) => `${match.firstName} ${match.lastName}`)); return
      }
      toast.success(t('created'))
      router.push(applicationLink(locale, '/publications/authors'))
    },
    onError: () => toast.error(t('fetchError')),
  })

  function submit(values: FormValues, confirmDuplicate = false) {
    setPending(values)
    action.execute({
      firstName: values.firstName,
      lastName: values.lastName,
      type,
      degrees,
      emails,
      orcid: values.orcid || null,
      centreIds,
      affiliations,
      userId: userId || null,
      confirmDuplicate,
    })
  }

  const availableCentres = centres.filter((centre) => !centreIds.includes(centre.value))

  return (
    <form onSubmit={handleSubmit((values) => submit(values))} className="space-y-8">
      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold text-primary">{t('identity')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>{t('firstName')}</Label>
            <Input placeholder="Pierre" {...register('firstName')} />
            {errors.firstName && <p className="text-xs text-destructive">{t('firstName')}</p>}
          </div>
          <div className="space-y-1">
            <Label>{t('lastName')}</Label>
            <Input placeholder="Lefèvre" {...register('lastName')} />
            {errors.lastName && <p className="text-xs text-destructive">{t('lastName')}</p>}
          </div>
        </div>
        <div className="space-y-1">
          <Label>{t('degrees')}</Label>
          <ToggleGroup type="multiple" value={degrees} onValueChange={setDegrees} className="justify-start gap-2">
            {DEGREE_OPTIONS.map((degree) => <ToggleGroupItem key={degree} value={degree}>{degree}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <div className="space-y-1">
          <Label>{t('orcid')} <span className="text-text-secondary">({t('orcidOptional')})</span></Label>
          <Input placeholder="0000-0000-0000-0000" {...register('orcid')} />
        </div>
        <div className="space-y-1">
          <Label>{t('emails')}</Label>
          <TagInput value={emails} onChange={setEmails} placeholder="name@hospital.org" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold text-primary">{t('typeCentreAffiliations')}</h2>
        <div className="space-y-1">
          <Label>{t('authorType')}</Label>
          <ToggleGroup type="single" value={type} onValueChange={(value) => value && setType(value as 'OUR_TEAM' | 'EXTERNAL')} className="justify-start gap-2">
            <ToggleGroupItem value="OUR_TEAM">{t('ourTeam')}</ToggleGroupItem>
            <ToggleGroupItem value="EXTERNAL">{t('external')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2">
          <Label>{t('centre')} <span className="text-text-secondary">— {t('centreHint')}</span></Label>
          <ul className="space-y-1">
            {centreIds.map((centreId, index) => {
              const centre = centres.find((option) => option.value === centreId)
              return (
                <li key={centreId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{centre?.label}{index === 0 ? ' · ' + t('ourTeam') : ''}</span>
                  <button type="button" aria-label="remove" onClick={() => setCentreIds(centreIds.filter((id) => id !== centreId))}>×</button>
                </li>
              )
            })}
          </ul>
          {availableCentres.length > 0 && (
            <SingleSelect options={availableCentres} value="" onChange={(value) => value && setCentreIds([...centreIds, value])} placeholder={t('addCentre')} />
          )}
        </div>
        <div className="space-y-1">
          <Label>{t('affiliations')} <span className="text-text-secondary">— {t('affiliationsHint')}</span></Label>
          <TagInput value={affiliations} onChange={setAffiliations} placeholder="Department of Cardiology, Hôpital Lariboisière, 75010 Paris, France" />
        </div>
        <div className="space-y-1">
          <Label>{t('linkedUser')} <span className="text-text-secondary">({t('linkedUserHint')})</span></Label>
          <SingleSelect options={users} value={userId} onChange={setUserId} placeholder="—" />
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push(applicationLink(locale, '/publications/authors'))}>{t('cancel')}</Button>
        <Button type="submit" disabled={action.isPending}>{t('submit')}</Button>
      </div>

      <AlertDialog open={warnNames.length > 0} onOpenChange={(open) => !open && setWarnNames([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dupWarning', { names: warnNames.join(', ') })}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setWarnNames([]); if (pending) submit(pending, true) }}>{t('confirmAdd')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
```

- [ ] **Step 3: DOI import panel (`doi-import-panel.tsx`)**

```tsx
'use client'
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/app/i18n/navigation'
import { applicationLink } from '@/lib/application-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchPublicationAuthorsAction, addAuthorsFromPublicationAction } from '@/app/[locale]/publications/actions'
import { AuthorDedupList, type FetchedRow } from './author-dedup-list'

type PublicationMeta = { title: string; journal: string | null; year: number | null; doi: string | null }
type Props = { locale: string }

export function DoiImportPanel({ locale }: Props) {
  const t = useTranslations('publications.authors.add')
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [meta, setMeta] = useState<PublicationMeta | null>(null)
  const [rows, setRows] = useState<FetchedRow[]>([])

  const fetchAction = useAction(fetchPublicationAuthorsAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      setMeta(data.publication as PublicationMeta)
      setRows((data.authors as FetchedRow[]).map((row) => ({ ...row, selected: row.status === 'new' })))
    },
    onError: () => toast.error(t('fetchError')),
  })

  const addAction = useAction(addAuthorsFromPublicationAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      toast.success(t('importedToast', { count: data.created }))
      router.push(applicationLink(locale, '/publications/authors'))
    },
    onError: () => toast.error(t('fetchError')),
  })

  const selected = rows.filter((row) => row.selected && row.status === 'new')

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-xl border p-6">
        <Label>{t('identifierLabel')}</Label>
        <div className="flex gap-2">
          <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="10.1056/NEJMoa2501144 or 40218847" />
          <Button type="button" disabled={!identifier || fetchAction.isPending} onClick={() => fetchAction.execute({ identifier })}>{t('fetch')}</Button>
        </div>
        <p className="text-sm text-text-secondary">{t('identifierHint')}</p>
      </div>

      {!meta ? (
        <div className="rounded-xl border p-10 text-center">
          <p className="font-semibold">{t('emptyTitle')}</p>
          <p className="text-text-secondary">{t('emptyBody')}</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border p-6">
          <div>
            <p className="text-xs font-semibold text-primary">{t('publicationFound')}</p>
            <h3 className="text-lg font-bold">{meta.title}</h3>
            <p className="text-sm text-text-secondary">{meta.journal} · {meta.year} · {meta.doi}</p>
          </div>
          <AuthorDedupList rows={rows} onChange={setRows} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{t('willBeAdded', { count: selected.length })}</span>
            <Button type="button" disabled={selected.length === 0 || addAction.isPending}
              onClick={() => addAction.execute({ authors: selected.map((row) => ({ firstName: row.firstName, lastName: row.lastName, orcid: row.orcid ?? null, affiliationRaw: row.affiliationRaw ?? null })) })}>
              {t('addNToBank', { count: selected.length })}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Dedup list (`author-dedup-list.tsx`)**

```tsx
'use client'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

export type FetchedRow = {
  firstName: string
  lastName: string
  orcid: string | null
  affiliationRaw: string | null
  status: 'existing' | 'new'
  existingId?: string
  selected: boolean
}

type Props = { rows: FetchedRow[]; onChange: (rows: FetchedRow[]) => void }

export function AuthorDedupList({ rows, onChange }: Props) {
  const t = useTranslations('publications.authors.add')
  function toggle(index: number) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, selected: !row.selected } : row)))
  }
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((row, index) => (
        <li key={`${row.lastName}-${index}`} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Checkbox checked={row.selected} disabled={row.status === 'existing'} onCheckedChange={() => toggle(index)} />
            <div>
              <p>{row.firstName} <strong>{row.lastName}</strong>{' '}
                <Badge variant={row.status === 'existing' ? 'secondary' : 'default'}>
                  {row.status === 'existing' ? t('alreadyInBank') : t('new')}
                </Badge>
              </p>
              <p className="text-sm text-text-secondary">{row.affiliationRaw}</p>
            </div>
          </div>
          {row.orcid && <span className="text-sm text-text-secondary">{row.orcid}</span>}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. Confirm `toggle-group`, `checkbox`, `alert-dialog` exports exist (they are in `components/ui/`). Verify each new file is < 350 lines (`manual-entry-form.tsx` is the largest — split the two `<section>`s into a child component if it exceeds).

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/publications/components/add-author-form.tsx" "app/[locale]/publications/components/manual-entry-form.tsx" "app/[locale]/publications/components/doi-import-panel.tsx" "app/[locale]/publications/components/author-dedup-list.tsx"
git commit -m "feat(publications): add-author form (manual + DOI import) UI"
```

---

## Task 11: Entry point + seed centres for the bank

**Files:**
- Modify: the publications landing/admin nav that should link to `/publications/authors`
- Modify: `prisma/seed.test.ts`

- [ ] **Step 1: Add a nav link to the member authors page**

In `app/[locale]/publications/page.tsx` (the member landing), add a link/button to `applicationLink(locale, '/publications/authors')` labelled with `publications.authors.add.list.title`. Match the page's existing link/card pattern (read the file first and mirror it).

- [ ] **Step 2: Ensure seed has at least two centres for the bank picker + emails**

In `prisma/seed.test.ts`, near the existing publications author seeding, ensure two `Centre` rows exist (e.g. `Hôpital Lariboisière, AP-HP` with `isOwn: true`, and `Université de Milan`) and set `emails` on the seeded authors:

```typescript
const laribCentre = await prisma.centre.upsert({
  where: { name: 'Hôpital Lariboisière, AP-HP' },
  update: {},
  create: { name: 'Hôpital Lariboisière, AP-HP', city: 'Paris', country: 'France', isOwn: true },
})
await prisma.centre.upsert({
  where: { name: 'Università degli Studi di Milano' },
  update: {},
  create: { name: 'Università degli Studi di Milano', city: 'Milano', country: 'Italy', isOwn: false },
})
```

(Confirm `Centre.name` is `@unique` — it is. Adjust the existing author `create` calls to also pass `emails: ['...']` if useful for other tests.)

- [ ] **Step 3: Re-seed and typecheck**

Run: `npm run test:seed && npx tsc --noEmit`
Expected: seed completes, no type errors.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/publications/page.tsx" prisma/seed.test.ts
git commit -m "feat(publications): link to authors bank + seed centres for add-author"
```

---

## Task 12: E2E — manual add (dup flow) + DOI import (seamed)

**Files:**
- Modify: `playwright.config.ts` (ensure fixture env for the web server)
- Create: `tests/e2e/publications-add-author.spec.ts`

- [ ] **Step 1: Wire the fixture env for E2E**

In `playwright.config.ts`, in the `webServer.env` (or `use`/global env), set:

```typescript
env: {
  ...process.env,
  CROSSREF_FIXTURE_DIR: 'tests/e2e/fixtures/crossref',
  PUBMED_FIXTURE_DIR: process.env.PUBMED_FIXTURE_DIR ?? 'tests/e2e/fixtures/pubmed',
},
```

(Read the current config first; append to the existing `webServer` block rather than duplicating it. If `PUBMED_FIXTURE_DIR` is already wired for other tests, only add `CROSSREF_FIXTURE_DIR`.)

- [ ] **Step 2: Write the E2E spec**

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth' // use the project's existing login helper; adjust import if named differently

test('publications member adds authors manually and by DOI', async ({ page }) => {
  await loginAs(page, 'publications-user@larib-portal.test')

  // Manual entry: create a brand-new author
  await page.goto('/en/publications/authors/new')
  await expect(page.getByRole('heading', { name: 'Add author' })).toBeVisible()
  await page.getByLabel('First name').fill('Yuki')
  await page.getByLabel('Last name').fill('Tanaka')
  await page.getByRole('button', { name: 'MD' }).click()
  await page.getByRole('button', { name: 'Add to bank' }).click()
  await expect(page).toHaveURL(/\/publications\/authors$/)
  await expect(page.getByText('Tanaka')).toBeVisible()

  // DOI import (fixture-seamed): fetch and add only the new authors
  await page.goto('/en/publications/authors/new')
  await page.getByRole('button', { name: 'From DOI / PMID' }).click()
  await page.getByPlaceholder('10.1056/NEJMoa2501144 or 40218847').fill('10.1056/NEJMoa2501144')
  await page.getByRole('button', { name: 'Fetch' }).click()
  await expect(page.getByText('Transcatheter aortic-valve replacement')).toBeVisible()
  // Sofia Marino + James O'Connor are new (fixture); Pierre Lefèvre may already be in bank
  const addButton = page.getByRole('button', { name: /Add \d+ to bank/ })
  await expect(addButton).toBeEnabled()
  await addButton.click()
  await expect(page).toHaveURL(/\/publications\/authors$/)
  await expect(page.getByText('Marino')).toBeVisible()
})
```

- [ ] **Step 3: Confirm the login helper**

Run: `ls tests/e2e/helpers` and open the auth helper to confirm the sign-in function name/signature; adjust the import + call in Step 2 to match (the repo already logs in seeded users in other specs — mirror one, e.g. an existing publications spec).

- [ ] **Step 4: Run the E2E**

Run: `npm run test:seed && npm run test:e2e tests/e2e/publications-add-author.spec.ts`
Expected: PASS (both flows). If the duplicate-warning path needs coverage, add a second manual submit reusing the just-created "Yuki Tanaka" and assert the `dupWarning` dialog appears, then confirm.

- [ ] **Step 5: Full suite sanity**

Run: `npm run test:unit && npm run test:e2e tests/e2e/publications-add-author.spec.ts`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/publications-add-author.spec.ts
git commit -m "test(publications): e2e for add-author manual + DOI import"
```

---

## Self-Review Notes

- **Spec coverage:** access (Task 6/7/9), routes (9/11), migration incl. legacy mirrors (1/2), all fields incl. emails/type/multi-centre/affiliations/user-link (3/4/10), dup rule ORCID-block/name-warn (3/7/10/12), DOI+PMID with dedup badges & bulk add (5/7/10/12), i18n FR/EN (8), tests unit+E2E with seam (3/4/5/12). ✓
- **Degrees:** intentionally kept `String?` comma-joined (spec §data model) — the action joins chips with `", "`; no schema change, no consumer ripple.
- **Type consistency:** `createAuthor`/`buildAuthorCreateData` input shape, `FetchedAuthor`/`FetchedPublication`, `MatchedAuthor.status` (`'existing' | 'new'`), and the action return discriminants (`'created' | 'blocked' | 'warning'`) are used identically across Tasks 3–12.
- **Open confirmations for the executor (read the file before editing):** exact `listCentres()` return shape (Task 9), the publications landing nav pattern (Task 11), the E2E login helper name (Task 12), and `playwright.config.ts` `webServer.env` structure (Task 12).
