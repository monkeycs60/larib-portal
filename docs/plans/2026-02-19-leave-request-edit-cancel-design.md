# Leave Request Edit & Cancel Design

## Goal

Allow users to modify or cancel their pending leave requests from the request history table, as long as the request has not been approved or rejected by an admin.

## Decisions

- **Edit**: Dialog with DayPicker + reason field, pre-filled with current values, updates the existing record
- **Delete**: Soft-delete via `CANCELLED` status (record stays in history)
- **UX**: 6th "Actions" column in history table with icon buttons (pencil + trash), visible only for PENDING rows

## Architecture

### Server Actions (actions.ts)

- `cancelLeaveAction(requestId)` — sets status to CANCELLED; validates ownership + PENDING status
- `updateLeaveAction(requestId, startDate, endDate, reason?)` — updates dates/reason; validates ownership + PENDING + all business rules (overlap, past date, contract bounds, insufficient days)

### Services (lib/services/conges/index.ts)

- `cancelLeaveRequest(requestId, userId)` — finds request, checks userId match + PENDING status, updates to CANCELLED
- `updateLeaveRequest(requestId, userId, data, frenchHolidays)` — finds request, checks userId match + PENDING status, runs all validations (same as createLeaveRequest), updates record

### Components

- **New**: `app/[locale]/conges/components/request-history-table.tsx` — client component extracted from page.tsx
  - Renders full history table with 6th Actions column
  - Actions column shows pencil (edit) + trash (cancel) icons for PENDING rows only
  - Trash button opens AlertDialog confirmation
  - Pencil button opens edit Dialog with DayPicker (same style as RequestLeaveDialog) pre-filled with current dates and reason
  - Uses sonner toasts for success/error feedback

### Translations

Add keys under `conges.history`:
- `actions` (column header)
- `edit`, `cancel` (button tooltips)
- `cancelConfirmTitle`, `cancelConfirmDescription`, `cancelConfirm`, `cancelCancel`
- `editTitle`, `editDescription`, `editSubmit`
- `cancelSuccess`, `cancelError`, `editSuccess`, `editError`
