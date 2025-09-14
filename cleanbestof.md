Bestof Larib — Code Cleanup Plan

Scope: app/[locale]/bestof-larib and its subfolders, plus related lib/services used by this feature. Goal is to fix typing issues, clean variable naming, consider shared state via Zustand, and simplify component APIs without changing behavior.

Summary Of Findings
- Unsafe any/as any casts
  - app/[locale]/bestof-larib/[id]/page.tsx:82 — attempts={attempts as any}
  - app/[locale]/bestof-larib/[id]/work-area.tsx:58–63 — onError(err: unknown) cast to any to read serverError/message
  - app/[locale]/bestof-larib/[id]/user-panel.tsx:55–60 — same pattern in hooks onError
  - app/[locale]/bestof-larib/[id]/user-panel.tsx:64 — useRef<any> for a debounce timer
  - app/[locale]/bestof-larib/[id]/user-panel.tsx:153,192 — window as any for __lastAttemptId
  - app/[locale]/bestof-larib/[id]/user-panel.tsx:96–97 — sort uses createdAt as any
- Non-descriptive variables in array helpers
  - app/[locale]/bestof-larib/page.tsx:57 — cases.map((c) => …)
  - app/[locale]/bestof-larib/components/create-case-dialog.tsx:201 — examList.map((e) => …)
  - app/[locale]/bestof-larib/components/create-case-dialog.tsx:230 — diseaseList.map((d) => …)
  - app/[locale]/bestof-larib/[id]/user-panel.tsx:93–101 — filter/sort/map with a,b single letters
  - app/[locale]/bestof-larib/[id]/work-area.tsx:69 — prev, a single-letter in filter; acceptable but can be clearer
- Components with >5 props (prefer object prop or split)
  - CaseInteractionPanel (user-panel.tsx) ~15 props
  - WorkArea (work-area.tsx) 7 props
- Shared state cross-components
  - lastAttemptId communicated via window global; suggests a small shared client store

Principles To Follow (from AGENTS.md)
- No useEffect; handle side effects in event handlers or on server, fetch in server components
- No any / as any; strong typing via Prisma types and local types in @/types
- No OOP; prefer functions and hooks
- Clear names for map/filter/reduce variables
- Max 5 props; otherwise refactor to object prop or split components
- Use shadcn/ui components
- Use next-intl for i18n and translate error messages
- Use next-safe-action for mutations and sonner for feedback
- Services in lib/services; reuse Prisma types
- Zustand for shared state across distant components

Remediation Plan (Safe, Incremental)
1) Types: remove any/as any
   - Define AttemptSummary type once and reuse.
   - Replace attempts as any with the proper AttemptSummary[] type in WorkArea prop and page.
   - Introduce a typed helper for safeAction error messages to avoid err as any.
   - Replace useRef<any> with useRef<number | null> for browser timers.
   - Remove createdAt as any by normalizing date comparisons.

2) Naming: improve variable names in array helpers
   - Replace single-letter variables with descriptive ones (caseItem, tagOption, examTypeOption, diseaseTagOption, attempt, previousItems, firstIndex, etc.).

3) Props: reduce prop counts
   - CaseInteractionPanel: pass a single prop object combining current settings and callbacks, or split component:
     - AttemptsList (attempts, onSelectAttempt, startNew)
     - PersonalSettings (tags, comments, difficulty, save)
   - WorkArea: group inputs into a config object: { meta, defaults, rightPane, attempts } to keep <=5 top-level props.

4) Shared state via Zustand
   - Create lib/stores/bestof-attempts.ts with:
     - state: lastAttemptIdByCase: Record<string, string | undefined>
     - actions: setLastAttemptId(caseId, attemptId)
   - Use store instead of window.__lastAttemptId to coordinate AnalysisForm, CaseInteractionPanel, and WorkArea.

5) Keep server-first and services layer
   - Data fetching already in server pages via services; keep as-is.
   - Ensure all new/updated types reuse Prisma payloads where possible.

6) i18n and errors
   - Keep using next-intl for UI text; map service/action error codes to localized messages where applicable.
   - Use safeAction onError with typed error extraction helper.

7) Tests/E2E sanity
   - Add Playwright flows for: create/edit/delete case (admin), user attempts save/validate, tag management assign/unassign.
   - Screenshot key views to ensure UI unchanged.

Detailed Changes (File-by-File)

app/[locale]/bestof-larib/[id]/page.tsx
- Replace attempts as any by importing AttemptSummary from services and typing WorkArea accordingly.
- Ensure createdAt stays Date or string consistent; WorkArea will handle union.

app/[locale]/bestof-larib/[id]/work-area.tsx
- Define a local AttemptSummary type via import from lib/services/bestof-larib-attempts (CaseAttemptSummary).
- Update props: attempts: CaseAttemptSummary[].
- Error handling: add getActionErrorMessage helper; change onError signatures to onError({ error }).
- Date sort/update: add getTime util: const getTime = (d: string | Date) => new Date(d).getTime(). Avoid any.
- Naming: rename prev -> previousAttempts; a -> attemptItem; att -> selectedAttempt.
- Prop refactor (follow-up PR): group input props into a single config object to keep <= 5.

