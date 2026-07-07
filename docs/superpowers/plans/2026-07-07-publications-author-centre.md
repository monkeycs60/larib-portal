# Publications — Author → primary centre — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** Each author in the authors bank has a **primary centre** (`Author.centreId`), auto-derived as the most frequent centre across their papers' affiliations, shown in the list, editable via a centre picker, and (re)derivable with an admin button.

**Architecture:** New `Author.centreId` → `Centre`. Pure `pickPrimaryCentre(centreIds, ownCentreIds)` (unit-tested, mode with isOwn tie-break). `recomputeAuthorCentres()` aggregates AuthorshipAffiliation→centre per author. Authors bank UI gains a Centre column + edit `<Select>` + "Derive from papers" button. Reuses B3/B4.

---

## Task 1: Model — Author.centreId + migration

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1:** In `model Author`, add (after `userId`/`user` block):
```prisma
  centreId  String?
  centre    Centre?  @relation("AuthorCentre", fields: [centreId], references: [id], onDelete: SetNull)
```
And in `model Centre`, add the inverse:
```prisma
  authors Author[] @relation("AuthorCentre")
```

- [ ] **Step 2:** `npx prisma migrate dev --name add_author_centre` ; then testdb: `node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"`.

- [ ] **Step 3:** `npx tsc --noEmit` (PASS); commit `feat(publications): add Author.centreId (migration)`.

---

## Task 2: Pure primary-centre picker — TDD

**Files:** Create `lib/services/publications/author-centre.ts`, `author-centre.test.ts`

- [ ] **Step 1: Test:**
```ts
import { describe, it, expect } from 'vitest'
import { pickPrimaryCentre } from './author-centre'
describe('pickPrimaryCentre', () => {
  it('returns the most frequent centre', () => {
    expect(pickPrimaryCentre(['a','a','b'], new Set())).toBe('a')
  })
  it('breaks ties by "our centre"', () => {
    expect(pickPrimaryCentre(['a','b'], new Set(['b']))).toBe('b')
  })
  it('returns null for no centres', () => {
    expect(pickPrimaryCentre([], new Set())).toBeNull()
  })
})
```
- [ ] **Step 2:** Run → fails.
- [ ] **Step 3: Implement:**
```ts
export function pickPrimaryCentre(centreIds: string[], ownCentreIds: Set<string>): string | null {
  if (centreIds.length === 0) return null
  const counts = new Map<string, number>()
  for (const id of centreIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  let best: string | null = null
  let bestCount = -1
  for (const [id, count] of counts) {
    const better = count > bestCount || (count === bestCount && ownCentreIds.has(id) && !(best && ownCentreIds.has(best)))
    if (better) { best = id; bestCount = count }
  }
  return best
}
```
- [ ] **Step 4:** Run → pass. Commit `feat(publications): pure primary-centre picker (unit-tested)`.

---

## Task 3: Service — recompute + list/update with centre

**Files:** Modify `lib/services/publications/authors.ts`

- [ ] **Step 1:** Extend `AuthorListItem` select with `centre: { select: { id: true, name: true } }`; add `centre` to `listAuthors` select. Add `centreId` to `UpdateAuthorInput` and `updateAuthor` data (`centreId: data.centreId ?? null`).

- [ ] **Step 2:** Add:
```ts
import { pickPrimaryCentre } from './author-centre'
export async function recomputeAuthorCentres(): Promise<{ updated: number }> {
  const links = await prisma.authorshipAffiliation.findMany({
    select: { authorship: { select: { authorId: true } }, affiliation: { select: { centreId: true } } },
  })
  const ownCentres = new Set((await prisma.centre.findMany({ where: { isOwn: true }, select: { id: true } })).map((centre) => centre.id))
  const byAuthor = new Map<string, string[]>()
  for (const link of links) {
    if (!link.affiliation.centreId) continue
    const list = byAuthor.get(link.authorship.authorId) ?? []
    list.push(link.affiliation.centreId)
    byAuthor.set(link.authorship.authorId, list)
  }
  let updated = 0
  for (const [authorId, centreIds] of byAuthor) {
    const primary = pickPrimaryCentre(centreIds, ownCentres)
    if (primary) { await prisma.author.update({ where: { id: authorId }, data: { centreId: primary } }); updated += 1 }
  }
  return { updated }
}
```

- [ ] **Step 3:** `npx tsc --noEmit` (PASS); commit `feat(publications): author-centre derivation + list/update`.

---

## Task 4: Actions

**Files:** Modify `app/[locale]/publications/actions.ts`

- [ ] **Step 1:** In the existing `AuthorInput` zod object, add `centreId: z.string().optional().nullable(),`. In `updateAuthorAction`, pass `centreId: parsedInput.centreId || null` to `updateAuthor`. Add:
```ts
import { recomputeAuthorCentres } from '@/lib/services/publications/authors'
export const recomputeAuthorCentresAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async () => {
    const result = await recomputeAuthorCentres()
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return result
  })
```
- [ ] **Step 2:** `npx tsc --noEmit` (PASS); commit `feat(publications): author-centre actions`.

---

## Task 5: UI + i18n

**Files:** Modify `authors-manager.tsx`, `admin/authors/page.tsx`, `messages/*.json`

- [ ] **Step 1: i18n** — in `publications.authors` (both locales) add: `colCentre` ("Centre"/"Centre"), `centre` ("Centre"/"Centre"), `noCentre` ("None"/"Aucun"), `derive` ("Derive centres from papers"/"Dériver les centres depuis les papiers"), `derived` ("{count} authors updated"/"{count} auteurs mis à jour").

- [ ] **Step 2: `admin/authors/page.tsx`** — also fetch centres: `const [authors, users, centres] = await Promise.all([listAuthors(), listLinkableUsers(), listCentres()])` (import `listCentres` from `centres.ts`), pass `centres` to `<AuthorsManager>`.

- [ ] **Step 3: `authors-manager.tsx`:**
  - Add prop `centres: { id: string; name: string }[]`.
  - Add a **Centre** column in the table: `{author.centre?.name ?? '—'}`.
  - In the edit dialog, add a centre `<Select {...register('centreId')}>` with `<option value="">{t('authors.noCentre')}</option>` + `centres.map(...)`; add `centreId` to the form schema + reset (`author.centre?.id ?? ''`) + submit (`centreId: values.centreId || null`).
  - Add a **"Derive centres from papers"** button calling `useAction(recomputeAuthorCentresAction)` → toast `authors.derived` + `router.refresh()`.
  - Import `recomputeAuthorCentresAction` from `../actions`.

- [ ] **Step 4:** Validate JSON; `npx tsc --noEmit` (PASS); commit `feat(publications): author bank shows/edits/derives primary centre`.

---

## Task 6: Data — recompute on neondb + verify

- [ ] **Step 1:** Run a one-off tsx script (fresh client) importing `pickPrimaryCentre` (relative) that inlines `recomputeAuthorCentres` against neondb; print `{updated}` + a sample (Pezel → primary centre). Remove the script after.

- [ ] **Step 2:** `npm run test:unit` green.

---

## DoD

- [ ] tsc green; unit green (picker).
- [ ] Migration dev+testdb (`add_author_centre`).
- [ ] Authors bank shows a Centre column; edit sets it; "Derive from papers" fills primary centres; Pezel → Lariboisière – AP-HP.
- [ ] Real data recomputed on neondb.

> Note: an author's centre is a **primary/home** centre (mode of their papers' affiliation centres); per-paper affiliations remain in `AuthorshipAffiliation`. Reminder: user must restart their dev server after the migration.
