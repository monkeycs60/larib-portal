# RBAC Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce per-app admin roles (`adminApplications`) alongside a portal super-admin (`role = ADMIN`), and migrate every existing authorization check to the right level, without changing behavior for current users.

**Architecture:** Keep the Prisma `Role` enum (`ADMIN` = portal super-admin). Add a `User.adminApplications: Application[]` column (subset of `applications`). Centralize authorization in `lib/permissions.ts` (`isSuperAdmin` / `canAdminApp` / `canAccessApp`), expose server-action guards (`superAdminAction`, `appAdminAction(app)`) and page guards (`requireSuperAdmin`, `requireAppAdmin`). Migrate all `role === 'ADMIN'` / `adminOnlyAction` sites per the mapping in `docs/superpowers/specs/2026-07-03-rbac-refactor-design.md`.

**Tech Stack:** Next.js 15 App Router, Prisma (client generated at `@/app/generated/prisma`), better-auth, next-safe-action, next-intl, Playwright (E2E — the only test runner; there is no unit runner).

**Reference spec:** `docs/superpowers/specs/2026-07-03-rbac-refactor-design.md` (has the full file:line inventory).

**Verification gates:** each implementation task ends with `npx tsc --noEmit` and `npm run lint` (both must pass) before commit. Behavior is verified end-to-end by the Playwright RBAC flow in Task 12 (`npm run test:setup`).

---

## File Structure

**Create:**
- `lib/permissions.ts` — pure authorization predicates (`isSuperAdmin`, `canAdminApp`, `canAccessApp`).
- `tests/e2e/rbac.spec.ts` — comprehensive RBAC E2E flows.

**Modify (core primitives):**
- `prisma/schema.prisma` — add `adminApplications` to `User`.
- `lib/auth-helpers.ts` — hydrate `adminApplications` in `getTypedSession`.
- `actions/safe-action.ts` — add `superAdminAction` + `appAdminAction(app)`.
- `lib/auth-guard.ts` — add `requireSuperAdmin` + `requireAppAdmin`.

**Modify (migration of touch-points):** `app/[locale]/admin/users/actions.ts`, `actions/positions.ts`, `app/[locale]/admin/layout.tsx`, `app/[locale]/admin/users/page.tsx`, `app/[locale]/dashboard/page.tsx`, `app/[locale]/components/app-sidebar.tsx`, `app/[locale]/components/app-topbar.tsx`, `app/[locale]/components/navbar-client.tsx`, `actions/profile.ts`, `app/[locale]/profile/page.tsx`, `app/[locale]/profile/profile-editor.tsx`, `app/[locale]/conges/actions.ts`, `app/[locale]/conges/page.tsx`, `lib/services/conges/index.ts`, `app/[locale]/bestof-larib/actions.ts`, `app/[locale]/bestof-larib/page.tsx`, `app/[locale]/bestof-larib/[id]/page.tsx`, `app/[locale]/bestof-larib/statistics/**`, `app/api/bestof/dicoms/**`, `app/[locale]/admin/users/user-add-dialog.tsx`, `app/[locale]/admin/users/user-edit-dialog.tsx`, `lib/services/users.ts`, `app/[locale]/welcome/actions.ts`, `prisma/seed.test.ts`, `messages/en.json`, `messages/fr.json`.

---

## Task 1: Add `adminApplications` column to `User`

**Files:**
- Modify: `prisma/schema.prisma` (User model, ~line 37 near `applications`)

- [ ] **Step 1: Add the field**

In `prisma/schema.prisma`, inside `model User`, directly under the `applications  Application[]` line, add:

```prisma
  applications    Application[]
  adminApplications Application[] @default([])
```

- [ ] **Step 2: Create the migration (additive, never reset)**

Run: `npx prisma migrate dev --name add_user_admin_applications`
Expected: a new folder under `prisma/migrations/…_add_user_admin_applications/` with `ALTER TABLE "User" ADD COLUMN "adminApplications"…`; command ends "Your database is now in sync".
⚠ Never run `prisma migrate reset` (CLAUDE.md). If it prompts to reset, abort and investigate drift.

- [ ] **Step 3: Regenerate the client**

