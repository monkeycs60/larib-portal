# Publications M3 — Articles view — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the imported articles browsable: an admin **articles list** (title, journal, year, status, #authors) with search/filter, and an **article detail** page showing metadata + the **ordered authorship list with each author's affiliation and centre** (so you can see who belongs to which centre). Admins can update an article's single-field status.

**Architecture:** Server pages fetch via a new `lib/services/publications/articles.ts`, prop-drill to client components (search/filter list; status `<Select>`). Status update via `appAdminAction('PUBLICATIONS')`. Reuses B1–B4 data (articles, authorships, authors, affiliations, centres). No schema change.

**Tech Stack:** Next.js 15, Prisma, next-safe-action, raw RHF-free client components + `useAction` + sonner, shadcn/ui, next-intl, Playwright.

Spec: `docs/superpowers/specs/2026-07-03-publications-management-design.md` (Phase 1: article detail + status). This slice = **admin browse + detail + status**; member "Mes publications" (author-scoped) and authorship editing are later slices.

---

## File Structure

- Create: `lib/services/publications/articles.ts` — `listArticles`, `getArticle`, `ARTICLE_STATUSES`.
- Create: `app/[locale]/publications/admin/articles/page.tsx` — server list page (gated `canAdminApp`).
- Create: `app/[locale]/publications/components/articles-list.tsx` (client) — table + search + status filter.
- Create: `app/[locale]/publications/articles/[id]/page.tsx` — detail (gated `canAccessApp`).
- Create: `app/[locale]/publications/components/article-status-select.tsx` (client) — status `<Select>` → `updateArticleStatusAction`.
- Modify: `app/[locale]/publications/actions.ts` — `updateArticleStatusAction`.
- Modify: `app/[locale]/publications/admin/page.tsx` — link to the articles list.
- Modify: `messages/en.json`, `messages/fr.json` — `publications.articles.*`.
- Create: `tests/e2e/publications-articles.spec.ts`.

**Verification:** `npx tsc --noEmit`, `npm run test:unit` (unchanged), `npm run test:seed` + `npx playwright test` (testdb + `PUBMED_FIXTURE_DIR` server on 3100 + temp config — established pattern).

---

## Task 1: Articles service

**Files:** Create `lib/services/publications/articles.ts`

- [ ] **Step 1: Implement `lib/services/publications/articles.ts`:**

```ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { PUBLICATIONS_ARTICLES_TAG } from './import'

export const ARTICLE_STATUSES = ['IN_PREPARATION', 'UNDER_REVIEW', 'TO_RESUBMIT', 'ACCEPTED', 'PUBLISHED', 'ABANDONED'] as const
export type ArticleStatusValue = (typeof ARTICLE_STATUSES)[number]

export type ArticleListItem = Prisma.ArticleGetPayload<{
  select: {
    id: true; title: true; status: true; publishedAt: true; doi: true; pubmedId: true
    publishedJournal: { select: { name: true } }
    _count: { select: { authorships: true } }
  }
}>

export async function listArticles(): Promise<ArticleListItem[]> {
  return prisma.article.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true, title: true, status: true, publishedAt: true, doi: true, pubmedId: true,
      publishedJournal: { select: { name: true } },
      _count: { select: { authorships: true } },
    },
  })
}

export type ArticleDetail = Prisma.ArticleGetPayload<{
  select: {
    id: true; title: true; abstract: true; type: true; status: true; publishedAt: true; doi: true; pubmedId: true
    publishedJournal: { select: { name: true; issn: true } }
    study: { select: { id: true; title: true } }
    authorships: {
      select: {
        order: true; isCorresponding: true
        author: { select: { id: true; firstName: true; lastName: true; orcid: true } }
        affiliations: {
          select: { order: true; affiliation: { select: { name: true; centre: { select: { name: true; isOwn: true } } } } }
        }
      }
    }
  }
}>

export async function getArticle(id: string): Promise<ArticleDetail | null> {
  return prisma.article.findUnique({
    where: { id },
    select: {
      id: true, title: true, abstract: true, type: true, status: true, publishedAt: true, doi: true, pubmedId: true,
      publishedJournal: { select: { name: true, issn: true } },
      study: { select: { id: true, title: true } },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          order: true, isCorresponding: true,
          author: { select: { id: true, firstName: true, lastName: true, orcid: true } },
          affiliations: {
            orderBy: { order: 'asc' },
            select: { order: true, affiliation: { select: { name: true, centre: { select: { name: true, isOwn: true } } } } },
          },
        },
      },
    },
  })
}

export async function updateArticleStatus(id: string, status: ArticleStatusValue) {
  return prisma.article.update({ where: { id }, data: { status }, select: { id: true } })
}

export { PUBLICATIONS_ARTICLES_TAG }
```

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add lib/services/publications/articles.ts
git commit -m "feat(publications): articles service (list, detail with affiliations/centres, status)"
```

---

## Task 2: Status update action

**Files:** Modify `app/[locale]/publications/actions.ts`

- [ ] **Step 1: Append** to `app/[locale]/publications/actions.ts`:

```ts
import { updateArticleStatus, ARTICLE_STATUSES } from '@/lib/services/publications/articles'