app/[locale]/bestof-larib/[id]/user-panel.tsx
- Typing: change saveTimerRef to useRef<number | null>(null) (DOM environment).
- Error handling: use onError({ error }) and normalize messages with helper.
- Naming: replace a/b in filter/sort/map by attempt/previousAttempt.
- Remove window as any for __lastAttemptId; use Zustand store bestofAttemptStore.setLastAttemptId(caseId, id) and read from store when validating.
- Consider splitting component into AttemptsList and PersonalSettings to reduce props to <=5 per component; parent wires them.

app/[locale]/bestof-larib/page.tsx
- Naming: cases.map((caseItem) => …).

app/[locale]/bestof-larib/components/create-case-dialog.tsx
- Naming: examList.map((examTypeOption) …), diseaseList.map((diseaseTagOption) …).

app/[locale]/bestof-larib/components/tag-manager-dialog.tsx
- Keep existing map names (tag) fine; ensure any new helpers stay descriptive.
- Optional: replace inline Array.isArray casts with typed actions return where feasible.

lib/services/bestof-larib-attempts.ts
- Reuse exported CaseAttemptSummary as the single source of truth for attempts typing in the feature.
- No functional changes needed.

Types And Utilities To Introduce
- @/types/bestof.ts
  - export type AttemptSummary = import('@/lib/services/bestof-larib-attempts').CaseAttemptSummary
  - export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
- @/lib/ui/safe-action-error.ts
  - export function getActionErrorMessage(error: unknown, fallback: string): string { try { const e = error as { serverError?: unknown, message?: unknown }; return typeof e?.serverError === 'string' ? e.serverError : typeof e?.message === 'string' ? e.message : fallback } catch { return fallback } }

Zustand Store Proposal
- File: lib/stores/bestof-attempts.ts
- Shape:
  - interface BestofAttemptState { lastAttemptIdByCase: Record<string, string | undefined> }
  - interface BestofAttemptActions { setLastAttemptId: (caseId: string, id: string) => void; getLastAttemptId: (caseId: string) => string | undefined }
  - export const useBestofAttemptStore = create<BestofAttemptState & BestofAttemptActions>()((set, get) => ({ lastAttemptIdByCase: {}, setLastAttemptId: (caseId, id) => set((s) => ({ lastAttemptIdByCase: { ...s.lastAttemptIdByCase, [caseId]: id } })), getLastAttemptId: (caseId) => get().lastAttemptIdByCase[caseId] }))
- Usage:
  - AnalysisForm on success: useBestofAttemptStore.getState().setLastAttemptId(caseId, res.data.attemptId)
  - CaseInteractionPanel validate: const id = lastAttemptId ?? useBestofAttemptStore.getState().getLastAttemptId(caseId)

Prop Refactor Sketches
- WorkArea props before: (caseId, isAdmin, createdAt, defaultTags, prefill, right, attempts)
- After: WorkArea({ meta: { caseId, isAdmin, createdAt }, defaults: { tags: defaultTags, prefill }, attempts, rightPane: right })
- CaseInteractionPanel split:
  - AttemptsList({ attempts, onSelectAttempt, onStartNewAttempt, isAdmin })
  - PersonalSettings({ caseId, defaultTags, tags, onTagsChange, comments, onCommentsChange, difficulty, onDifficultyChange, isAdmin })

Naming Conventions (apply consistently)
- caseItem, clinicalCase instead of c
- examTypeOption instead of e
- diseaseTagOption instead of d
- attempt, selectedAttempt instead of a/att
- previousAttempts instead of prev

Acceptance Criteria
- No any/as any in bestof-larib feature.
- Array helper variables are descriptive across the feature.
- No use of window as any; shared state via a small Zustand store where needed.
- Components with >5 inputs receive either a single config prop or are split; no API changes leaked to routes.
- No behavior/UI regressions (verified by Playwright flows and screenshots).

Validation Strategy
- Static: Type-check (tsc) passes with no any/as any, strict mode clean in affected files.
- Runtime: Use Playwright MCP with provided credentials to exercise:
  - Admin: create, edit, delete a case; manage admin tags.
  - User: open case, save analysis/report draft, validate attempt; assign user tags.
  - Confirm attempts list updates and toasts appear; take screenshots.

Rollout Plan
- PR 1: Types and naming only (safe changes), add helper utils; no UI/behavior change.
- PR 2: Introduce Zustand store and remove window global; adapt two call sites.
- PR 3: Prop refactor (object props) or component split; minimal surface change, with targeted updates.
- Each PR: run Playwright flows for regression, update CHANGELOG.md with a “Bestof Larib – Code Quality” entry.

Notes
- No useEffect introduced; all saves remain in event handlers.
- Services already centralized; keep Prisma type reuse.
- UI components remain shadcn/ui.