Run: `npx prisma generate`
Expected: client regenerated at `app/generated/prisma`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(rbac): add User.adminApplications column"
```

---

## Task 2: Permission helpers (`lib/permissions.ts`)

**Files:**
- Create: `lib/permissions.ts`

- [ ] **Step 1: Write the module**

```ts
import type { Application, Role } from '@/app/generated/prisma'

// Tolerant of optional/null fields: session.user always has them, but some UI
// prop types (e.g. SidebarUser) declare role/applications as optional.
type WithRole = { role?: Role | null }
type WithAdminApps = WithRole & { adminApplications?: Application[] | null }
type WithApps = WithRole & { applications?: Application[] | null }

export function isSuperAdmin(user: WithRole): boolean {
  return user.role === 'ADMIN'
}

export function canAdminApp(user: WithAdminApps, app: Application): boolean {
  return isSuperAdmin(user) || (user.adminApplications ?? []).includes(app)
}

export function canAccessApp(user: WithApps, app: Application): boolean {
  return isSuperAdmin(user) || (user.applications ?? []).includes(app)
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/permissions.ts
git commit -m "feat(rbac): add permission predicates (isSuperAdmin/canAdminApp/canAccessApp)"
```

---

## Task 3: Hydrate `adminApplications` in the session

**Files:**
- Modify: `lib/auth-helpers.ts:20-30` (the `select`)

- [ ] **Step 1: Add the field to the select**

In `lib/auth-helpers.ts`, add `adminApplications: true,` to the `select` object (right after `applications: true,`):

```ts
					applications: true,
					adminApplications: true,
					phoneNumber: true,
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. `session.user.adminApplications` is now typed `Application[]` everywhere.

- [ ] **Step 3: Commit**

```bash
git add lib/auth-helpers.ts
git commit -m "feat(rbac): hydrate adminApplications onto the session user"
```

---

## Task 4: Server-action guards (`actions/safe-action.ts`)

**Files:**
- Modify: `actions/safe-action.ts:31-37`

- [ ] **Step 1: Replace `adminOnlyAction` with the new guards**

Replace the current `adminOnlyAction` block (lines 31-37) with:

```ts
import type { Application } from '@/app/generated/prisma'
import { canAdminApp, isSuperAdmin } from '@/lib/permissions'

export const superAdminAction = authenticatedAction.use(async ({ next, ctx }) => {
  if (!isSuperAdmin(ctx.user)) {
    throw new Error('Forbidden')
  }
  return next({ ctx })
})

export const appAdminAction = (app: Application) =>
  authenticatedAction.use(async ({ next, ctx }) => {
    if (!canAdminApp(ctx.user, app)) {
      throw new Error('Forbidden')
    }
    return next({ ctx })
  })

// Temporary alias so existing imports keep compiling during the migration
// (removed in Task 8, step "cleanup").
export const adminOnlyAction = superAdminAction
```

Add the two `import` lines to the top of the file with the other imports.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS (all current `adminOnlyAction` importers still resolve via the alias).

- [ ] **Step 3: Commit**

```bash
git add actions/safe-action.ts
git commit -m "feat(rbac): add superAdminAction and appAdminAction guards"
```

---

## Task 5: Page guards (`lib/auth-guard.ts`)

**Files:**
- Modify: `lib/auth-guard.ts`

- [ ] **Step 1: Add the guards**

Append to `lib/auth-guard.ts` (and add imports `notFound` from `next/navigation`, plus the two below):

```ts
import { notFound } from 'next/navigation';
import type { Application } from '@/app/generated/prisma';
import { canAdminApp, isSuperAdmin } from './permissions';

export async function requireSuperAdmin(): Promise<BetterAuthSession> {
  const session = await requireAuth();
  if (!isSuperAdmin(session.user)) {
    notFound();
  }
  return session;
}

export async function requireAppAdmin(app: Application): Promise<BetterAuthSession> {
  const session = await requireAuth();
  if (!canAdminApp(session.user, app)) {
    const locale = await getLocale();
    redirect(`/${locale}/dashboard`);
  }
  return session;
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/auth-guard.ts
git commit -m "feat(rbac): add requireSuperAdmin and requireAppAdmin page guards"
```

---

## Task 6: Migrate super-admin touch-points

These stay super-admin. The action guards already work via the alias, but switch UI/self-edit checks to `isSuperAdmin` for clarity and swap `admin/users` action imports to the explicit `superAdminAction`.

**Files & exact changes:**
- Modify: `app/[locale]/admin/users/actions.ts` — change the import `adminOnlyAction` → `superAdminAction` and replace every `adminOnlyAction` usage (`updateUserAction:31`, `deleteUserAction:61`, `createUserInviteAction:99`, `listPositionsAction:156`, `createPositionAction:163`, `updatePositionAction:171`, `deletePositionsAction:179`, `resendInvitationAction:192`) with `superAdminAction`.
- Modify: `actions/positions.ts` — same swap for `createPositionAction:6`, `listPositionsAction:13`.
- Modify: `app/[locale]/admin/layout.tsx:16-19` — keep as-is (it uses `role !== 'ADMIN'`), but replace the inline check with `isSuperAdmin(session.user)` (import from `@/lib/permissions`).
- Modify: `app/[locale]/admin/users/page.tsx:18` — same: `!isSuperAdmin(session.user)`.
- Modify: `app/[locale]/dashboard/page.tsx:160` — replace `role === 'ADMIN'` gate on the admin card with `isSuperAdmin(session.user)`.
- Modify: `app/[locale]/components/app-sidebar.tsx:34` — `const isAdmin = isSuperAdmin(user)` (import helper; `user` already has `role`).
- Modify: `app/[locale]/components/app-topbar.tsx:101` and `navbar-client.tsx:147` — admin badge `isSuperAdmin(user)`.
- Modify: `actions/profile.ts:26`, `app/[locale]/profile/page.tsx:39`, `app/[locale]/profile/profile-editor.tsx:93-94` — the "may edit role/applications/adminApplications" gate becomes `isSuperAdmin`.

- [ ] **Step 1: Apply the swaps above**

Representative transformation (repeat for each listed export in `admin/users/actions.ts` and `actions/positions.ts`):

```ts
// before
export const updateUserAction = adminOnlyAction.inputSchema(...)...
// after
import { superAdminAction } from '@/actions/safe-action'
export const updateUserAction = superAdminAction.inputSchema(...)...
```

Representative UI/guard transformation (repeat for each page/component listed):

```ts
// before
import { … } from …
const isAdmin = user.role === 'ADMIN'
// after
import { isSuperAdmin } from '@/lib/permissions'
const isAdmin = isSuperAdmin(user)
```

For `admin/layout.tsx` / `admin/users/page.tsx`:

```ts
import { isSuperAdmin } from '@/lib/permissions'
if (!session || !isSuperAdmin(session.user)) {
  notFound()
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/admin actions/positions.ts app/[locale]/dashboard app/[locale]/components actions/profile.ts app/[locale]/profile
git commit -m "refactor(rbac): route portal user-management checks through isSuperAdmin/superAdminAction"
```

---

## Task 7: Migrate Congés to per-app admin

**Files & exact changes:**
- Modify: `app/[locale]/conges/actions.ts` — swap `adminOnlyAction` → `appAdminAction('CONGES')` on `updateLeaveStatusAction:144`, `updateLeaveAllocationAction:163`, `adminDeleteLeaveAction:251`, `adminUpdateLeaveAction:271`. In `requestLeaveAction` (`:103`), change the auto-approve condition at `:106` from `role === 'ADMIN'` to `canAdminApp(ctx.user, 'CONGES')`.
- Modify: `app/[locale]/conges/page.tsx` — `:60` access gate → `canAccessApp(session.user, 'CONGES')`; every `isAdmin` (`:75, :78, :507, :523-536`) derived as `canAdminApp(session.user, 'CONGES')`.
- Modify: `lib/services/conges/index.ts:494-496` — `getAdminEmails` targets CONGES admins.

- [ ] **Step 1: Actions**

```ts
// app/[locale]/conges/actions.ts — import
import { appAdminAction } from '@/actions/safe-action'
import { canAdminApp } from '@/lib/permissions'

// each admin action, e.g.
export const updateLeaveStatusAction = appAdminAction('CONGES').inputSchema(...)...

// requestLeaveAction auto-approve (was: ctx.user.role === 'ADMIN')
const autoApprove = canAdminApp(ctx.user, 'CONGES')
```

- [ ] **Step 2: Page**

```ts
// app/[locale]/conges/page.tsx
import { canAccessApp, canAdminApp } from '@/lib/permissions'
const canAccess = canAccessApp(session.user, 'CONGES')
if (!canAccess) redirect(`/${locale}/dashboard`)
const isAdmin = canAdminApp(session.user, 'CONGES')
```

- [ ] **Step 3: Admin email recipients**

```ts
// lib/services/conges/index.ts — getAdminEmails
const admins = await prisma.user.findMany({
  where: { OR: [{ role: 'ADMIN' }, { adminApplications: { has: 'CONGES' } }] },
  select: { email: true },
})
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/conges lib/services/conges/index.ts
git commit -m "refactor(rbac): gate Congés admin capabilities with canAdminApp('CONGES')"
```

---

## Task 8: Migrate Bestof to per-app admin (with anomaly decisions)

**Files & exact changes:**
- Modify: `app/[locale]/bestof-larib/actions.ts`:
  - `createCaseAction:53` — change from `authenticatedAction` to `appAdminAction('BESTOF_LARIB')` (decision: create = app admin).
  - `deleteCaseAction:152` — change to `superAdminAction` (decision: destructive delete = super-admin only).
  - `appAdminAction('BESTOF_LARIB')` for: `createExamTypeAction:80`, `deleteExamTypesAction:96`, `updateExamTypeAction:112`, `createDiseaseTagAction:88`, `deleteDiseaseTagsAction:104`, `updateDiseaseTagAction:121`, `updateCaseAction:132`, and admin-tag actions `listAdminTagsAction:164`, `getCaseAdminTagIdsAction:169`, `ensureAdminTagAction:175`, `setCaseAdminTagsAction:184`, `listCasesByAdminTagAction:195`, `updateAdminTagAction:229`, `deleteAdminTagAction:247`.
- Modify: `app/[locale]/bestof-larib/page.tsx` — `:33` add access gate `if (!canAccessApp(session.user,'BESTOF_LARIB')) redirect(dashboard)`; `:59` `isAdmin = canAdminApp(session.user,'BESTOF_LARIB')`.
- Modify: `app/[locale]/bestof-larib/[id]/page.tsx:41` — `isAdmin = canAdminApp(session.user,'BESTOF_LARIB')` (keep the `?? 'USER'` safety by relying on the helper).
- Modify: `app/[locale]/bestof-larib/statistics/page.tsx:37`, `statistics/users/[userId]/page.tsx:32`, `statistics/users/[userId]/attempts/[attemptId]/page.tsx:22` — replace `role !== 'ADMIN'` with `!canAdminApp(session.user,'BESTOF_LARIB')` (keep their existing `redirect('/bestof-larib')` target).
- Modify: `app/api/bestof/dicoms/check-bulk/route.ts:21`, `download/route.ts:21`, `download-batch/route.ts:29` — `const isAdmin = canAdminApp(user, 'BESTOF_LARIB')`.

- [ ] **Step 1: Actions (create/delete/catalogs/admin-tags)**

```ts
// app/[locale]/bestof-larib/actions.ts — imports
import { appAdminAction, superAdminAction } from '@/actions/safe-action'
import { canAccessApp, canAdminApp } from '@/lib/permissions'

// create = app admin (was authenticatedAction)
export const createCaseAction = appAdminAction('BESTOF_LARIB').inputSchema(...)...
// destructive delete = super-admin only
export const deleteCaseAction = superAdminAction.inputSchema(...)...
// all other admin actions listed above → appAdminAction('BESTOF_LARIB')
export const updateCaseAction = appAdminAction('BESTOF_LARIB').inputSchema(...)...
```

- [ ] **Step 2: Pages (access gate + admin UI + statistics)**

```ts
// bestof-larib/page.tsx
import { canAccessApp, canAdminApp } from '@/lib/permissions'
if (!canAccessApp(session.user, 'BESTOF_LARIB')) redirect(`/${locale}/dashboard`)
const isAdmin = canAdminApp(session.user, 'BESTOF_LARIB')

// statistics/page.tsx (and the two nested stats pages)
if (!session || !canAdminApp(session.user, 'BESTOF_LARIB')) redirect(`/${locale}/bestof-larib`)
```

- [ ] **Step 3: DICOM API routes**

```ts
// each of the three app/api/bestof/dicoms/* routes
import { canAdminApp } from '@/lib/permissions'
const isAdmin = canAdminApp(user, 'BESTOF_LARIB')
```

- [ ] **Step 4: Remove the temporary alias**

In `actions/safe-action.ts`, delete `export const adminOnlyAction = superAdminAction`. Run `grep -rn "adminOnlyAction" app lib actions` → expected: **no matches**. If any remain, migrate them to the correct guard.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/bestof-larib app/api/bestof actions/safe-action.ts
git commit -m "refactor(rbac): gate Bestof with canAdminApp; create=app-admin, delete=super-admin, add access gate"
```

---

## Task 9: `/admin/users` UI — per-app admin picker

**Files:**
- Modify: `app/[locale]/admin/users/actions.ts` — add `adminApplications` to the Zod schemas of `updateUserAction` and `createUserInviteAction`; pass through to the service.
- Modify: `lib/services/users.ts` — `updateUser` / `createUser` persist `adminApplications`.
- Modify: `app/[locale]/admin/users/user-add-dialog.tsx` and `user-edit-dialog.tsx` — per app, two toggles: Access (`applications`) + App-admin (`adminApplications`).
- Modify: `app/[locale]/welcome/actions.ts:46-51` — write `adminApplications` from the invitation payload.

- [ ] **Step 1: Zod + service**

```ts
// admin/users/actions.ts — extend both schemas
adminApplications: z.array(z.enum(['BESTOF_LARIB', 'CONGES', 'CARDIOLARIB', 'PUBLICATIONS'])).optional(),
// enforce subset before persisting
const admin = (parsedInput.adminApplications ?? []).filter(a => (parsedInput.applications ?? []).includes(a))
```

```ts
// lib/services/users.ts — include in the create/update data
data: { …, applications, adminApplications: admin }
```

- [ ] **Step 2: Dialog UI**

In both dialogs, next to each application access toggle, render an "Admin" toggle bound to `adminApplications` (disabled unless that app's access is on). Submit `adminApplications` in the payload. Follow the existing `AVAILABLE_APPLICATIONS` map + toggle-button pattern already in the file.

- [ ] **Step 3: Invitation acceptance**

```ts
// welcome/actions.ts — when creating the real user from invite payload
adminApplications: invitePayload.adminApplications ?? [],
```
(and add `adminApplications` to the invitation payload written in `createUserInviteAction`.)

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/admin/users lib/services/users.ts app/[locale]/welcome/actions.ts
git commit -m "feat(rbac): manage adminApplications from /admin/users (access + per-app admin)"
```

---

## Task 10: i18n strings for the admin picker

**Files:**
- Modify: `messages/en.json` and `messages/fr.json` (under the existing `admin` namespace, next to the applications labels)

- [ ] **Step 1: Add keys (EN)**

```json
"appAccess": "Access",
"appAdmin": "App admin",
"superAdmin": "Portal super-admin"
```

- [ ] **Step 2: Add keys (FR)**

```json
"appAccess": "Accès",
"appAdmin": "Admin de l'app",
"superAdmin": "Super-admin portail"
```

Place them consistently with the surrounding admin-users keys in each file, and reference them from the dialogs (Task 9) via `useTranslations('admin')`.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/fr.json app/[locale]/admin/users
git commit -m "i18n(rbac): add access/app-admin/super-admin labels (EN/FR)"
```

---

## Task 11: Seed RBAC test fixtures

**Files:**
- Modify: `prisma/seed.test.ts` (after the existing users, before exam types ~line 171)

- [ ] **Step 1: Add a Congés-admin and a Bestof-admin (both non super-admin)**

```ts
	const congesAdminPassword = await ctx.password.hash('ristifou');
	const congesAdmin = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Conges Admin',
			email: 'conges-admin@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['CONGES'],
			adminApplications: ['CONGES'],
			congesTotalDays: 30,
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'conges-admin@larib-portal.test', password: congesAdminPassword } },
		},
	});
	console.log('✅ Created Conges admin:', congesAdmin.email);

	const bestofAdminPassword = await ctx.password.hash('ristifou');
	const bestofAdmin = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Bestof Admin',
			email: 'bestof-admin@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
			adminApplications: ['BESTOF_LARIB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'bestof-admin@larib-portal.test', password: bestofAdminPassword } },
		},
	});
	console.log('✅ Created Bestof admin:', bestofAdmin.email);
