# Leave Request Edit & Cancel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to modify or cancel their pending leave requests from the request history table.

**Architecture:** Add `cancelLeaveRequest` and `updateLeaveRequest` service functions with ownership + PENDING status checks. Wire them through `next-safe-action` server actions. Extract the history table from `page.tsx` into a new client component `request-history-table.tsx` with an Actions column showing edit/cancel buttons for PENDING rows only.

**Tech Stack:** Next.js 15, Prisma, next-safe-action, react-day-picker, shadcn/ui (AlertDialog, Dialog, Tooltip, Button), next-intl, sonner

---

### Task 1: Add translations for edit/cancel actions

**Files:**
- Modify: `messages/en.json` — add keys under `conges.history`
- Modify: `messages/fr.json` — add keys under `conges.history`

**Step 1: Add English translations**

In `messages/en.json`, inside the `conges.history` object, add:

```json
"actions": "Actions",
"edit": "Edit",
"cancel": "Cancel",
"cancelConfirmTitle": "Cancel leave request",
"cancelConfirmDescription": "Are you sure you want to cancel this leave request? This action cannot be undone.",
"cancelConfirm": "Yes, cancel",
"cancelCancel": "Go back",
"cancelSuccess": "Leave request cancelled",
"cancelError": "Could not cancel the request",
"editTitle": "Edit leave request",
"editDescription": "Modify the dates or reason for your leave request.",
"editSubmit": "Save changes",
"editSuccess": "Leave request updated",
"editError": "Could not update the request"
```

**Step 2: Add French translations**

In `messages/fr.json`, inside the `conges.history` object, add:

```json
"actions": "Actions",
"edit": "Modifier",
"cancel": "Annuler",
"cancelConfirmTitle": "Annuler la demande de congé",
"cancelConfirmDescription": "Voulez-vous vraiment annuler cette demande de congé ? Cette action est irréversible.",
"cancelConfirm": "Oui, annuler",
"cancelCancel": "Retour",
"cancelSuccess": "Demande de congé annulée",
"cancelError": "Impossible d'annuler la demande",
"editTitle": "Modifier la demande de congé",
"editDescription": "Modifiez les dates ou le motif de votre demande.",
"editSubmit": "Enregistrer",
"editSuccess": "Demande de congé mise à jour",
"editError": "Impossible de modifier la demande"
```

**Step 3: Commit**

```bash
git add messages/en.json messages/fr.json
git commit -m "feat(conges): add translations for leave request edit/cancel"
```

---

### Task 2: Add service functions `cancelLeaveRequest` and `updateLeaveRequest`

**Files:**
- Modify: `lib/services/conges/index.ts` — add two new exported functions after `updateLeaveStatus` (line 601)

**Step 1: Add `cancelLeaveRequest` function**

After the `updateLeaveStatus` function (line 601), add:

```typescript
export async function cancelLeaveRequest(
  requestId: string,
  userId: string
): Promise<void> {
  const request = await prisma.leaveRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { userId: true, status: true },
  })

  if (request.userId !== userId) {
    throw new Error('forbidden')
  }

  if (request.status !== 'PENDING') {
    throw new Error('notPending')
  }

  await prisma.leaveRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  })
}
```

**Step 2: Add `updateLeaveRequest` function**

After `cancelLeaveRequest`, add:

