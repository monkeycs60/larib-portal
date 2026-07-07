# Adding a new sub-app to Larib Portal

A practical, battle-tested checklist for wiring a **new portal sub-app** (a new value of `enum Application`, e.g. `BESTOF_LARIB`, `CONGES`, `PUBLICATIONS`). Every step below was exercised end-to-end when adding `PUBLICATIONS`; follow it in order.

Throughout, replace `NEW_APP` with your UPPERCASE_SNAKE enum value and `new-app` with the kebab route segment (e.g. `PUBLICATIONS` / `publications`).

> **Golden rules (from `CLAUDE.md`)**
> - **Never** run `prisma migrate reset` / never reset the DB.
> - No `useEffect`, no `any`/`as any`/`ts-ignore`, no OOP/classes, descriptive names, ≤5 props (or one object prop), files < 350 lines.
> - shadcn/ui only. Services in `lib/services/`. Mutations via `next-safe-action`. i18n FR **and** EN via next-intl. Sonner toasts on mutations.
> - Server-first: fetch in `page.tsx`, prop-drill to client components.

---

## 0. The source of truth: `enum Application`

Everything flows from one enum in `prisma/schema.prisma`:

```prisma
enum Application {
  BESTOF_LARIB
  CONGES
  CARDIOLARIB
  NEW_APP        // <-- add here, then `prisma generate`
}
```

Adding a value widens the generated `Application` TS type (`@/app/generated/prisma`). This **auto-propagates** into `lib/permissions.ts`, `actions/safe-action.ts`, `types/session.ts` — those files need **no change**. But it also **breaks `tsc`** everywhere a `Record<Application, …>` is used, and you must extend every hard-coded string-literal list (see §2). Do the enum change and all literal fixes in the **same commit** so `tsc` ends green.

---

## 1. Data model + migration