export const updateArticleStatusAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), status: z.enum(ARTICLE_STATUSES) }))
  .action(async ({ parsedInput }) => {
    const updated = await updateArticleStatus(parsedInput.id, parsedInput.status)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })
```

(`PUBLICATIONS_ARTICLES_TAG` is already imported in this file from `./import`.)

- [ ] **Step 2: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/actions.ts
git commit -m "feat(publications): update article status action"
```

---

## Task 3: i18n keys (EN + FR)

**Files:** Modify `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: `messages/en.json`** — inside the `publications` object (after the `centres` block's closing `}`, add a comma then), add:

```json
    "articles": {
      "title": "Articles",
      "subtitle": "Browse imported publications, their authors and centres.",
      "search": "Search by title or journal…",
      "allStatuses": "All statuses",
      "colTitle": "Title",
      "colJournal": "Journal",
      "colYear": "Year",
      "colStatus": "Status",
      "colAuthors": "Authors",
      "manageLink": "Browse articles",
      "backToList": "← Back to articles",
      "authors": "Authors",
      "affiliations": "Affiliations & centres",
      "correspondingShort": "corresponding",
      "noCentre": "no centre",
      "abstract": "Abstract",
      "openPubmed": "PubMed",
      "openDoi": "DOI",
      "statusSaved": "Status updated",
      "actionError": "Could not update. Please try again.",
      "status": {
        "IN_PREPARATION": "In preparation",
        "UNDER_REVIEW": "Under review",
        "TO_RESUBMIT": "To resubmit",
        "ACCEPTED": "Accepted",
        "PUBLISHED": "Published",
        "ABANDONED": "Abandoned"
      }
    }
```

- [ ] **Step 2: `messages/fr.json`** — French mirror:

```json
    "articles": {
      "title": "Articles",
      "subtitle": "Parcourez les publications importées, leurs auteurs et centres.",
      "search": "Rechercher par titre ou journal…",
      "allStatuses": "Tous les statuts",
      "colTitle": "Titre",
      "colJournal": "Journal",
      "colYear": "Année",
      "colStatus": "Statut",
      "colAuthors": "Auteurs",
      "manageLink": "Parcourir les articles",
      "backToList": "← Retour aux articles",
      "authors": "Auteurs",
      "affiliations": "Affiliations & centres",
      "correspondingShort": "correspondant",
      "noCentre": "sans centre",
      "abstract": "Résumé",
      "openPubmed": "PubMed",
      "openDoi": "DOI",
      "statusSaved": "Statut mis à jour",
      "actionError": "Échec de la mise à jour. Réessayez.",
      "status": {
        "IN_PREPARATION": "En préparation",
        "UNDER_REVIEW": "En revue",
        "TO_RESUBMIT": "À resoumettre",
        "ACCEPTED": "Accepté",
        "PUBLISHED": "Publié",
        "ABANDONED": "Abandonné"
      }
    }
```

- [ ] **Step 3: Validate JSON + commit.**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('ok')"`
```bash
git add messages/en.json messages/fr.json
git commit -m "feat(publications): i18n for articles view"
```

---

## Task 4: Articles list (client) + page + admin link

**Files:** Create `app/[locale]/publications/components/articles-list.tsx`, `app/[locale]/publications/admin/articles/page.tsx`; Modify `app/[locale]/publications/admin/page.tsx`

- [ ] **Step 1: Create `app/[locale]/publications/components/articles-list.tsx`:**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/app/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { ArticleListItem } from '@/lib/services/publications/articles'
import { ARTICLE_STATUSES } from '@/lib/services/publications/articles'

