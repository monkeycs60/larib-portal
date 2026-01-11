# Repository Guidelines

- Use postgres mcp to debug database issues and test new features
- NEVER use prisma migrate reset / do not reset db even if user asks for it

### Prohibited Practices

-  **No useEffect**: Use fetch in server components via services, or handle side effects via event handlers
-  **No TypeScript any or as any**: Always use strong typing (not any or as any) ; if you need custom types, reuse them via @/types/ ; never use ts ignore comments.
-  **No OOP patterns**: Avoid classes or object-oriented approaches
-  **No Bad naming**: Use descriptive names for variables, functions, and components, it has to be explicit. When dealing with map, filter, reduce, etc., use don't use abbreviations for mapped variables (no 'c' for 'case', no 'i' for 'item', etc.)
-  **No Bad comments**: Never use comments to explain the code, it has to be explicit
-  **No more than 5 props**: When a component has more than 5 props, it is a sign that it is too complex and should be refactored (or pass props as a single object).

### Required Practices

-  **Component library**: Use shadcn/ui components exclusively
-  **Generic components**: Create reusable components in `@/components/ui/` when shadcn equivalent doesn't exist
-  **Authentication**:
   -  Protected pages: use `const session = await requireAuth();` (from `lib/auth-guard.ts`) to enforce authentication and auto-redirect to login
   -  Optional auth: use `const session = await getTypedSession();` (from `lib/auth-helpers.ts`) when auth is optional
   -  Server actions: check user auth with `authenticatedAction` (see `actions/safe-action.ts`)
-  **Internationalization**: Implement `next-intl` for French/English translations
   -  Client components: `useTranslations` hook
   -  Server components: **ALWAYS** pass locale explicitly: `const t = await getTranslations({ locale, namespace: 'bestof' });`
   -  Extract locale from params first: `const { locale } = await params;`
-  **Error handling**: Translate all Zod/API errors in both languages
-  **Self-explanatory code**: Avoid unnecessary comments
-  **User feedback (Sonner)**: For mutations (server actions) that change data, trigger a `sonner` toast on success and on error when it improves UX. Use `next-intl` for toast messages.

## Architecture & Code Organization

### Project Structure

-  **Feature-based architecture**: Use feature folders for each app functionality
-  **Services layer**: Write all API/Prisma calls in `lib/services/`
-  **Component splitting**: Refactor components/pages when > 350 lines
-  **Server-first approach**: Fetch data in `page.tsx` (server-side) and prop drill to client components
-  **sub-apps**: As the app is a portal, there are multiple apps (bestof, conges, cardiolarib, etc.) ; each app has its own folder in `app/` and its own `page.tsx` and `layout.tsx` ; each app has its own `lib/` folder with its own services and utils (if logic specific to app). You need to maintain the global navbar and footer for these apps. In the prisma schema, make sure that when you add infos to user, add a column in the user table for this app, so that the user can have different infos for each app and it is easier to manage and maintain.

### Data Management

-  **Prisma types**: Always use types from `schema.prisma`
-  **Server actions**: Use `next-safe-action` for all mutations (and handle side effects (like state updates, revalidation etc.) on onSuccess and onError) 
-  **Links with locale**: Use `applicationLink(locale, path)` from `lib/application-link.ts` to build hrefs that always include the active locale. Prefer the i18n `Link`/`useRouter` from `app/i18n/navigation` and pass `applicationLink(locale, '/some/path')` when constructing manual strings.
-  **Type safety**: Strong typing required (no `any` type)
-  **Global state**: Use Zustand stores in `lib/stores/` for state shared across distant components
-  **Store structure**: Separate state and actions interfaces, use TypeScript strict typing

### React/Next.js Patterns

-  **Server components**: Default choice for data fetching and static content
-  **Client components**: Only when interactivity is required
-  **Form handling**: Use React Hook Form with Zod validation
-  **State management**: Prefer server state over client state when possible
-  **Zustand usage**:
   -  Use for global state shared between distant components
   -  Create domain-specific stores (user, theme, preferences)
   -  Use selectors to optimize re-renders: `const user = useUserStore(state => state.user)`
   -  Include devtools middleware for debugging in development

## Testing & Debugging

### Testing Requirements

-  **Add tests** for any new functionality or bug fix
-  **Run tests** before committing: `npm run test:setup`
-  **Never weaken tests** to make them pass - fix the code instead
-  **Cover edge cases** in addition to happy path scenarios

### Writing E2E Tests

**Philosophy: Quality over quantity**
- Write **1-2 comprehensive test flows** rather than 10 isolated micro-tests
- Each test should cover a **complete user journey**, not just one assertion

**Example of GOOD test structure:**
```typescript
test('complete dashboard workflow', async ({ page }) => {
  // 1. Navigate and verify page loads with critical elements
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();

  // 2. Perform action
  await page.getByRole('button', { name: 'New Project' }).click();

  // 3. Verify results
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Project name')).toBeVisible();
});
```

**Example of BAD test structure (AVOID):**
```typescript
// Too granular - should be grouped
test('dashboard title is visible', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading')).toBeVisible();
});

test('new project button is visible', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
});

test('can click new project button', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'New Project' }).click();
});
// ... 7 more similar tests
```

**Guidelines:**
- Group related assertions in the same test (e.g., verify 3-4 elements in one test, not 3-4 separate tests)
- Test both locales (FR/EN) in the SAME test using a loop or conditional, not 2 separate tests
- Avoid testing trivial variations separately (e.g., different button labels can be tested together)
- Focus on user flows, not individual DOM queries

### Running Tests

```bash
npm run test:setup                                     # Seed DB + run all tests
npm run test:e2e                                       # Run tests only (no seed)
npm run test:e2e tests/e2e/bestof-larib-complete.spec.ts  # Specific file
npm run test:e2e:ui                                    # UI mode with seed
```

### UI Testing

-  **Playwright MCP**: Primary tool for testing and debugging UI
-  **Screenshots**: Take screenshots to identify and correct issues
-  **Test structure**: Tests in `tests/e2e/` organized by feature
-  **Test data**: Seed files in `prisma/seed.test.ts`

### CI/CD

Tests run automatically on push/PR via `.github/workflows/tests.yml`

## Quality Assurance

### Code Review Process

-  **Standards verification**: Ensure all guidelines are followed before commits
-  **Clean codebase**: Maintain high code quality and consistency

## Project Overview

Next.js 15 application with modern stack and strict development standards:

### Technology Stack

-  **Next.js 15.3.3** with App Router and Turbopack
-  **TypeScript** with strict mode enabled
-  **Tailwind CSS v4** for styling
-  **Better Auth** for authentication (email/password and Google OAuth)
-  **Prisma** with PostgreSQL for database
-  **React Hook Form** with Zod for form validation
-  **Playwright** for E2E testing
-  **Shadcn UI** for component library
-  **Next-safe-action** for server actions
-  **Next-intl** for internationalization (French & English)
-  **Zustand** for global state management

---

**Development Principle**: Write clean, type-safe, maintainable code that follows modern React/Next.js patterns while adhering to strict architectural guidelines.
