# Publications — Add Author (design)

Date: 2026-07-19
Status: Approved (pending spec review)
App: `PUBLICATIONS` sub-app

## Goal

Let any Publications **member or admin** add a new author to the authors bank, with
**duplicate protection** so the same author is not created twice. Two entry paths, matching
the provided mockups:

1. **Manual entry** — fill the author's identity and affiliations by hand.
2. **From DOI / PMID** — fetch a publication, list every author, flag which are already in the
   bank vs. new, and bulk-add the selected new ones.

## Access

Reachable by anyone with access to the Publications app: `canAccessApp(user, 'PUBLICATIONS')`
(members via `applications`, admins via `adminApplications`, plus portal super-admins).

The admin authors bank (`admin/authors`) is unchanged and stays admin-only.

## Routes (new)

- `app/[locale]/publications/authors/page.tsx` — read-only authors list for members, with an
  **Add author** button. Server component; gated by `canAccessApp` else `redirect` to the app
  landing. Fetches `listAuthors()` for display.
- `app/[locale]/publications/authors/new/page.tsx` — the two-tab Add author form. Server
  component; same gate. Fetches `listCentres()` for the centre-bank picker and
  `listLinkableUsers()` for the portal-user picker, and passes both to the client form.
- Breadcrumb: **Authors › Add author** (the "Authors" crumb links to `publications/authors`).

## Data model (one Prisma migration, data-preserving)

CLAUDE.md rule respected: **no `migrate reset`, no DB reset.** The migration transforms existing
data in place.

```prisma
enum AuthorType {
  OUR_TEAM
  EXTERNAL
}

model Author {
  // ... existing fields ...
  type      AuthorType @default(OUR_TEAM)   // NEW
  degrees   String[]   @default([])         // CHANGED: was String? (free text)
  emails    String[]   @default([])         // NEW: multiple emails (email String? kept, see below)
  // centreId String?  kept = denormalized PRIMARY centre (in sync with AuthorCentre.isPrimary)
  centres        AuthorCentre[]             // NEW relation
  paperAffiliations AuthorAffiliation[]     // NEW relation
}

model AuthorCentre {
  id        String  @id @default(cuid())
  authorId  String
  author    Author  @relation(fields: [authorId], references: [id], onDelete: Cascade)
  centreId  String
  centre    Centre  @relation(fields: [centreId], references: [id], onDelete: Cascade)
  isPrimary Boolean @default(false)
  order     Int
  @@unique([authorId, centreId])
}

model AuthorAffiliation {
  id       String @id @default(cuid())
  authorId String
  author   Author @relation(fields: [authorId], references: [id], onDelete: Cascade)
  raw      String            // free text, exactly as printed on the paper
  order    Int
  @@index([authorId])
}
```

Migration data steps:
- `degrees` `String?` → `String[]`: split the existing value on commas, trim, drop empties.
- `emails` `String[]`: seed from the existing `email String?` (single → array of 0/1). Keep the
  legacy `email` column for backward compatibility (existing edit dialog / reads); on save,
  `email` mirrors `emails[0]` (or null).
- `AuthorCentre`: backfill one row per author that has a `centreId`, `isPrimary = true`,
  `order = 0`. `Author.centreId` stays the denormalized primary so existing centre-derivation
  and display code (`author-centre.ts`, tables) keep working unchanged.
- `AuthorAffiliation`: no backfill (new concept). `defaultAffiliation` is untouched.

Rationale: keeping `centreId` and `email` as denormalized/legacy columns means the migration is
additive for every existing reader; only the new form writes the richer structure.

## Author fields (final)

first name · last name · degrees (multi: MD/PhD/MSc/PharmD, free values preserved) ·
emails (multiple) · ORCID (optional) · author type (Our team / External) ·
centres (multiple from bank, first = primary) · affiliations (ordered free text) ·
**linked portal user (optional)**.

### Linked portal user

Optional link to a Larib Portal `User` (existing `Author.userId` relation). The form offers a
searchable picker fed by the existing `listLinkableUsers()` service (users not already linked to
another author). Selecting a user sets `Author.userId`. This is optional — most external authors
have no portal account.

## Duplicate rule

On manual submit, check via `findAuthorDuplicates({ orcid, firstName, lastName })`:
- **ORCID match** against an existing author → **hard block** (ORCID is unique). Clear message.
- **Name match** (first+last, accent/case-insensitive normalize) with no ORCID conflict →
  **soft warning**: return the matching authors; the form shows them and asks the user to
  confirm. Resubmit with `confirmDuplicate: true` to proceed.
- No match → create.

For the DOI/PMID flow, each fetched author is matched against the bank (ORCID first, then
normalized name) to render the **Already in bank** vs **New** badges; already-in-bank rows are
disabled and excluded from the bulk add.

## Services (`lib/services/publications/`)