export function ArticlesList({ articles }: { articles: ArticleListItem[] }) {
  const t = useTranslations('publications')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return articles.filter((article) => {
      if (status && article.status !== status) return false
      if (!needle) return true
      return article.title.toLowerCase().includes(needle) || (article.publishedJournal?.name ?? '').toLowerCase().includes(needle)
    })
  }, [articles, query, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('articles.search')} className="max-w-sm" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[200px]">
          <option value="">{t('articles.allStatuses')}</option>
          {ARTICLE_STATUSES.map((value) => (
            <option key={value} value={value}>{t(`articles.status.${value}`)}</option>
          ))}
        </Select>
        <span className="text-sm text-text-secondary">{filtered.length}</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('articles.colTitle')}</TableHead>
            <TableHead>{t('articles.colJournal')}</TableHead>
            <TableHead>{t('articles.colYear')}</TableHead>
            <TableHead>{t('articles.colStatus')}</TableHead>
            <TableHead>{t('articles.colAuthors')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((article) => (
            <TableRow key={article.id}>
              <TableCell className="font-medium">
                <Link href={`/publications/articles/${article.id}`} className="text-navy-600 underline-offset-4 hover:underline">
                  {article.title}
                </Link>
              </TableCell>
              <TableCell>{article.publishedJournal?.name ?? '—'}</TableCell>
              <TableCell>{article.publishedAt ? new Date(article.publishedAt).getFullYear() : '—'}</TableCell>
              <TableCell><Badge variant="secondary">{t(`articles.status.${article.status}`)}</Badge></TableCell>
              <TableCell>{article._count.authorships}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

> Verify `components/ui/badge.tsx` exposes `Badge` with a `variant` prop (from earlier exploration it does). If `variant="secondary"` is unavailable, drop the prop.

- [ ] **Step 2: Create `app/[locale]/publications/admin/articles/page.tsx`:**

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listArticles } from '@/lib/services/publications/articles'
import { ArticlesList } from '@/app/[locale]/publications/components/articles-list'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsArticlesPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications' })
  const articles = await listArticles()
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('articles.title')} subtitle={t('articles.subtitle')} />
      <ArticlesList articles={articles} />
    </div>
  )
}
```

- [ ] **Step 3: Add a link** on `app/[locale]/publications/admin/page.tsx` in the existing links `<div className="flex gap-4">`:

```tsx
        <Link href="/publications/admin/articles" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('articles.manageLink')} →
        </Link>
```

- [ ] **Step 4: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/components/articles-list.tsx app/\[locale\]/publications/admin/articles/page.tsx app/\[locale\]/publications/admin/page.tsx
git commit -m "feat(publications): admin articles list with search/status filter"
```

---

## Task 5: Article detail page + status select

**Files:** Create `app/[locale]/publications/components/article-status-select.tsx`, `app/[locale]/publications/articles/[id]/page.tsx`

- [ ] **Step 1: Create `app/[locale]/publications/components/article-status-select.tsx`:**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Select } from '@/components/ui/select'
import { updateArticleStatusAction } from '../actions'
import { ARTICLE_STATUSES, type ArticleStatusValue } from '@/lib/services/publications/articles'