1. In `prisma/schema.prisma`: add `NEW_APP` to `enum Application`, plus any app-specific models/enums. Conventions:
   - `id String @id @default(cuid())` for new models (newer style; older Bestof models use app-supplied `randomUUID()`).
   - `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, explicit `@@map("PascalCase")`.
   - FKs to the creator `User` use `onDelete: Restrict`; child rows use `onDelete: Cascade`; optional links use `onDelete: SetNull`.
   - Per-app user columns live **on `User`** (e.g. `publicationsEmailOptOut Boolean @default(false)`) with inverse relations. Named relations when a model references `User` twice.
2. Create + apply the migration (this also regenerates the client):
   ```bash
   npx prisma migrate dev --name add_new_app
   npx prisma generate    # explicit, in case the above skips it
   ```
   Adding an enum value emits `ALTER TYPE "Application" ADD VALUE 'NEW_APP';` — that's fine (DDL only, no "unsafe enum" issue as long as you don't INSERT the value in the same migration).
3. **Apply to the test DB too** (see §11 — two databases). Migrations you run locally hit `neondb` (dev); `testdb` needs `migrate deploy` with `.env.test`.

Verify: `npx tsc --noEmit` (green — new models are unused yet).

---

## 2. Wire the `NEW_APP` string literal everywhere (keep `tsc` green)

`grep -rn "'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'\|z.enum(\[\"BESTOF_LARIB\"" app lib actions` to find them all. As of writing, the touch-points are:

| File | What to change |
|---|---|
| `app/[locale]/admin/users/actions.ts` | Every `z.enum([...])` app array **and** every `as Array<'…'>` cast → add `NEW_APP` |
| `app/[locale]/admin/users/user-add-dialog.tsx` | `AVAILABLE_APPLICATIONS`, `APP_DOT` (add a hex color), both form `z.enum([...])` |
| `app/[locale]/admin/users/user-edit-dialog.tsx` | `AVAILABLE_APPLICATIONS`, `APP_DOT`, both `FormSchema` `z.enum([...])` |
| `app/[locale]/admin/users/user-table.tsx` | `APP_DOT` (badge color) |
| `app/[locale]/profile/profile-editor.tsx` | schema `z.enum([...])` **and** `APP_DOT` (typed `Record<Application, …>` → **this one breaks `tsc` until fixed**) |
| `app/[locale]/profile/page.tsx` | the `as [...]` cast |
| `actions/profile.ts` | schema `z.enum([...])` |
| `app/[locale]/create-admin/actions.ts` | bootstrap admin's `applications: [...]` array |
| `lib/services/users.ts`, `lib/services/invitations.ts` | `Array<'…'>` union type annotations |
| `app/[locale]/components/app-sidebar.tsx` | `SidebarUser.applications` / `.adminApplications` union types |
| `app/[locale]/components/navbar-client.tsx` | the two union types |
| `app/[locale]/dashboard/page.tsx` | unions + `appOrder`/`appSlug`/`getAppIcon` (see §4) |

> **Easy to miss:** the `SidebarUser` type in `app-sidebar.tsx` and the unions in `navbar-client.tsx`. If `tsc` complains that a full `User` (`Application[]`) is not assignable to a narrow union, that's these.

`AVAILABLE_APPLICATIONS` in the add/edit dialogs is the **grantable list** shown in `/admin/users` — `NEW_APP` must be there for admins to grant access/admin.

Verify: `npx tsc --noEmit` (green).

---

## 3. RBAC — nothing to write

The per-app permission system already handles any `Application` value. **Do not** edit `lib/permissions.ts` or `actions/safe-action.ts`. Just use them:
- Page access gate: `canAccessApp(session.user, 'NEW_APP')` (true for super-admin, app users, or app-admins).
- Admin gate: `canAdminApp(session.user, 'NEW_APP')` (true for super-admin or `adminApplications ∋ NEW_APP`).
- Server-action guards: `appAdminAction('NEW_APP')` for admin mutations; `authenticatedAction` for member reads/edits (add a business check inside for "admin OR owner" rules).
- `getTypedSession()` already hydrates `applications` + `adminApplications` onto `session.user`.

---

## 4. Dashboard card — `app/[locale]/dashboard/page.tsx`

Extend the three structures (they're narrow string-literal unions, not the enum):

```tsx
const allApps = accessibleApplications(session.user) as Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB' | 'NEW_APP'>
const appOrder: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB' | 'NEW_APP'> = ['BESTOF_LARIB', 'CONGES', 'NEW_APP', 'CARDIOLARIB']
// appSlug: add `: app === 'NEW_APP' ? '/new-app'`
// getAppIcon: add `case 'NEW_APP': return (<svg viewBox="0 0 48 48" …/>)` (48×48, stroke=currentColor, className="w-full h-full")
```

Note the filter excludes only `CARDIOLARIB` (`app !== 'CARDIOLARIB'`), so a new app shows automatically once it's in the unions/order/slug/icon. Card **visibility** = `accessibleApplications(user)` = `applications ∪ adminApplications`. **Super-admins do NOT auto-see every card** — a card only shows if the app is in the user's own arrays. Grant it via `/admin/users` (or a script) to see it.

---

## 5. Sidebar + account nav

**`app/[locale]/components/app-sidebar.tsx`** — import a `lucide-react` icon, then add to **both** lists:

```tsx
// Applications section
if (accessible.includes('NEW_APP')) {
  applicationItems.push({ href: '/new-app', label: tAdmin('app_NEW_APP'), icon: SomeIcon })
}
// Administration section (with the shield badge)
if (accessible.includes('NEW_APP') && canAdminApp(user, 'NEW_APP')) {
  adminItems.push({ href: '/new-app/admin', label: tAdmin('app_NEW_APP'), icon: SomeIcon, adminBadge: true })
}
```

**`app/[locale]/components/navbar-client.tsx`** — extend the slug ternary so `NEW_APP → '/new-app'` (don't let it fall through to the default).

`href` is a plain locale-less string; the i18n `Link` from `@/app/i18n/navigation` injects the active locale.

---

## 6. i18n — `messages/en.json` **and** `messages/fr.json`

- `admin` namespace: `"app_NEW_APP": "New App"` (used by dashboard card title, sidebar, navbar, admin pickers).
- `dashboard` namespace: `"appDesc_NEW_APP": "…"` (card description).
- New top-level namespace `"new_app": { "title": …, "subtitle": …, … }` for the app's own pages (mirror the `conges` block).

Server components: `getTranslations({ locale, namespace: 'new_app' })` (always pass `locale`). Client components: `useTranslations('new_app')`.

Verify JSON parses: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('ok')"`.

---

## 7. Routes — `app/[locale]/new-app/`

No `layout.tsx` (inherits the global `AppShell`). Re-check access in **every** `page.tsx`.

**`page.tsx`** (member landing):
```tsx
const { locale } = await params
const session = await requireAuth()
if (!canAccessApp(session.user, 'NEW_APP')) {
  redirect(applicationLink(locale, '/dashboard'))
}
const t = await getTranslations({ locale, namespace: 'new_app' })
```

**`admin/page.tsx`** (admin landing — the dashboard "Admin" button and sidebar admin entry link to `/new-app/admin`):
```tsx
if (!canAdminApp(session.user, 'NEW_APP')) {
  redirect(applicationLink(locale, '/new-app'))
}
```

---

## 8. Server actions — `app/[locale]/new-app/actions.ts`