```typescript
export async function updateLeaveRequest(
  input: {
    requestId: string
    userId: string
    startDate: Date
    endDate: Date
    reason?: string | null
  },
  frenchHolidays: Record<string, string>
): Promise<void> {
  const request = await prisma.leaveRequest.findUniqueOrThrow({
    where: { id: input.requestId },
    select: { userId: true, status: true },
  })

  if (request.userId !== input.userId) {
    throw new Error('forbidden')
  }

  if (request.status !== 'PENDING') {
    throw new Error('notPending')
  }

  const { start, end } = normaliseRange(input.startDate, input.endDate)

  const today = startOfDay(new Date())
  if (start < today) {
    throw new Error('pastDate')
  }

  const existingRequests = await prisma.leaveRequest.findMany({
    where: {
      userId: input.userId,
      status: { in: ['PENDING', 'APPROVED'] },
      id: { not: input.requestId },
    },
    select: {
      startDate: true,
      endDate: true,
      status: true,
    },
  })

  const overlapping = existingRequests.some((existing) => {
    const existingStart = startOfDay(existing.startDate)
    const existingEnd = endOfDay(existing.endDate)
    return existingStart <= end && existingEnd >= start
  })

  if (overlapping) {
    throw new Error('leaveOverlap')
  }

  const requestedDays = countWorkingDays(start, end, frenchHolidays)

  const approvedDays = existingRequests
    .filter((existing) => existing.status === 'APPROVED')
    .reduce((total, existing) => total + countWorkingDays(existing.startDate, existing.endDate, frenchHolidays), 0)

  const pendingDays = existingRequests
    .filter((existing) => existing.status === 'PENDING')
    .reduce((total, existing) => total + countWorkingDays(existing.startDate, existing.endDate, frenchHolidays), 0)

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { congesTotalDays: true },
  })

  const totalAllocationDays = user.congesTotalDays ?? 0
  const availableAfterPending = Math.max(totalAllocationDays - approvedDays - pendingDays, 0)

  if (requestedDays > availableAfterPending) {
    throw new Error('insufficientDays')
  }

  await prisma.leaveRequest.update({
    where: { id: input.requestId },
    data: {
      startDate: start,
      endDate: end,
      reason: input.reason?.trim() || null,
    },
  })
}
```

Key difference from `createLeaveRequest`: the overlap check excludes the current request (`id: { not: input.requestId }`), and the days calculation also excludes the current request's pending days.

**Step 3: Commit**

```bash
git add lib/services/conges/index.ts
git commit -m "feat(conges): add cancelLeaveRequest and updateLeaveRequest services"
```

---

### Task 3: Add server actions `cancelLeaveAction` and `updateLeaveAction`

**Files:**
- Modify: `app/[locale]/conges/actions.ts` — add two new exported actions

**Step 1: Update imports**

Add `cancelLeaveRequest` and `updateLeaveRequest` to the import from `@/lib/services/conges`:

```typescript
import {
  createLeaveRequest,
  updateLeaveAllocation,
  updateLeaveStatus,
  cancelLeaveRequest,
  updateLeaveRequest,
  fetchFrenchHolidays,
} from '@/lib/services/conges'
```

**Step 2: Add `cancelLeaveAction`**

After the `updateLeaveAllocationAction` (line 88), add:

```typescript
const cancelLeaveSchema = z.object({
  requestId: z.string().min(1),
})

export const cancelLeaveAction = authenticatedAction
  .inputSchema(cancelLeaveSchema)
  .action(async ({ parsedInput, ctx }) => {
    await cancelLeaveRequest(parsedInput.requestId, ctx.userId)
    await revalidateConges()
    return { success: true }
  })
```

**Step 3: Add `updateLeaveAction`**

After `cancelLeaveAction`, add:

```typescript
const updateLeaveSchema = z
  .object({
    requestId: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    reason: z.string().max(500).optional().nullable(),
  })
  .refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
    message: 'invalidRange',
    path: ['endDate'],
  })

export const updateLeaveAction = authenticatedAction
  .inputSchema(updateLeaveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const frenchHolidays = await fetchFrenchHolidays()
    await updateLeaveRequest(
      {
        requestId: parsedInput.requestId,
        userId: ctx.userId,
        startDate: new Date(parsedInput.startDate),
        endDate: new Date(parsedInput.endDate),
        reason: parsedInput.reason ?? null,
      },
      frenchHolidays
    )
    await revalidateConges()
    return { success: true }
  })
```

**Step 4: Commit**

```bash
git add app/[locale]/conges/actions.ts
git commit -m "feat(conges): add cancelLeaveAction and updateLeaveAction server actions"
```

---

### Task 4: Create `RequestHistoryTable` client component

**Files:**
- Create: `app/[locale]/conges/components/request-history-table.tsx`

This is the largest task. The component:
1. Renders the existing history table with a 6th "Actions" column
2. PENDING rows show edit (pencil) and cancel (trash) icon buttons
3. Trash button opens an `AlertDialog` confirmation, then calls `cancelLeaveAction`
4. Pencil button opens an edit `Dialog` with `DayPicker` (reusing the same style/classNames as `RequestLeaveDialog`) pre-filled with current dates and reason, then calls `updateLeaveAction`
5. Uses sonner toasts for feedback

**Props type** (passed from page.tsx):

