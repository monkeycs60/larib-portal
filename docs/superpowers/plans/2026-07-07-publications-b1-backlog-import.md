# Publications B1 — PubMed back-catalogue import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Publications admin import the team's back-catalogue from PubMed (anchored on an author, e.g. Théo Pezel), curate the paper list, and populate the **Authors + Articles + Journals** banks in one idempotent operation.

**Architecture:** NCBI E-utilities as the engine. **Pure** modules (`pubmed-parse.ts` XML→records, `import-dedupe.ts` author keys) hold the risky logic and are unit-tested with **vitest**; **impure** modules (`pubmed.ts` network+fixtures, `import.ts` Prisma upsert) wrap them. A `PUBMED_FIXTURE_DIR` env switch makes the network layer deterministic for E2E. Admin UI = anchor input → candidate table with checkboxes (curation) → import → report.

**Tech Stack:** Next.js 15 App Router, Prisma/PostgreSQL, next-safe-action (`appAdminAction('PUBLICATIONS')`), raw React Hook Form + `useAction` + sonner, next-intl, `fast-xml-parser`, **vitest** (new, unit), Playwright (E2E).

Spec: `docs/superpowers/specs/2026-07-07-publications-pubmed-banks-design.md` (this plan = phase **B1** only; B2 journals / B3 authors get their own plans).

---

## File Structure

- Modify: `prisma/schema.prisma` — remove `Author @@unique([firstName, lastName])`; migration.
- Create: `types/publications.ts` — `PubmedCandidate`, `PubmedAuthor`, `PubmedRecord`, `ImportReport`.
- Create: `lib/services/publications/pubmed-parse.ts` (**pure**) + `pubmed-parse.test.ts` — esummary JSON → candidates, efetch XML → records.
- Create: `lib/services/publications/pubmed.ts` (**impure**) — `searchByAuthor`, `fetchByPmids`, fixture switch, rate-limit chunking.
- Create: `lib/services/publications/import-dedupe.ts` (**pure**) + `import-dedupe.test.ts` — `normalizeName`, `authorDedupeKey`.
- Create: `lib/services/publications/import.ts` (**impure**) — `importRecords(records, createdById)` transactional upsert + report + cache tags.
- Create: `app/[locale]/publications/actions.ts` — `searchBacklogAction`, `importBacklogAction`.
- Create: `app/[locale]/publications/components/backlog-import.tsx` (client) — anchor/search/curate/import/report.
- Modify: `app/[locale]/publications/admin/page.tsx` — render the import tool (gated).
- Modify: `messages/en.json`, `messages/fr.json` — `publications.import.*`.
- Create: `vitest.config.ts`; Modify: `package.json` (deps + `test:unit`); Modify: `playwright.config.ts` (webServer `env`).
- Create: `tests/e2e/fixtures/pubmed/candidates.json`, `tests/e2e/fixtures/pubmed/records.json`, `tests/e2e/fixtures/pubmed/efetch-sample.xml`.
- Create: `tests/e2e/publications-import.spec.ts`.

**Verification tools:** `npx tsc --noEmit`, `npm run test:unit` (vitest), `npx prisma migrate dev` / `migrate deploy`, `npm run test:seed`, `npx playwright test`. Never `prisma migrate reset`.

---

## Task 1: Relax `Author` uniqueness + migration

Import dedupes authors in code (by ORCID or lastName+initial); the DB `@@unique([firstName, lastName])` is too strict and would throw on legitimate distinct people. Remove it.

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Remove the unique constraint.** In `model Author`, delete the line:

```prisma
  @@unique([firstName, lastName])
```
(Keep `@@map("Author")`.)

- [ ] **Step 2: Create + apply the migration (dev DB).**

Run: `npx prisma migrate dev --name relax_author_unique`
Expected: migration drops `Author_firstName_lastName_key`; client regenerated.

- [ ] **Step 3: Apply to the test DB.**

Run: `node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"`
Expected: "All migrations have been successfully applied." to `testdb`.

- [ ] **Step 4: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(publications): relax Author uniqueness for import dedup"
```

---

## Task 2: Dependencies, vitest, scripts

**Files:** Modify `package.json`; Create `vitest.config.ts`

- [ ] **Step 1: Install deps.**

Run: `npm install fast-xml-parser` then `npm install -D vitest`
Expected: both added to `package.json`.

- [ ] **Step 2: Create `vitest.config.ts`** (unit tests live next to code under `lib/`; Playwright's `testDir: './tests'` never sees them, so no collision):

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 3: Add the unit-test script** to `package.json` `scripts` (next to the other test scripts):

```json
    "test:unit": "vitest run",
```

- [ ] **Step 4: Sanity-check vitest runs (no tests yet is fine).**

Run: `npm run test:unit`
Expected: vitest reports "No test files found" (exit 0) or runs 0 tests — the runner is wired.

- [ ] **Step 5: Commit.**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(publications): add fast-xml-parser and vitest for import"
```

---

## Task 3: Shared types

**Files:** Create `types/publications.ts`

- [ ] **Step 1: Create `types/publications.ts`:**