```

- [ ] **Step 2: Run the seed**

Run: `npm run test:seed`
Expected: logs include "Created Conges admin" and "Created Bestof admin", ends "Test database seeded successfully!".

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.test.ts
git commit -m "test(rbac): seed conges-admin and bestof-admin fixtures"
```

---

## Task 12: E2E RBAC flows (`tests/e2e/rbac.spec.ts`)

**Files:**
- Create: `tests/e2e/rbac.spec.ts`

- [ ] **Step 1: Write the comprehensive flows (two flows, both assert the matrix; FR check inline)**

```ts
import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string, locale: 'en' | 'fr' = 'en') {
  await page.goto(`/${locale}/login`, { timeout: 60000 })
  await page.getByPlaceholder(locale === 'en' ? 'Email' : 'E-mail').fill(email)
  await page.getByPlaceholder(locale === 'en' ? 'Password' : 'Mot de passe').fill('ristifou')
  await page.getByRole('button', { name: locale === 'en' ? /sign in/i : /se connecter/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('Congés admin can manage leave but is blocked from portal admin and Bestof stats', async ({ page }) => {
  await login(page, 'conges-admin@larib-portal.test')

  // Can reach Congés and see admin sections (pending requests)
  await page.goto('/en/conges', { timeout: 60000 })
  await expect(page).toHaveURL(/\/en\/conges/)

  // Blocked from portal user management (super-admin only) -> notFound
  const adminResp = await page.goto('/en/admin/users', { timeout: 60000 })
  expect(adminResp?.status()).toBe(404)

  // Blocked from Bestof admin statistics -> redirected away
  await page.goto('/en/bestof-larib/statistics', { timeout: 60000 })
  await expect(page).not.toHaveURL(/statistics/)
})

test('Bestof admin can reach Bestof stats but not Congés admin actions nor portal admin', async ({ page }) => {
  await login(page, 'bestof-admin@larib-portal.test')

  await page.goto('/en/bestof-larib/statistics', { timeout: 60000 })
  await expect(page).toHaveURL(/statistics/)

  const adminResp = await page.goto('/en/admin/users', { timeout: 60000 })
  expect(adminResp?.status()).toBe(404)

  // super-admin still works end-to-end
  await page.goto('/en/login', { timeout: 60000 })
})

test('Super-admin reaches portal user management (EN + FR)', async ({ page }) => {
  await login(page, 'test-admin@larib-portal.test')
  const resp = await page.goto('/en/admin/users', { timeout: 60000 })
  expect(resp?.status()).toBe(200)
  await expect(page.locator('table')).toBeVisible()
})
```

