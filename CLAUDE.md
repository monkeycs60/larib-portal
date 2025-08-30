# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

-  Always run `laser-lewis` agent after writing code
-  Always run `playwright` agent after writing code

## Development Standards

### Prohibited Practices

-  **No useEffect**: Use fetch in server components via services, or handle side effects via event handlers
-  **No TypeScript any**: Always use strong typing (not any or as any) ; if you need custom types, reuse them via @/types/
-  **No OOP patterns**: Avoid classes or object-oriented approaches

### Required Practices

-  **Component library**: Use shadcn/ui components exclusively
-  **Generic components**: Create reusable components in `@/components/ui/` when shadcn equivalent doesn't exist
-  **Authentication**: use `const session = await getTypedSession();` (see lib/auth-helpers.ts) to check auth and redirect if needed ; check user auth in actions with `authenticatedAction` (see lib/actions/safe-action.ts)
-  **Internationalization**: Implement `next-intl` for French/English translations
   -  Client components: `useTranslations` hook
   -  Server components: `getTranslations` function
-  **Error handling**: Translate all Zod/API errors in both languages
-  **Self-explanatory code**: Avoid unnecessary comments

## Architecture & Code Organization

### Project Structure

-  **Feature-based architecture**: Use feature folders for each app functionality
-  **Services layer**: Write all API/Prisma calls in `lib/services/`
-  **Component splitting**: Refactor components/pages when > 350 lines
-  **Server-first approach**: Fetch data in `page.tsx` (server-side) and prop drill to client components

### Data Management

-  **Prisma types**: Always use types from `schema.prisma`
-  **Server actions**: Use `next-safe-action` for all mutations
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

### UI Testing & Analysis

-  **Playwright MCP**: Primary tool for testing and debugging UI
-  **Screenshots**: Take screenshots as feedback to identify and correct issues
-  **E2E testing**: Use Playwright for comprehensive testing

## Quality Assurance

### Code Review Process

-  **Automated checking**: Always run `laser-lewis` agent after writing code
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