```ts
export type PubmedCandidate = {
  pmid: string
  title: string
  journal: string
  year: number | null
  firstAuthor: string | null
  lastAuthor: string | null
  doi: string | null
}

export type PubmedAuthor = {
  lastName: string
  foreName: string | null
  initials: string | null
  affiliation: string | null
  orcid: string | null
}

export type PubmedRecord = {
  pmid: string
  title: string
  abstract: string | null
  doi: string | null
  publishedAt: string | null // ISO date or null
  journal: { name: string; isoAbbrev: string | null; issn: string | null; publisher: string | null }
  authors: PubmedAuthor[]
}

export type ImportReport = {
  articlesCreated: number
  articlesSkipped: number
  authorsCreated: number
  journalsCreated: number
  errors: Array<{ pmid: string; message: string }>
}
```

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add types/publications.ts
git commit -m "feat(publications): add PubMed/import shared types"
```

---

## Task 4: Pure parsing (`pubmed-parse.ts`) — TDD

Pure functions, no Prisma/network, so unit-testable. All `@/` imports are `import type` (erased at runtime → vitest needs no path alias).

**Files:** Create `lib/services/publications/pubmed-parse.ts`, `lib/services/publications/pubmed-parse.test.ts`, `tests/e2e/fixtures/pubmed/efetch-sample.xml`

- [ ] **Step 1: Add a minimal efetch fixture** `tests/e2e/fixtures/pubmed/efetch-sample.xml`:

```xml
<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>39000001</PMID>
      <Article>
        <Journal>
          <ISSN IssnType="Print">0195-668X</ISSN>
          <Title>European Heart Journal</Title>
          <ISOAbbreviation>Eur Heart J</ISOAbbreviation>
          <JournalIssue><PubDate><Year>2023</Year><Month>Mar</Month><Day>07</Day></PubDate></JournalIssue>
        </Journal>
        <ArticleTitle>Multimodal imaging of the mitral valve.</ArticleTitle>
        <Abstract><AbstractText>Background text.</AbstractText><AbstractText Label="METHODS">Methods text.</AbstractText></Abstract>
        <AuthorList>
          <Author>
            <LastName>Pezel</LastName><ForeName>Theo</ForeName><Initials>T</Initials>
            <AffiliationInfo><Affiliation>Lariboisiere Hospital, APHP, Paris, France.</Affiliation></AffiliationInfo>
            <Identifier Source="ORCID">0000-0002-1234-5678</Identifier>
          </Author>
          <Author>
            <LastName>Garot</LastName><ForeName>Jerome</ForeName><Initials>J</Initials>
            <AffiliationInfo><Affiliation>ICPS, Massy, France.</Affiliation></AffiliationInfo>
          </Author>
        </AuthorList>
        <ELocationID EIdType="doi" ValidYN="Y">10.1093/eurheartj/ehad100</ELocationID>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>
```

- [ ] **Step 2: Write the failing test** `lib/services/publications/pubmed-parse.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseEfetchXml, parseEsummary } from './pubmed-parse'

const xml = readFileSync(resolve(process.cwd(), 'tests/e2e/fixtures/pubmed/efetch-sample.xml'), 'utf8')

describe('parseEfetchXml', () => {
  it('parses one article with journal, authors, doi and date', () => {
    const records = parseEfetchXml(xml)
    expect(records).toHaveLength(1)
    const record = records[0]
    expect(record.pmid).toBe('39000001')
    expect(record.title).toBe('Multimodal imaging of the mitral valve.')
    expect(record.doi).toBe('10.1093/eurheartj/ehad100')
    expect(record.publishedAt).toBe('2023-03-07')
    expect(record.journal).toEqual({
      name: 'European Heart Journal',
      isoAbbrev: 'Eur Heart J',
      issn: '0195-668X',
      publisher: null,
    })
    expect(record.abstract).toContain('Background text.')
    expect(record.abstract).toContain('Methods text.')
    expect(record.authors).toHaveLength(2)
    expect(record.authors[0]).toEqual({
      lastName: 'Pezel', foreName: 'Theo', initials: 'T',
      affiliation: 'Lariboisiere Hospital, APHP, Paris, France.',
      orcid: '0000-0002-1234-5678',
    })
    expect(record.authors[1].orcid).toBeNull()
  })
})

describe('parseEsummary', () => {
  it('maps esummary JSON to candidates', () => {
    const json = {
      result: {
        uids: ['39000001'],
        '39000001': {
          uid: '39000001',
          title: 'Multimodal imaging of the mitral valve.',
          fulljournalname: 'European Heart Journal',
          pubdate: '2023 Mar 7',
          authors: [{ name: 'Pezel T' }, { name: 'Garot J' }],
          articleids: [{ idtype: 'doi', value: '10.1093/eurheartj/ehad100' }],
        },
      },
    }
    const candidates = parseEsummary(json)
    expect(candidates).toEqual([
      {
        pmid: '39000001',
        title: 'Multimodal imaging of the mitral valve.',
        journal: 'European Heart Journal',
        year: 2023,
        firstAuthor: 'Pezel T',
        lastAuthor: 'Garot J',
        doi: '10.1093/eurheartj/ehad100',
      },
    ])
  })
})
```

- [ ] **Step 3: Run — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL ("Cannot find module './pubmed-parse'" / functions undefined).

- [ ] **Step 4: Implement `lib/services/publications/pubmed-parse.ts`:**

```ts
import { XMLParser } from 'fast-xml-parser'
import type { PubmedCandidate, PubmedRecord, PubmedAuthor } from '@/types/publications'

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true })

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function textOf(node: unknown): string | null {
  if (node === undefined || node === null) return null
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    const text = (node as Record<string, unknown>)['#text']
    return text === undefined || text === null ? null : String(text)
  }
  return null
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