- `authors.ts` (extend):
  - `createAuthor` input → `{ firstName, lastName, type, degrees[], emails[], orcid?, centreIds[], affiliations[], userId? }`.
    Writes the Author (incl. optional `userId` link), the `AuthorCentre` rows (first = primary,
    mirrored to `centreId`), and the `AuthorAffiliation` rows. Mirrors `email = emails[0] ?? null`.
    Existing callers that pass only `firstName/lastName` (e.g. `study-form.tsx`) keep working via
    defaults.
  - `findAuthorDuplicates({ orcid, firstName, lastName })` → `{ orcidMatch: AuthorLite | null, nameMatches: AuthorLite[] }`.
  - `normalizeName(value)` — lowercase + strip accents/diacritics + collapse whitespace (pure, unit-tested).
- `publication-lookup.ts` (new):
  - `fetchPublicationByIdentifier(identifier)` → normalized
    `{ source: 'doi' | 'pmid', doi?, pmid?, title, journal?, year?, authors: FetchedAuthor[] }`.
    - **PMID** (digits) → reuse `pubmed.ts` (`fetchByPmids`) + `pubmed-parse.ts`.
    - **DOI** (starts with `10.`) → Crossref works API `https://api.crossref.org/works/{doi}`
      (gives `given`, `family`, `ORCID`, `affiliation[].name`).
  - `FetchedAuthor = { firstName, lastName, orcid?, affiliationRaw? }`.
  - `matchAuthorsAgainstBank(fetched)` → `[{ ...fetched, status: 'existing' | 'new', existingId? }]`
    (ORCID match first, then normalized name).
  - Parsers (`parseCrossrefWork`, and the existing PubMed parse) are **pure** and unit-tested
    against saved fixtures.
- The network fetch is behind an **injectable seam** (a module-level `fetchImpl` /
  dependency parameter) so E2E can supply a deterministic fake without hitting the live network.

## Actions (`app/[locale]/publications/actions.ts`)

New factory in `actions/safe-action.ts`:
- `appMemberAction(app: Application)` — mirrors `appAdminAction` but authorizes with
  `canAccessApp(ctx.user, app)`; throws `'Forbidden'` otherwise.

Actions:
- `createAuthorAction` — **re-gated** from `appAdminAction('PUBLICATIONS')` to
  `appMemberAction('PUBLICATIONS')` (admins still pass `canAccessApp`). Extended input schema with
  the new fields + `confirmDuplicate?: boolean`. Behavior:
  - ORCID conflict → returns `{ blocked: 'ORCID', match }` (no write).
  - Name match & not `confirmDuplicate` → returns `{ warning: 'NAME', matches }` (no write).
  - Otherwise create; `revalidateTag(PUBLICATIONS_AUTHORS_TAG)`.
- `fetchPublicationAuthorsAction({ identifier })` — `appMemberAction`; calls
  `fetchPublicationByIdentifier` + `matchAuthorsAgainstBank`. Returns publication meta + author rows.
- `addAuthorsFromPublicationAction({ authors })` — `appMemberAction`; bulk-creates the selected
  **new** authors (skips any that now match by ORCID/name, defensively), type `EXTERNAL` by
  default, affiliation seeded from `affiliationRaw`; `revalidateTag(PUBLICATIONS_AUTHORS_TAG)`.

All mutations trigger `sonner` success/error toasts (next-intl messages), per CLAUDE.md.

## Components (`app/[locale]/publications/components/`)

Split to keep every file < 350 lines and ≤ 5 props (pass grouped props objects):
- `add-author-form.tsx` — tab shell (Manual entry / From DOI / PMID) using `toggle-group`.
- `manual-entry-form.tsx` — RHF + zod. Degree chips + Our-team/External via `toggle-group`;
  centre bank via `single-select`/`command` with an ordered "Add centre" list (first = primary);
  emails and affiliations via `tag-input`; ORCID input; optional linked-portal-user picker
  (`single-select`/`command` over `listLinkableUsers()`). Handles the duplicate-warning confirm flow.
- `doi-import-panel.tsx` — identifier input + Fetch; publication-found header; renders the list.
- `author-dedup-list.tsx` — the author rows with Already-in-bank / New badges, checkboxes,
  select/deselect all, and the "Add N to bank" bulk button.

## i18n

New keys under `publications.authors.add.*` in `messages/en.json` and `messages/fr.json`
(tabs, all field labels/placeholders, duplicate block/warning messages, DOI/PMID empty + found
states, badges, toasts). All Zod errors translated FR/EN.

## Testing

- **Unit**: `normalizeName`, `findAuthorDuplicates` logic, `parseCrossrefWork` (fixture),
  PubMed parse→normalize (fixture), `matchAuthorsAgainstBank`.
- **E2E** (`tests/e2e/publications-add-author.spec.ts`) — one comprehensive flow, both locales
  where cheap: a Publications member opens Add author →
  (a) manual create incl. the duplicate-warning confirm path, and
  (b) DOI import with the lookup **seam stubbed** to a deterministic fixture → select new authors
  → add to bank → verify they appear. No live network in CI.
- Seed a Publications-member (non-admin) user in `prisma/seed.test.ts` if none exists.

## Out of scope

- ORCID API enrichment/validation (ORCID stays free text, format-validated only).
- Editing the multi-centre / multi-email / affiliations structure from the existing admin edit
  dialog (that dialog keeps its current single-value behavior; a follow-up can enrich it).
- Merging fetched authors into existing ones (we only add new; existing are shown, not modified).
