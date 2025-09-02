## Feature: Admin User Management Sidebar and Panel

- Name: Admin User Management
- What it does: Adds an admin-only sidebar under `/{locale}/admin` with a “User management” item. The User management view lists all users with key information and per-row Edit/Delete actions. Data is fetched server-side, mutations use `next-safe-action` with admin-only guards, and forms use React Hook Form + Zod with bilingual labels.
- How to use:
  - Access `/{locale}/admin/users` (only visible/accessible to `ADMIN` users). A link is also shown from the Dashboard card for admins.
  - View user list with: First name, Last name, Email, Phone number, Role, Country, Birth date, Language (EN/FR), Position, Arrival/Departure dates, Profile photo URL, and Allowed applications.
  - Click “Edit” to update fields in a dialog; click “Delete” to remove a user (self-deletion is prevented).

### Technical Details

- Prisma schema updated to include:
  - `Role` enum: `ADMIN`, `USER` (default `USER`)
  - `Language` enum: `EN`, `FR` (default `EN`; the update action defaults to the current app locale if not provided)
  - `Application` enum: `BESTOF_LARIB`, `CONGES`, `CARDIOLARIB`
  - `User` fields: `firstName`, `lastName`, `phoneNumber`, `role`, `country`, `birthDate`, `language`, `position`, `arrivalDate`, `departureDate`, `profilePhoto`, `applications` (array of `Application`)
- Services: `lib/services/users.ts` for listing, updating, and deleting users.
- Actions: `app/[locale]/admin/users/actions.ts` using `next-safe-action` with `adminOnlyAction` guard.
- UI:
  - `components/ui/sidebar.tsx` generic sidebar component.
  - `components/ui/table.tsx`, `components/ui/select.tsx` generic UI components (shadcn-style) for this feature.
  - `app/[locale]/admin/layout.tsx` with persistent sidebar and admin gate.
  - `app/[locale]/admin/users/page.tsx` server page (server-first fetch) and client table/editor.
  - `UserEditDialog` uses RHF + Zod. Date inputs are native date fields; language defaults to app locale when saving if unset.
- i18n: Added bilingual keys under `admin` namespace in `messages/en.json` and `messages/fr.json`.

### Notes

- Only `ADMIN` users can access `/{locale}/admin/*` routes and actions. Non-admins get a 404 from those routes.
- The Dashboard’s “Users” card now shows a “User management” button for admins linking to the admin panel.
- After saving or deleting, the list refreshes. You can further enhance UX with optimistic updates if desired.