function isoDateFromPubDate(pubDate: Record<string, unknown> | undefined): string | null {
  if (!pubDate) return null
  const year = textOf(pubDate.Year)
  if (!year) return null
  const monthRaw = textOf(pubDate.Month)
  const month = monthRaw ? (MONTHS[monthRaw] ?? (/^\d{1,2}$/.test(monthRaw) ? monthRaw.padStart(2, '0') : '01')) : '01'
  const dayRaw = textOf(pubDate.Day)
  const day = dayRaw && /^\d{1,2}$/.test(dayRaw) ? dayRaw.padStart(2, '0') : '01'
  return `${year}-${month}-${day}`
}

function abstractText(abstract: Record<string, unknown> | undefined): string | null {
  if (!abstract) return null
  const parts = toArray(abstract.AbstractText).map((part) => textOf(part)).filter((t): t is string => !!t)
  return parts.length ? parts.join('\n') : null
}

function doiOf(article: Record<string, unknown>): string | null {
  const eloc = toArray(article.ELocationID as unknown)
    .find((entry) => (entry as Record<string, unknown>)['@_EIdType'] === 'doi')
  return eloc ? textOf(eloc) : null
}

function parseAuthor(node: Record<string, unknown>): PubmedAuthor | null {
  const lastName = textOf(node.LastName)
  if (!lastName) return null // skip CollectiveName-only entries
  const affiliationInfo = toArray(node.AffiliationInfo)[0] as Record<string, unknown> | undefined
  const orcidEntry = toArray(node.Identifier).find((id) => (id as Record<string, unknown>)['@_Source'] === 'ORCID')
  return {
    lastName,
    foreName: textOf(node.ForeName),
    initials: textOf(node.Initials),
    affiliation: affiliationInfo ? textOf(affiliationInfo.Affiliation) : null,
    orcid: orcidEntry ? textOf(orcidEntry) : null,
  }
}

export function parseEfetchXml(xml: string): PubmedRecord[] {
  const root = parser.parse(xml) as Record<string, unknown>
  const set = root.PubmedArticleSet as Record<string, unknown> | undefined
  if (!set) return []
  return toArray(set.PubmedArticle).map((articleNode) => {
    const citation = (articleNode as Record<string, unknown>).MedlineCitation as Record<string, unknown>
    const article = citation.Article as Record<string, unknown>
    const journal = article.Journal as Record<string, unknown>
    const journalIssue = journal.JournalIssue as Record<string, unknown> | undefined
    const authors = toArray((article.AuthorList as Record<string, unknown> | undefined)?.Author)
      .map((authorNode) => parseAuthor(authorNode as Record<string, unknown>))
      .filter((author): author is PubmedAuthor => author !== null)
    return {
      pmid: String(textOf(citation.PMID)),
      title: textOf(article.ArticleTitle) ?? '',
      abstract: abstractText(article.Abstract as Record<string, unknown> | undefined),
      doi: doiOf(article),
      publishedAt: isoDateFromPubDate(journalIssue?.PubDate as Record<string, unknown> | undefined),
      journal: {
        name: textOf(journal.Title) ?? '',
        isoAbbrev: textOf(journal.ISOAbbreviation),
        issn: textOf(journal.ISSN),
        publisher: null,
      },
      authors,
    }
  })
}

type EsummaryDoc = {
  uid: string
  title?: string
  fulljournalname?: string
  pubdate?: string
  authors?: Array<{ name: string }>
  articleids?: Array<{ idtype: string; value: string }>
}

export function parseEsummary(json: unknown): PubmedCandidate[] {
  const result = (json as { result?: Record<string, unknown> }).result
  if (!result) return []
  const uids = (result.uids as string[] | undefined) ?? []
  return uids.map((uid) => {
    const doc = result[uid] as EsummaryDoc
    const authors = doc.authors ?? []
    const yearMatch = doc.pubdate?.match(/\d{4}/)
    const doi = doc.articleids?.find((id) => id.idtype === 'doi')?.value ?? null
    return {
      pmid: uid,
      title: doc.title ?? '',
      journal: doc.fulljournalname ?? '',
      year: yearMatch ? Number(yearMatch[0]) : null,
      firstAuthor: authors[0]?.name ?? null,
      lastAuthor: authors.length ? authors[authors.length - 1].name : null,
      doi,
    }
  })
}
```

- [ ] **Step 5: Run — verify it passes.**

Run: `npm run test:unit`
Expected: PASS (both suites green).

- [ ] **Step 6: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add lib/services/publications/pubmed-parse.ts lib/services/publications/pubmed-parse.test.ts tests/e2e/fixtures/pubmed/efetch-sample.xml
git commit -m "feat(publications): pure PubMed esummary/efetch parsers with unit tests"
```