```tsx
'use server'
import { authenticatedAction, appAdminAction } from '@/actions/safe-action'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function revalidateNewApp() {
  await Promise.all([revalidatePath('/en/new-app'), revalidatePath('/fr/new-app')])
}

export const createThingAction = appAdminAction('NEW_APP')
  .inputSchema(z.object({ /* … */ }))          // NOTE: `.inputSchema`, not `.schema`
  .action(async ({ parsedInput, ctx }) => {     // ctx = { userId, user, session }
    // … call a service …
    await revalidateNewApp()
    return { success: true }
  })
```

Revalidate **both** locale paths (or use `revalidateTag`). Handle side-effects (toasts, `router.refresh()`) client-side via `useAction`'s `onSuccess`/`onError`.

---

## 9. Services — `lib/services/new-app/*.ts`

- `import { prisma } from '@/lib/prisma'`; `import { Prisma } from '@/app/generated/prisma'`.
- Async functions (no classes). Explicit `select`. Return types via `Prisma.XGetPayload<{ select: … }>`.
- Reads: wrap in `unstable_cache(fn, [key], { tags })`; declare module-level cache tag consts. `revalidateTag` is called in **actions**, not services.

---

## 10. Forms & UI (important repo specifics)

- **There is NO shadcn `Form`/`FormField` abstraction** (`components/ui/form.tsx` doesn't exist). Use **raw React Hook Form**: `useForm({ resolver: zodResolver(schema) })`, `register`, `Controller`, `handleSubmit`, `z.input<typeof Schema>` for the values type.
- Call server actions with `useAction` from `next-safe-action/hooks`; toast with `toast.success/error` from `sonner` (the `<Toaster>` is already global in `app/[locale]/layout.tsx`).
- Reuse `PageHeader` from `@/app/[locale]/components/page-header` (`title`, optional `subtitle`).
- Primitives in `components/ui/`: `dialog`, `input`, `textarea`, `select` (native wrapper), `single-select`, `multiselect`, `command`+`popover` (combobox), `table` (hand-built, no TanStack), `tag-input`, `checkbox`, `switch`, `badge`, `card`, `tabs`, `file-upload`, `rich-text-editor`, …

---

## 11. Two databases, seed & granting access

- `.env` → `neondb` (**dev**, port-3000 server). `.env.test` → `testdb` (**tests**).
- `prisma migrate dev` hits **neondb only**. Apply to testdb explicitly:
  ```bash
  node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"
  ```
- **Seed** (`prisma/seed.test.ts`, writes testdb, `override:true`): add your app's users + sample data, and add your new tables to the FK-safe **cleanup** block **before** `prisma.user.deleteMany()` (children first — `Restrict` FKs to `User` must be deleted before users). Run `npm run test:seed`.
- **To see/test the app**, the logged-in account needs `NEW_APP` in `applications` (member) and/or `adminApplications` (admin) — grant via `/admin/users`, or a one-off Prisma script. Super-admins are **not** auto-granted for card visibility.

---

## 12. Tests — `tests/e2e/new-app.spec.ts`

Mirror `tests/e2e/rbac.spec.ts` / `publications.spec.ts`: a local `login(page, email)` helper (seeded user, password `ristifou`), assert the app URL is reachable, assert `/en/admin/users` returns 404 for non-super-admins, and check a member is redirected when lacking access. Test **FR + EN in the same test** (URL prefix `/en/…` vs `/fr/…`). Run:
```bash
npm run test:seed && npx playwright test tests/e2e/new-app.spec.ts
```

> **Gotcha — Playwright reuses port 3000.** `reuseExistingServer` reuses a dev server already on 3000 (which may point at `neondb`, where seeded test users don't exist). Either free port 3000 so Playwright starts its own `.env.test`-backed server, or run a dedicated testdb server on another port and point a temp config at it. Running a **second** `next dev` that shares `.next` can yield a cold `PageNotFoundError` for a new route — warm the route (`curl`) then rerun.

---

## Final checklist

- [ ] `enum Application` + models + migration (dev **and** testdb); never `migrate reset`.
- [ ] All string-literal touch-points updated (§2); `npx tsc --noEmit` green.
- [ ] i18n keys in **both** `en.json` and `fr.json`; JSON parses.
- [ ] Dashboard card (unions, `appOrder`, `appSlug`, `getAppIcon`).
- [ ] Sidebar (member + admin-badge entries) and navbar slug.
- [ ] `page.tsx` (gated `canAccessApp`) + `admin/page.tsx` (gated `canAdminApp`) + `actions.ts` + `lib/services/new-app/*`.
- [ ] Seed users/data + FK-safe cleanup; `npm run test:seed`.
- [ ] E2E spec passes (FR/EN, access gating).
- [ ] Grant the test account `NEW_APP` so the card/pages are visible.
