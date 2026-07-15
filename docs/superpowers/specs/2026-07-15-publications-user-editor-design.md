# Publications — User Publication Editor (design)

Date: 2026-07-15
Status: validated with user (brainstorm session)

## Goal

Let a portal member create a publication and manage it from their own editor screen — matching the approved Claude Design mockups ("Edit publication"): editable header, read-only author list with a "request author list to admin" workflow (with email), submission timeline with full CRUD, read-only journal queue, and a references card.

## Scope

**In scope (this build):**
- Draft creation from the "New publication" button (My Publications view).
- Editor page `/{locale}/publications/articles/[id]/edit` with 5 cards (header, authors, submissions, journal queue, references).
- Submission edit + delete (add + status-change already exist).
- `Article.contributorsNote` free-text field.
- `AuthorListRequest` model + "Request author list to admin" action + email to PUBLICATIONS admins (Resend, existing `lib/services/email.ts` infra).
- Admin inbox: "Author list requests" section on `/{locale}/publications/admin` with Resolve / Dismiss.

**Out of scope (fast-follow):**
- Admin management of the journal queue (`JournalTarget` create/reorder). The queue card renders read-only; empty state when no targets.
- PDF upload.
- PubMed auto-fill from PMID in the editor.
- Any other email notifications.

## Key decisions (user-validated)