```typescript
type RequestHistoryTableProps = {
  history: Array<{
    id: string
    startDate: string
    endDate: string
    dayCount: number
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
    reason: string | null
    decisionAt: string | null
    approverName: string | null
  }>
  translations: {
    columns: {
      period: string
      days: string
      status: string
      reason: string
      decision: string
      actions: string
    }
    status: {
      PENDING: string
      APPROVED: string
      REJECTED: string
      CANCELLED: string
    }
    dayCount: string
    empty: string
    edit: string
    cancel: string
    cancelConfirmTitle: string
    cancelConfirmDescription: string
    cancelConfirm: string
    cancelCancel: string
    editTitle: string
    editDescription: string
    editSubmit: string
    cancelSuccess: string
    cancelError: string
    editSuccess: string
    editError: string
    // Shared with RequestLeaveDialog for the edit form
    startLabel: string
    endLabel: string
    reasonLabel: string
    optionalHint: string
    cancelButton: string
    overlapError: string
    invalidRange: string
    missingRange: string
    insufficientDays: string
    pastDate: string
    outsideContract: string
    requestedDays: string
    currentRemaining: string
    afterRequest: string
    excludedDays: string
    weekendDays: string
    holidays: string
    holiday: string
    day: string
    days: string
    holidayLegend: string
  }
  statusBadgeVariant: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'>
  userContext: {
    remainingDays: number
    arrivalDate: string | null
    departureDate: string | null
    locale: 'fr' | 'en'
    frenchHolidays: Record<string, string>
  }
}
```

**Step 1: Create the component file**

Create `app/[locale]/conges/components/request-history-table.tsx` with the full implementation. The component includes:
- The table rendering (moved from page.tsx lines 327-368)
- A 6th Actions column header
- For each PENDING row: pencil and trash Tooltip+Button icons
- `CancelLeaveDialog` inline: an `AlertDialog` controlled by state `cancelTargetId`
- `EditLeaveDialog` inline: a `Dialog` controlled by state `editTarget` containing DayPicker + reason Textarea, same DayPicker classNames as `RequestLeaveDialog`
- Both dialogs use `useAction` from `next-safe-action/hooks`
- Sonner toasts on success/error

The DayPicker in the edit dialog reuses the exact same `classNames`, `components`, and `modifiers` config as `RequestLeaveDialog` (copy the pattern, not import — these are className strings, not shared config).

**Step 2: Commit**

```bash
git add app/[locale]/conges/components/request-history-table.tsx
git commit -m "feat(conges): create RequestHistoryTable client component with edit/cancel"
```

---

### Task 5: Wire `RequestHistoryTable` into `page.tsx`

**Files:**
- Modify: `app/[locale]/conges/page.tsx` — replace inline history table with new component

**Step 1: Add import**

Add at the top of imports:

```typescript
import { RequestHistoryTable } from './components/request-history-table'
```

**Step 2: Build translations object for the history table**

After the existing `statusLabels` block (around line 121), add a `historyTranslations` object that maps all the keys the component needs — including the new edit/cancel keys and the shared request form keys.

**Step 3: Replace `historySection`**

Replace the inline `historySection` (lines 317-373) with:

```tsx
const historySection = (
  <section className='px-6'>
    <Card>
      <CardHeader>
        <CardTitle>{t('history.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <RequestHistoryTable
          history={userDashboard.history}
          translations={historyTranslations}
          statusBadgeVariant={statusBadgeVariant}
          userContext={userLeaveContext}
        />
      </CardContent>
    </Card>
  </section>
)
```

Remove the now-unused `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` imports if they are no longer used elsewhere in the file.

**Step 4: Commit**

```bash
git add app/[locale]/conges/page.tsx
git commit -m "feat(conges): wire RequestHistoryTable into conges page"
```

---

### Task 6: Manual testing & visual verification

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Verify in browser**

1. Log in as a regular user (not admin)
2. Navigate to `/fr/conges` and `/en/conges`
3. Verify the history table shows the Actions column
4. For PENDING requests: verify pencil and trash icons appear
5. For APPROVED/REJECTED/CANCELLED requests: verify no action buttons
6. Click trash → verify AlertDialog appears with correct text
7. Confirm cancel → verify toast + row updates to CANCELLED status
8. Click pencil → verify edit Dialog opens with dates and reason pre-filled
9. Modify dates → verify day calculation updates
10. Submit → verify toast + row updates with new dates

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(conges): polish edit/cancel leave request UI"
```