export function ArticleStatusSelect({ id, status }: { id: string; status: ArticleStatusValue }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const { execute, isExecuting } = useAction(updateArticleStatusAction, {
    onSuccess() { toast.success(t('articles.statusSaved')); router.refresh() },
    onError() { toast.error(t('articles.actionError')) },
  })
  return (
    <Select
      defaultValue={status}
      disabled={isExecuting}
      onChange={(event) => execute({ id, status: event.target.value as ArticleStatusValue })}
      className="max-w-[220px]"
    >
      {ARTICLE_STATUSES.map((value) => (
        <option key={value} value={value}>{t(`articles.status.${value}`)}</option>
      ))}
    </Select>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/publications/articles/[id]/page.tsx`:**

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { getArticle } from '@/lib/services/publications/articles'
import { ArticleStatusSelect } from '@/app/[locale]/publications/components/article-status-select'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function ArticleDetailPage({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))
  const t = await getTranslations({ locale, namespace: 'publications' })
  const article = await getArticle(id)
  if (!article) notFound()
  const isAdmin = canAdminApp(session.user, 'PUBLICATIONS')

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Link href="/publications/admin/articles" className="text-sm text-text-secondary hover:underline">{t('articles.backToList')}</Link>
      <PageHeader
        title={article.title}
        subtitle={[article.publishedJournal?.name, article.publishedAt ? new Date(article.publishedAt).getFullYear() : null].filter(Boolean).join(' · ')}
      />

      <div className="flex flex-wrap items-center gap-3">
        {isAdmin
          ? <ArticleStatusSelect id={article.id} status={article.status} />
          : <span className="text-sm text-text-secondary">{t(`articles.status.${article.status}`)}</span>}
        {article.pubmedId && <a className="text-sm text-navy-600 hover:underline" href={`https://pubmed.ncbi.nlm.nih.gov/${article.pubmedId}/`} target="_blank" rel="noreferrer">{t('articles.openPubmed')}</a>}
        {article.doi && <a className="text-sm text-navy-600 hover:underline" href={`https://doi.org/${article.doi}`} target="_blank" rel="noreferrer">{t('articles.openDoi')}</a>}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-coral-600">{t('articles.authors')}</h2>
        <ol className="space-y-1">
          {article.authorships.map((authorship) => (
            <li key={authorship.order} className="text-sm">
              <span className="font-medium">{authorship.author.firstName} {authorship.author.lastName.toUpperCase()}</span>
              {authorship.isCorresponding ? <span className="text-text-secondary"> ({t('articles.correspondingShort')})</span> : null}
              {authorship.affiliations.length > 0 && (
                <span className="text-text-secondary">
                  {' — '}
                  {authorship.affiliations.map((link) => link.affiliation.centre?.name ?? t('articles.noCentre')).join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {article.abstract && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-coral-600">{t('articles.abstract')}</h2>
          <p className="text-sm text-text-secondary whitespace-pre-line">{article.abstract}</p>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check + commit.**

Run: `npx tsc --noEmit` (PASS)
```bash
git add app/\[locale\]/publications/components/article-status-select.tsx app/\[locale\]/publications/articles
git commit -m "feat(publications): article detail with authors/centres and status edit"
```

---

## Task 6: E2E — list + detail + status

**Files:** Create `tests/e2e/publications-articles.spec.ts`

Imports a fixture paper (Task path from B1: 2 candidates, affiliations create centres via B4 import wiring), then browses the list and opens the detail.

- [ ] **Step 1: Implement `tests/e2e/publications-articles.spec.ts`:**

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

test('admin browses articles and opens a detail with authors + centre', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // Import the fixture papers
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByRole('button', { name: /import selected \(2\)/i })).toBeVisible()
  await page.getByRole('button', { name: /import selected \(2\)/i }).click()
  await expect(page.getByRole('paragraph').filter({ hasText: /imported/i })).toBeVisible()

  // Articles list shows the imported title
  await page.goto('/en/publications/admin/articles', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /^articles$/i })).toBeVisible()
  const titleLink = page.getByRole('link', { name: /Multimodal imaging of the mitral valve/i })
  await expect(titleLink).toBeVisible()

  // Detail shows the author with the auto-extracted centre
  await titleLink.click()
  await expect(page.getByRole('heading', { name: /Multimodal imaging of the mitral valve/i })).toBeVisible()
  await expect(page.getByText(/Lariboisière/i)).toBeVisible()
})
```

- [ ] **Step 2: Seed + run.**

Run: `npm run test:seed && npx playwright test tests/e2e/publications-articles.spec.ts` (server needs testdb + `PUBMED_FIXTURE_DIR`; 1 passed)

- [ ] **Step 3: Commit.**

```bash
git add tests/e2e/publications-articles.spec.ts
git commit -m "test(publications): e2e articles list + detail with author centres"
```

---

## M3 — Definition of Done

- [ ] `npx tsc --noEmit` green; `npm run test:unit` still green.
- [ ] `/publications/admin/articles` lists articles with search + status filter; clicking a title opens `/publications/articles/[id]`.
- [ ] Detail shows ordered authors with their centre(s), corresponding flag, PubMed/DOI links, abstract; admin can change the status (persists, toast).
- [ ] `npx playwright test tests/e2e/publications-articles.spec.ts` → 1 passed.
- [ ] Manually on real data: browse the 163 papers; open one → see each author's centre (Lariboisière – AP-HP, CHU de …).

---

## Self-Review (against spec Phase 1)

- **Article detail (status, journal, authorship)** → Tasks 1, 5. ✔
- **Single-field status with admin edit** → Tasks 2, 5. ✔
- **See author ↔ centre** (the user's ask) → detail authorship list renders each author's affiliation centre (Task 5). ✔
- **Browse/list** → Task 4 (admin list, search + status filter). ✔
- **Deferred (later slices, noted):** member "Mes publications" author-scoped view + edit-if-first-author; authorship reordering/editing; study grouping. Out of this slice.
- **Type consistency:** `ArticleListItem`/`ArticleDetail`/`ArticleStatusValue`/`ARTICLE_STATUSES` shared from `articles.ts` across service/actions/pages/components; `PUBLICATIONS_ARTICLES_TAG` reused from `import.ts`. ✔
- **Placeholder scan:** every step has concrete code/commands. ✔