1. **Creation flow**: "New publication" immediately creates a draft article and opens the editor (no intermediate dialog, no PMID-first import).
2. **Author workflow**: full request model (`AuthorListRequest`) + admin inbox + email — not just a flag.
3. **Article status**: **manual** — a Status select in the editor form. It is NOT derived from submissions (no auto-sync).
4. **Edit rights**: **first author or PUBLICATIONS admin** only. Co-authors keep the read-only detail page (`/publications/articles/[id]`).
5. Current journal + date shown in the header are **derived** (latest submission's journal/date, fallback `publishedJournal`/`publishedAt`) — never edited directly.

## Flow & routes

- **Create**: the "New publication" button (my-publications header) becomes a client button calling `createDraftArticleAction`, then `router.push(applicationLink(locale, "/publications/articles/{id}/edit"))`. The `/publications/new` stub page is **deleted** (no GET side effects, no double-draft in strict mode).
- **Editor**: `app/[locale]/publications/articles/[id]/edit/page.tsx` (server). Guards: `requireAuth` + `canAccessApp` + (first author of article OR `canAdminApp('PUBLICATIONS')`) — otherwise redirect to the detail page.
- **Table action button**: the pencil (first author rows) now links to the editor; the eye (co-author rows) keeps linking to the detail page.

### Draft semantics
- `createDraftArticle(userId)`:
  - find-or-create the caller's `Author` record (`Author.userId = userId`; created from user firstName/lastName if missing),
  - create `Article { title: "", status: IN_PREPARATION, type: ORIGINAL, createdById: userId }`,
  - create `Authorship { order: 1, isCorresponding: true }` linking that author → caller is first author by construction.
- Never-saved draft (`title === ""`): **Discard deletes the draft** and returns to My Publications. Otherwise Discard reverts the form client-side.
- Articles with empty titles render as *(Untitled)* (i18n key) in the table.

## Editor interaction model (matches mockup)

- **Saved form** (top bar: "You have unsaved changes" + Discard + Save changes): `title`, `type`, `status`, `studyId` (linked study), `pubmedId`, `doi`, `contributorsNote`. React Hook Form + Zod; single `updateArticleCoreAction` on Save; sonner toasts.
- **Immediate actions** (own buttons, effective on click): add / edit / delete a submission, change a submission status, "Request author list to admin".

## Data model (Prisma migrations)

```prisma
// Article: one new column
contributorsNote String?

enum AuthorListRequestStatus {
  PENDING
  RESOLVED
  DISMISSED
}

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
Plus inverse relations on `Article` and `User`. Uniqueness "one PENDING per article" is enforced in the service (transactional check), not by index.

## Services (`lib/services/publications/`)

- **`publication-editor.ts`** (new):
  - `createDraftArticle(userId)` (see draft semantics),
  - `getPublicationForEdit(articleId)` → header data, form values, ordered authorships (name, degrees, affiliation/centre label, isCorresponding, userId), submissions, journal targets, pending author-request flag, study options,
  - `updateArticleCore(articleId, { title, type, status, studyId, pubmedId, doi, contributorsNote })`,
  - `deleteDraft(articleId)` (only when `title === ""` and `status === IN_PREPARATION`),
  - `userIsFirstAuthor(userId, articleId)` (authorship order 1 with `author.userId = userId`).
- **`submissions.ts`** (extend): `updateSubmission(id, { journalName, submittedAt })` (find-or-create journal, same as add), `deleteSubmission(id)`.
- **`journal-targets.ts`** (new): `listJournalTargets(articleId)` — journal name/abbrev + IF + SJR, ordered by `rank`.
- **`author-requests.ts`** (new): `createAuthorListRequest(articleId, userId, note)` (snapshot note; rejects if a PENDING one exists → error code `REQUEST_EXISTS`), `listPendingAuthorRequests()` (article title, requester, note, createdAt), `resolveAuthorRequest(id, adminId, outcome: RESOLVED | DISMISSED)`.
- **`email.ts`** (extend): `sendAuthorListRequestEmail({ articleTitle, requesterName, note, recipients })`. Recipients = users with `role = ADMIN` or `adminApplications` containing `PUBLICATIONS`. Email is **best-effort**: failure is logged, the action still succeeds.

## Server actions (`app/[locale]/publications/actions.ts`)

| Action | Guard |
|---|---|
| `createDraftArticleAction` | `authenticatedAction` + `canAccessApp` |
| `updateArticleCoreAction` | first author OR `canAdminApp` |
| `deleteDraftArticleAction` | first author OR `canAdminApp`, and draft-empty check in service |
| `updateSubmissionAction`, `deleteSubmissionAction` | any author of the article (consistent with existing add/status actions used from the table timeline) |
| `requestAuthorListAction` | any author (first author in practice — button lives in the editor) |
| `resolveAuthorRequestAction` | `appAdminAction('PUBLICATIONS')` |

## UI components (`app/[locale]/publications/components/editor/`)

All client components < 350 lines, ≤ 5 props (grouped objects):

- **`publication-editor.tsx`** — shell: breadcrumb (My publications → Edit publication), unsaved-changes indicator, Discard / Save buttons, RHF form context; composes the 5 cards.
- **`editor-header.tsx`** — coral-accent card: first-author badge ("First author · you can edit" / admin), year, study chip; **inline-editable title** (pencil); Type + Status selects; info pill combining the (manual) status with the derived journal/date: `{status} at {journal} · {date} · {relative}`.
- **`editor-authors.tsx`** — numbered read-only author list (name, degrees badges, YOU badge when `author.userId === me`, Corresponding badge, centre/affiliation line); "The full co-author list is proposed and maintained by the admin"; contributors textarea (form field `contributorsNote`); **"Request author list to admin"** button → immediate action, disabled with "already requested" state when a PENDING request exists.
- **`editor-submissions.tsx`** — timeline reusing the visual language of `submission-history.tsx`, plus per-row **edit** (journal + date inline form) and **delete** (confirm) buttons; "Add a submission" identical to existing behaviour (auto-reject rule preserved).
- **`editor-journal-queue.tsx`** — read-only ranked list `1. Circulation — IF 37.8 · SJR 8.6`; subtitle "Submission queue proposed by the admin · read-only"; empty state when no targets.
- **`editor-references.tsx`** — PMID, DOI (form fields), Linked study (select over study options).

## Admin inbox

Section "Author list requests" on `/{locale}/publications/admin`: list of PENDING requests (article title → link to article, requester name, note, date) with **Resolve** and **Dismiss** buttons (sets status + resolvedAt/resolvedById). Badge count in the section title. Server-fetched in the admin page, small client component for the buttons.

## i18n

New namespaces in `messages/en.json` + `fr.json`:
- `publications.editor.*` — breadcrumb, unsavedChanges, save, discard, saved/deleted toasts, untitled, youCanEdit, authors card texts, contributorsLabel/placeholder, requestAuthorList, requestSent, alreadyRequested, submissions card (editSubmission, deleteSubmission, deleteConfirm), journalQueue texts, references texts (pmid, doi, linkedStudy, noStudy).
- `publications.adminRequests.*` — title, empty, resolve, dismiss, resolved/dismissed toasts.
All Zod/action errors mapped to translated toasts.

## Error handling

- Ownership failures throw `Forbidden` → generic translated toast.
- `REQUEST_EXISTS` → specific toast "already requested".
- Draft-delete on a non-empty article → service refuses (`DRAFT_NOT_EMPTY`), button not shown in that state anyway.
- Email failure: logged server-side, never blocks the request creation.

## Testing

- **Unit (vitest)**: pure helpers — derived header (journal/date fallback chain), draft-deletable predicate, recipients filter for the email.
- **E2E (playwright, testdb)**: one comprehensive flow — login `publications-user` → New publication → editor opens → set title/type/status + save → add a submission → edit it → request author list; login `publications-admin` → see the request in the inbox → resolve it. The test runs in EN (single comprehensive flow, per testing guidelines).
- Seed: `prisma/seed.test.ts` untouched (flow creates its own data).

## Non-goals / risks noted

- Manual status can diverge from submission reality (user's explicit choice); the UI keeps both visible side by side which mitigates confusion.
- `JournalTarget` stays admin-less this build: the queue card will usually show its empty state until the admin tooling ships.