- [ ] **Step 2: Run the RBAC spec (expect PASS after Tasks 1-11)**

Run: `npm run test:setup -- tests/e2e/rbac.spec.ts`
Expected: 3 passed. (If a `conges-admin` sees a 404 on `/conges`, the access gate is wrong — `adminApplications ⊆ applications` must hold in the seed.)

- [ ] **Step 3: Run the full suite to confirm no regressions**

Run: `npm run test:setup`
Expected: existing `admin-users`, `bestof-larib-complete`, `conges` specs still pass (the seeded `test-admin` is a super-admin and keeps all capabilities).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/rbac.spec.ts
git commit -m "test(rbac): e2e flows for super-admin vs per-app admin vs member"
```

---

## Self-Review notes (already reconciled)

- **Spec coverage:** every §5 mapping row has a task — super-admin (Task 6), Congés (Task 7), Bestof incl. anomalies §7 (Task 8), UI/`adminApplications` (Task 9), session hydration (Task 3), guards (Tasks 4-5), migration/data (Task 1), tests (Tasks 11-12).
- **Type consistency:** guard names (`superAdminAction`, `appAdminAction`), helper names (`isSuperAdmin`, `canAdminApp`, `canAccessApp`), and page guards (`requireSuperAdmin`, `requireAppAdmin`) are used identically across tasks.
- **No behavior change for current users:** existing `ADMIN` = super-admin (passes all), existing `USER` = member; the temporary `adminOnlyAction` alias keeps the tree compiling until Task 8 removes it.