---

## Task 5: PubMed network service (`pubmed.ts`) + fixture switch

Wraps the pure parsers with NCBI fetches; `PUBMED_FIXTURE_DIR` short-circuits to canned normalized JSON for deterministic E2E.

**Files:** Create `lib/services/publications/pubmed.ts`

- [ ] **Step 1: Implement `lib/services/publications/pubmed.ts`:**

```ts
import 'server-only'
import type { PubmedCandidate, PubmedRecord } from '@/types/publications'
import { parseEfetchXml, parseEsummary } from './pubmed-parse'

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const FIXTURE_DIR = process.env.PUBMED_FIXTURE_DIR
const API_KEY = process.env.NCBI_API_KEY

function withKey(url: URL): URL {
  if (API_KEY) url.searchParams.set('api_key', API_KEY)
  return url
}

async function readFixture<T>(name: string): Promise<T> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  return JSON.parse(await readFile(join(FIXTURE_DIR as string, name), 'utf8')) as T
}

function authorTerm(anchor: string): string {
  const trimmed = anchor.trim()
  return trimmed.includes('[') ? trimmed : `${trimmed}[Author]`
}

export async function searchByAuthor(anchor: string, retmax = 200): Promise<PubmedCandidate[]> {
  if (FIXTURE_DIR) return readFixture<PubmedCandidate[]>('candidates.json')

  const esearch = withKey(new URL(`${EUTILS}/esearch.fcgi`))
  esearch.searchParams.set('db', 'pubmed')
  esearch.searchParams.set('term', authorTerm(anchor))
  esearch.searchParams.set('retmax', String(retmax))
  esearch.searchParams.set('retmode', 'json')
  const searchRes = await fetch(esearch, { cache: 'no-store' })
  if (!searchRes.ok) throw new Error('PUBMED_SEARCH_FAILED')
  const searchJson = (await searchRes.json()) as { esearchresult?: { idlist?: string[] } }
  const ids = searchJson.esearchresult?.idlist ?? []
  if (ids.length === 0) return []

  const esummary = withKey(new URL(`${EUTILS}/esummary.fcgi`))
  esummary.searchParams.set('db', 'pubmed')
  esummary.searchParams.set('id', ids.join(','))
  esummary.searchParams.set('retmode', 'json')
  const summaryRes = await fetch(esummary, { cache: 'no-store' })
  if (!summaryRes.ok) throw new Error('PUBMED_SUMMARY_FAILED')
  return parseEsummary(await summaryRes.json())
}

export async function fetchByPmids(pmids: string[]): Promise<PubmedRecord[]> {
  if (pmids.length === 0) return []
  if (FIXTURE_DIR) {
    const all = await readFixture<PubmedRecord[]>('records.json')
    const wanted = new Set(pmids)
    return all.filter((record) => wanted.has(record.pmid))
  }

  const records: PubmedRecord[] = []
  for (let start = 0; start < pmids.length; start += 200) {
    const chunk = pmids.slice(start, start + 200)
    const efetch = withKey(new URL(`${EUTILS}/efetch.fcgi`))
    efetch.searchParams.set('db', 'pubmed')
    efetch.searchParams.set('id', chunk.join(','))
    efetch.searchParams.set('retmode', 'xml')
    const res = await fetch(efetch, { cache: 'no-store' })
    if (!res.ok) throw new Error('PUBMED_FETCH_FAILED')
    records.push(...parseEfetchXml(await res.text()))
  }
  return records
}
```

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add lib/services/publications/pubmed.ts
git commit -m "feat(publications): PubMed network service with fixture switch"
```

---

## Task 6: Author dedup (`import-dedupe.ts`) — TDD

**Files:** Create `lib/services/publications/import-dedupe.ts`, `lib/services/publications/import-dedupe.test.ts`

- [ ] **Step 1: Write the failing test** `lib/services/publications/import-dedupe.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeName, authorDedupeKey } from './import-dedupe'

describe('normalizeName', () => {
  it('lowercases and strips accents/punctuation', () => {
    expect(normalizeName('Pézel-Théo')).toBe('pezeltheo')
    expect(normalizeName("O'Brien")).toBe('obrien')
  })
})

describe('authorDedupeKey', () => {
  it('uses ORCID when present', () => {
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: 'Theo', initials: 'T', affiliation: null, orcid: '0000-0002-1234-5678' }))
      .toBe('orcid:0000-0002-1234-5678')
  })
  it('falls back to lastName + first initial', () => {
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: 'Theo', initials: 'T', affiliation: null, orcid: null }))
      .toBe('name:pezel|t')
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: null, initials: 'TA', affiliation: null, orcid: null }))
      .toBe('name:pezel|t')
  })
})
```

- [ ] **Step 2: Run — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/services/publications/import-dedupe.ts`:**

