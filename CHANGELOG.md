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

## Feature: Admin Invite User + Welcome Email + Positions

- Name: Admin User Invitations
- What it does: Adds an “Add user” button on `/{locale}/admin/users` to invite a user by email, choose role, select or create a Position, pick allowed applications, and set an access end date. Sends a Resend welcome email containing a link to set a password. A placeholder user is created immediately for visibility; during password setup the placeholder is replaced by the actual account.
- How to use:
  - On `/{locale}/admin/users`, click “Add user”. Fill in the form and submit “Create User & Send Welcome Email”.
  - The invited user receives an email with a link to `/{locale}/welcome/[token]` to set the password and finalize the account.
- Files:
  - UI: `app/[locale]/admin/users/user-add-dialog.tsx`, integrated in `user-table.tsx`.
  - Actions: `createUserInviteAction`, `createPositionAction` in `app/[locale]/admin/users/actions.ts`.
  - Services: `lib/services/positions.ts`, `lib/services/invitations.ts`, `lib/services/email.ts`, updates in `lib/services/users.ts`.
  - Password setup: `app/[locale]/welcome/[token]/page.tsx` and `app/[locale]/welcome/actions.ts`.
- i18n: Added new keys under `admin` and a `welcome` namespace for the setup page.
- Resend: Uses `RESEND_API_KEY` and optional `RESEND_FROM` env vars to send the email via HTTPS API.
## Feature: Enhanced Navbar UI

- Name: Enhanced Navbar (Avatar + Welcome + Actions)
- What it does: Updates the top navigation to include a user avatar with initials, a “Welcome back, {name}” title, a position badge when available, and the user role. Adds a compact outline language toggle, a gear/icon link to edit the profile, and a logout button with icon. Uses shadcn/ui components (Avatar, Badge, Button) and next-intl for bilingual labels.
- How to use it:
  - When authenticated, the left side shows your avatar and welcome line with your `position` (if set) and your `role` (Admin/User). On the right, use “Edit Profile” to open your profile and “Logout” to sign out.
  - When not authenticated, the navbar shows “Login” and “Sign up” buttons.