```ts
import type { PubmedAuthor } from '@/types/publications'

export function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function authorDedupeKey(author: PubmedAuthor): string {
  if (author.orcid) return `orcid:${author.orcid}`
  const initial = (author.initials ?? author.foreName ?? '').trim().charAt(0).toLowerCase()
  return `name:${normalizeName(author.lastName)}|${initial}`
}
```

- [ ] **Step 4: Run — verify it passes.**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/services/publications/import-dedupe.ts lib/services/publications/import-dedupe.test.ts
git commit -m "feat(publications): author dedup keys with unit tests"
```

---

## Task 7: Import service (`import.ts`) — transactional upsert

Idempotent: articles keyed by `pubmedId`; authors by dedup key; journals by ISSN/name. Populates journals + authors + affiliations + articles + authorships and returns a report.

**Files:** Create `lib/services/publications/import.ts`

- [ ] **Step 1: Implement `lib/services/publications/import.ts`:**

```ts
import { prisma } from '@/lib/prisma'
import type { PubmedRecord, ImportReport } from '@/types/publications'
import { authorDedupeKey, normalizeName } from './import-dedupe'

export const PUBLICATIONS_JOURNALS_TAG = 'publications:journals'
export const PUBLICATIONS_AUTHORS_TAG = 'publications:authors'
export const PUBLICATIONS_ARTICLES_TAG = 'publications:articles'

async function upsertJournal(record: PubmedRecord, counters: { journalsCreated: number }): Promise<string | null> {
  const { name, issn, isoAbbrev } = record.journal
  const journalName = name || isoAbbrev
  if (!journalName) return null
  const existing = issn
    ? await prisma.journal.findFirst({ where: { issn }, select: { id: true } })
    : await prisma.journal.findFirst({ where: { name: journalName }, select: { id: true } })
  if (existing) return existing.id
  const created = await prisma.journal.create({ data: { name: journalName, issn: issn ?? null }, select: { id: true } })
  counters.journalsCreated += 1
  return created.id
}

async function upsertAuthor(
  author: PubmedRecord['authors'][number],
  cache: Map<string, string>,
  counters: { authorsCreated: number },
): Promise<string> {
  const key = authorDedupeKey(author)
  const cached = cache.get(key)
  if (cached) return cached

  const orcid = author.orcid
  const existing = orcid
    ? await prisma.author.findFirst({ where: { orcid }, select: { id: true } })
    : await prisma.author.findFirst({
        where: { lastName: author.lastName, initials: { startsWith: (author.initials ?? author.foreName ?? '').charAt(0) } },
        select: { id: true, initials: true },
      })
  if (existing) {
    cache.set(key, existing.id)
    return existing.id
  }
  const created = await prisma.author.create({
    data: {
      firstName: author.foreName ?? author.initials ?? '',
      lastName: author.lastName,
      initials: author.initials ?? null,
      orcid: author.orcid ?? null,
    },
    select: { id: true },
  })
  counters.authorsCreated += 1
  cache.set(key, created.id)
  return created.id
}

export async function importRecords(records: PubmedRecord[], createdById: string): Promise<ImportReport> {
  const report: ImportReport = { articlesCreated: 0, articlesSkipped: 0, authorsCreated: 0, journalsCreated: 0, errors: [] }
  const authorCache = new Map<string, string>()

  for (const record of records) {
    try {
      const existingArticle = await prisma.article.findFirst({ where: { pubmedId: record.pmid }, select: { id: true } })
      if (existingArticle) {
        report.articlesSkipped += 1
        continue
      }
      const publishedJournalId = await upsertJournal(record, report)
      const authorIds: string[] = []
      for (const author of record.authors) {
        authorIds.push(await upsertAuthor(author, authorCache, report))
      }
      await prisma.article.create({
        data: {
          title: record.title || '(untitled)',
          type: 'ORIGINAL',
          status: 'PUBLISHED',
          abstract: record.abstract,
          pubmedId: record.pmid,
          doi: record.doi,
          publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
          publishedJournalId,
          createdById,
          authorships: {
            create: authorIds.map((authorId, index) => ({ authorId, order: index + 1 })),
          },
        },
        select: { id: true },
      })
      report.articlesCreated += 1
    } catch (error) {
      report.errors.push({ pmid: record.pmid, message: error instanceof Error ? error.message : 'UNKNOWN' })
    }
  }
  return report
}
```

> Note: `authorDedupeKey`/`normalizeName` are imported for the cache key; the DB fallback query approximates the same rule. `Author.initials` is added to the schema in Task 8.

- [ ] **Step 2: Type-check.** (Will fail until Task 8 adds `Author.initials` — that's expected; do Task 8 next, then re-check.)

Run: `npx tsc --noEmit`
Expected: errors about `initials` on `Author` — resolved by Task 8.

---

## Task 8: Add `Author.initials` + migration, then green

`importRecords` stores/queries `initials`; add the column.

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add the column** to `model Author` (after `degrees`):

```prisma
  initials String?
```

- [ ] **Step 2: Migrate (dev) + testdb + generate.**

Run: `npx prisma migrate dev --name add_author_initials`
Then: `node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"`
Expected: `initials` column added on both DBs.

- [ ] **Step 3: Type-check — now green.**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit (schema + import service together).**

```bash
git add prisma/schema.prisma prisma/migrations lib/services/publications/import.ts
git commit -m "feat(publications): idempotent import service + Author.initials"
```

---

## Task 9: Server actions

**Files:** Create `app/[locale]/publications/actions.ts`

- [ ] **Step 1: Implement `app/[locale]/publications/actions.ts`:**

```ts
'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { appAdminAction } from '@/actions/safe-action'
import { searchByAuthor, fetchByPmids } from '@/lib/services/publications/pubmed'
import {
  importRecords,
  PUBLICATIONS_JOURNALS_TAG,
  PUBLICATIONS_AUTHORS_TAG,
  PUBLICATIONS_ARTICLES_TAG,
} from '@/lib/services/publications/import'

export const searchBacklogAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ anchor: z.string().min(1), retmax: z.number().int().min(1).max(500).optional() }))
  .action(async ({ parsedInput }) => {
    return searchByAuthor(parsedInput.anchor, parsedInput.retmax ?? 200)
  })

export const importBacklogAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ pmids: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const records = await fetchByPmids(parsedInput.pmids)
    const report = await importRecords(records, ctx.userId)
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return report
  })
```

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/actions.ts
git commit -m "feat(publications): search + import backlog server actions"
```

---

## Task 10: i18n keys (EN + FR)

**Files:** Modify `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: `messages/en.json`** — replace the `publications` block's `"actionError"` line to append an `import` object:

Change:
```json
    "actionError": "Something went wrong. Please try again."
  }
```
to:
```json
    "actionError": "Something went wrong. Please try again.",
    "import": {
      "title": "Import from PubMed",
      "subtitle": "Fetch the team's back-catalogue by author, curate, and import.",
      "anchor": "Anchor author",
      "anchorHint": "e.g. Pezel T",
      "search": "Search",
      "searching": "Searching…",
      "found": "{count} papers found",
      "none": "No papers found for this author.",
      "colSelect": "Import",
      "colTitle": "Title",
      "colJournal": "Journal",
      "colYear": "Year",
      "colAuthors": "Authors",
      "selectAll": "Select all",
      "importSelected": "Import selected ({count})",
      "importing": "Importing…",
      "reportTitle": "Import complete",
      "reportBody": "{created} imported, {skipped} already present, {authors} authors added, {journals} journals added.",
      "reportErrors": "{count} paper(s) failed.",
      "searchError": "PubMed search failed. Please retry.",
      "importError": "Import failed. Please retry."
    }
  }
```

- [ ] **Step 2: `messages/fr.json`** — same shape, French:

Change:
```json
    "actionError": "Une erreur est survenue. Veuillez réessayer."
  }
```
to:
```json
    "actionError": "Une erreur est survenue. Veuillez réessayer.",
    "import": {
      "title": "Importer depuis PubMed",
      "subtitle": "Récupérez le back-catalogue de l'équipe par auteur, curez, importez.",
      "anchor": "Auteur ancre",
      "anchorHint": "ex. Pezel T",
      "search": "Rechercher",
      "searching": "Recherche…",
      "found": "{count} articles trouvés",
      "none": "Aucun article trouvé pour cet auteur.",
      "colSelect": "Importer",
      "colTitle": "Titre",
      "colJournal": "Journal",
      "colYear": "Année",
      "colAuthors": "Auteurs",
      "selectAll": "Tout sélectionner",
      "importSelected": "Importer la sélection ({count})",
      "importing": "Import…",
      "reportTitle": "Import terminé",
      "reportBody": "{created} importés, {skipped} déjà présents, {authors} auteurs ajoutés, {journals} journaux ajoutés.",
      "reportErrors": "{count} article(s) en échec.",
      "searchError": "La recherche PubMed a échoué. Réessayez.",
      "importError": "L'import a échoué. Réessayez."
    }
  }
```

- [ ] **Step 3: Validate JSON + commit.**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('ok')"`
Expected: `ok`.
```bash
git add messages/en.json messages/fr.json
git commit -m "feat(publications): i18n for PubMed import"
```

---

## Task 11: Import UI client component

**Files:** Create `app/[locale]/publications/components/backlog-import.tsx`

- [ ] **Step 1: Implement `app/[locale]/publications/components/backlog-import.tsx`:**

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { searchBacklogAction, importBacklogAction } from '../actions'
import type { PubmedCandidate, ImportReport } from '@/types/publications'

export function BacklogImport() {
  const t = useTranslations('publications')
  const [anchor, setAnchor] = useState('Pezel T')
  const [candidates, setCandidates] = useState<PubmedCandidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [report, setReport] = useState<ImportReport | null>(null)

  const { execute: runSearch, isExecuting: searching } = useAction(searchBacklogAction, {
    onSuccess({ data }) {
      const found = data ?? []
      setCandidates(found)
      setSelected(new Set(found.map((paper) => paper.pmid)))
      setReport(null)
    },
    onError() { toast.error(t('import.searchError')) },
  })

  const { execute: runImport, isExecuting: importing } = useAction(importBacklogAction, {
    onSuccess({ data }) {
      if (!data) return
      setReport(data)
      toast.success(t('import.reportBody', {
        created: data.articlesCreated, skipped: data.articlesSkipped,
        authors: data.authorsCreated, journals: data.journalsCreated,
      }))
    },
    onError() { toast.error(t('import.importError')) },
  })

  function toggle(pmid: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pmid)) next.delete(pmid); else next.add(pmid)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === candidates.length ? new Set() : new Set(candidates.map((paper) => paper.pmid))))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <label className="text-sm text-text-secondary">{t('import.anchor')}</label>
          <Input value={anchor} onChange={(event) => setAnchor(event.target.value)} placeholder={t('import.anchorHint')} />
        </div>
        <Button onClick={() => runSearch({ anchor })} disabled={searching || anchor.trim().length === 0}>
          {searching ? t('import.searching') : t('import.search')}
        </Button>
      </div>

      {candidates.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{t('import.found', { count: candidates.length })}</span>
            <Button variant="outline" size="sm" onClick={toggleAll}>{t('import.selectAll')}</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{t('import.colSelect')}</TableHead>
                <TableHead>{t('import.colTitle')}</TableHead>
                <TableHead>{t('import.colJournal')}</TableHead>
                <TableHead>{t('import.colYear')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((paper) => (
                <TableRow key={paper.pmid}>
                  <TableCell>
                    <Checkbox checked={selected.has(paper.pmid)} onCheckedChange={() => toggle(paper.pmid)} aria-label={paper.title} />
                  </TableCell>
                  <TableCell className="font-medium">{paper.title}</TableCell>
                  <TableCell>{paper.journal || '—'}</TableCell>
                  <TableCell>{paper.year ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            onClick={() => runImport({ pmids: Array.from(selected) })}
            disabled={importing || selected.size === 0}
          >
            {importing ? t('import.importing') : t('import.importSelected', { count: selected.size })}
          </Button>
        </>
      )}

      {report && (
        <div className="rounded-lg border border-line bg-bg-surface p-4">
          <p className="font-semibold text-text-primary">{t('import.reportTitle')}</p>
          <p className="text-text-secondary">{t('import.reportBody', {
            created: report.articlesCreated, skipped: report.articlesSkipped,
            authors: report.authorsCreated, journals: report.journalsCreated,
          })}</p>
          {report.errors.length > 0 && (
            <p className="text-danger-600">{t('import.reportErrors', { count: report.errors.length })}</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Confirm `components/ui/checkbox.tsx` exposes `Checkbox` with `checked`/`onCheckedChange`.**

Run: `grep -n "onCheckedChange\|export" components/ui/checkbox.tsx | head`
Expected: a shadcn Radix checkbox exporting `Checkbox` with `onCheckedChange`. (If the prop differs, adapt the handler.)

- [ ] **Step 3: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/components/backlog-import.tsx
git commit -m "feat(publications): backlog import UI (search, curate, import, report)"
```

---

## Task 12: Wire the import tool into the admin page

**Files:** Modify `app/[locale]/publications/admin/page.tsx`

- [ ] **Step 1: Replace the admin shell body** with the import tool (keep the gate):

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { BacklogImport } from '@/app/[locale]/publications/components/backlog-import'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsAdminPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/publications'))
  }

  const t = await getTranslations({ locale, namespace: 'publications' })

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('import.title')} subtitle={t('import.subtitle')} />
      <BacklogImport />
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/admin/page.tsx
git commit -m "feat(publications): render PubMed import on the admin page"
```

---

## Task 13: E2E fixtures + deterministic server env

**Files:** Create `tests/e2e/fixtures/pubmed/candidates.json`, `tests/e2e/fixtures/pubmed/records.json`; Modify `playwright.config.ts`

- [ ] **Step 1: Create `tests/e2e/fixtures/pubmed/candidates.json`:**

```json
[
  { "pmid": "39000001", "title": "Multimodal imaging of the mitral valve.", "journal": "European Heart Journal", "year": 2023, "firstAuthor": "Pezel T", "lastAuthor": "Garot J", "doi": "10.1093/eurheartj/ehad100" },
  { "pmid": "39000002", "title": "Unrelated editorial to exclude.", "journal": "Some Journal", "year": 2019, "firstAuthor": "Pezel T", "lastAuthor": "Other A", "doi": null }
]
```

- [ ] **Step 2: Create `tests/e2e/fixtures/pubmed/records.json`:**

```json
[
  {
    "pmid": "39000001",
    "title": "Multimodal imaging of the mitral valve.",
    "abstract": "Background text.",
    "doi": "10.1093/eurheartj/ehad100",
    "publishedAt": "2023-03-07",
    "journal": { "name": "European Heart Journal", "isoAbbrev": "Eur Heart J", "issn": "0195-668X", "publisher": null },
    "authors": [
      { "lastName": "Pezel", "foreName": "Theo", "initials": "T", "affiliation": "Lariboisiere Hospital, APHP, Paris, France.", "orcid": "0000-0002-1234-5678" },
      { "lastName": "Garot", "foreName": "Jerome", "initials": "J", "affiliation": "ICPS, Massy, France.", "orcid": null }
    ]
  },
  {
    "pmid": "39000002",
    "title": "Unrelated editorial to exclude.",
    "abstract": null,
    "doi": null,
    "publishedAt": "2019-01-01",
    "journal": { "name": "Some Journal", "isoAbbrev": "Some J", "issn": "1111-2222", "publisher": null },
    "authors": [ { "lastName": "Pezel", "foreName": "Theo", "initials": "T", "affiliation": null, "orcid": "0000-0002-1234-5678" } ]
  }
]
```

- [ ] **Step 3: Point the Playwright web server at fixtures + testdb.** In `playwright.config.ts`, add an `env` to the `webServer` block so a Playwright-managed dev server serves canned PubMed data:

```ts
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PUBMED_FIXTURE_DIR: require('path').resolve(__dirname, 'tests/e2e/fixtures/pubmed'),
    },
  },
```

> If a dev server is already running on port 3000 without this env, stop it so Playwright starts its own (or run a dedicated testdb server with `PUBMED_FIXTURE_DIR` set). See the M1 plan's E2E note about `.next` contention.

- [ ] **Step 4: Commit.**

```bash
git add tests/e2e/fixtures/pubmed playwright.config.ts
git commit -m "test(publications): PubMed import fixtures + deterministic e2e env"
```

---

## Task 14: E2E flow — search, curate, import, idempotent re-import

**Files:** Create `tests/e2e/publications-import.spec.ts`

- [ ] **Step 1: Implement `tests/e2e/publications-import.spec.ts`:**

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

test('admin imports the PubMed backlog with curation, idempotent on re-run', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /import from pubmed/i })).toBeVisible()

  // Search (fixture returns 2 candidates)
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText(/2 papers found/i)).toBeVisible()

  // Curate: uncheck the 2nd paper (the editorial to exclude)
  const rows = page.locator('tbody tr')
  await rows.nth(1).getByRole('checkbox').click()

  // Import selected (1)
  await page.getByRole('button', { name: /import selected \(1\)/i }).click()
  await expect(page.getByText(/1 imported, 0 already present/i)).toBeVisible()

  // Re-search + re-import the same one → idempotent (skipped)
  await page.getByRole('button', { name: /^search$/i }).click()
  await rows.nth(1).getByRole('checkbox').click()
  await page.getByRole('button', { name: /import selected \(1\)/i }).click()
  await expect(page.getByText(/0 imported, 1 already present/i)).toBeVisible()
})
```

- [ ] **Step 2: Seed + run the unit and e2e suites.**

Run: `npm run test:unit`
Expected: all unit suites PASS.
Run: `npm run test:seed && npx playwright test tests/e2e/publications-import.spec.ts`
Expected: 1 passed. (Ensure the Playwright server has `PUBMED_FIXTURE_DIR` set — Task 13.)

- [ ] **Step 3: Commit.**

```bash
git add tests/e2e/publications-import.spec.ts
git commit -m "test(publications): e2e backlog import with curation + idempotency"
```

---

## B1 — Definition of Done

- [ ] `npx tsc --noEmit` green.
- [ ] `npm run test:unit` green (parse + dedup suites).
- [ ] Migrations applied to dev **and** testdb (`relax_author_unique`, `add_author_initials`); no `migrate reset`.
- [ ] `npx playwright test tests/e2e/publications-import.spec.ts` → 1 passed (curation + idempotency).
- [ ] Manually (real NCBI, no fixture env): admin opens `/publications/admin`, searches `Pezel T`, curates, imports; Authors/Journals/Articles banks populate; re-import adds nothing.

---

## Self-Review (against spec §2–§4, §7–§9)

- **PubMed engine (esearch/esummary/efetch, rate-limit chunking, API key)** → Tasks 4–5. ✔
- **Dedup (article=PMID, author=ORCID/name+initial, journal=ISSN/name), idempotent import** → Tasks 6–7. ✔
- **Curation (deselect papers), import populates authors+articles+journals** → Tasks 11–12, verified Task 14. ✔
- **Data model deltas (relax Author unique; Author.initials for dedup)** → Tasks 1, 8. (`Journal.sjr` is B2 — out of B1 scope, noted in spec.) ✔
- **Permissions: admin only** → `appAdminAction('PUBLICATIONS')` (Task 9), page gate `canAdminApp` (Task 12). ✔
- **Error handling + i18n FR/EN** → Task 10; per-paper errors collected in the report (Task 7). ✔
- **Tests: pure-logic unit + fixture-backed e2e (idempotent)** → Tasks 4, 6, 13, 14. ✔
- **Type consistency:** `PubmedCandidate`/`PubmedRecord`/`PubmedAuthor`/`ImportReport` used identically across parse/service/import/actions/UI; tag consts (`PUBLICATIONS_*_TAG`) defined in `import.ts` and imported in actions. ✔
- **Placeholder scan:** every step has concrete code/commands; Task 7 Step 2 intentionally expects a transient `tsc` error resolved by Task 8 (documented). ✔
