## Enhancement: Bestof Attempt Navigation Boost

- Name: Faster attempt opening and LCP optimisations
- What it does: Prefetches the "Start new attempt" workspace before users click it, caches per-user case state/attempt queries, streams the clinical cases table via Suspense with a full-width skeleton, prioritises the navbar logo for LCP, and enforces HTTP compression for the app shell.
- How to use it: On `/{locale}/bestof-larib`, hover or focus the "Start new attempt" button to instantly warm the destination; the list renders its header immediately while the table hydrates, and subsequent case openings reuse the cached state and attempt history automatically.
- Updated files:
  - `app/[locale]/bestof-larib/page.tsx`
  - `app/[locale]/bestof-larib/components/cases-table.tsx`
  - `app/[locale]/bestof-larib/components/start-new-attempt-link.tsx`
  - `app/[locale]/bestof-larib/loading.tsx`
  - `lib/services/bestof-larib-attempts.ts`
  - `app/[locale]/components/navbar-client.tsx`
  - `next.config.ts`

## Enhancement: Bestof Admin Creation Dialog Improvements

- Name: Admin case dialog streamlined exam/disease creation
- What it does: Renames the inline modals to “Create new exam type”/“Create new disease” and automatically selects the freshly created value in the form so admins do not need to re-open the dropdowns.
- How to use it: While editing or creating a case in `/{locale}/bestof-larib`, use the “Create new exam type” or “Create new disease” buttons; the new entry is instantly selected in the corresponding field.
- Updated files:
  - `app/[locale]/bestof-larib/components/create-case-dialog.tsx`
  - `messages/en.json`
  - `messages/fr.json`

## Fix: Bestof Admin Attempt Button

- Name: Admin start new attempt disabled
- What it does: Prevents admins from launching a new attempt from a case by disabling the "Start new attempt" action when viewing the workspace.
- How to use it: As an admin on `/{locale}/bestof-larib/[id]`, the "Start new attempt" button now appears disabled and cannot be triggered; regular users keep the existing behavior.
- Updated files:
  - `app/[locale]/bestof-larib/[id]/user-panel.tsx`

## Fix: Login Suspense Boundary

- Name: Suspense-wrapped login form
- What it does: Wraps the localized login form in a Suspense boundary with a translated skeleton fallback so `useSearchParams` is resolved without prerender errors.
- How to use it: Visit `/{locale}/login`; the form now shows a loading skeleton while client-only dependencies hydrate, preventing build failures.
- Updated files:
  - `app/[locale]/login/page.tsx`

## Enhancement: Bestof Personalized Progress Status

- Name: Personalized case progress statuses
- What it does: Replaces the generic Published/Draft label with user-specific progress states (Completed, In progress, Not started), adds matching filter options for users, counts only validated attempts in the list, and lets Save Progress store partial work without a clinical report while keeping the admin view unchanged.
- How to use it: As a user, open `/{locale}/bestof-larib` to see badges and filters reflect your own progress; admins still see publication status. Saving progress now works even if only part of the form is filled, and the Attempts column increments only after a validation.
- Updated files:
  - `app/[locale]/bestof-larib/page.tsx`
  - `app/[locale]/bestof-larib/components/filters-bar.tsx`
  - `app/[locale]/bestof-larib/[id]/actions.ts`
  - `app/[locale]/bestof-larib/[id]/work-area.tsx`
  - `lib/services/bestof-larib.ts`
  - `lib/services/bestof-larib-attempts.ts`
  - `messages/en.json`
  - `messages/fr.json`

## Enhancement: Bestof Quick New Attempt Entry

- Name: New attempt shortcut from cases list
- What it does: Adds a user-only "New attempt" button beside "View" in the clinical cases table, sending the user to the case workspace with a fresh attempt while preserving personal settings.
- How to use it: On `/{locale}/bestof-larib`, click "New attempt" on any row to open the case with cleared analysis/report fields, ready for a brand-new submission.
- Updated files:
  - `app/[locale]/bestof-larib/page.tsx`
  - `app/[locale]/bestof-larib/[id]/page.tsx`

## Enhancement: Bestof Clinical Report & Difficulty UX

- Name: Colored difficulty chips + report minimum
- What it does: Removes the draft/validated badges in the case workspace, requires at least 10 plain-text characters before saving or validating a clinical report, and replaces personal difficulty selects with color-coded chips (including inline updates from the clinical cases table).
- How to use it: On any case (`/{locale}/bestof-larib/[id]`), enter at least 10 characters in "My Clinical Report" to enable save/validate, and use the new green/amber/red chips in the sidebar or directly in the cases table to set your personal difficulty.
- Updated files:
  - `app/[locale]/bestof-larib/components/personal-difficulty-picker.tsx`
  - `app/[locale]/bestof-larib/components/case-difficulty-cell.tsx`
  - `app/[locale]/bestof-larib/page.tsx`
  - `app/[locale]/bestof-larib/[id]/user-panel.tsx`
  - `app/[locale]/bestof-larib/[id]/work-area.tsx`
  - `app/[locale]/bestof-larib/[id]/actions.ts`
  - `lib/html.ts`
  - `messages/en.json`
  - `messages/fr.json`

## Fix: Bestof Attempt Refresh After Validation

- Name: Instant attempt refresh on validation
- What it does: When validating a case from `/{locale}/bestof-larib/[id]`, the latest attempt now keeps its fresh analysis/report values and forces the page to re-fetch server data so the sidebar immediately displays the correct attempt content without a hard reload.
- How to use it: As a user, fill in your analysis/report, click "Validate Case", and the new attempt in the left column will match what you just submitted without needing to refresh manually.
- Updated files:
  - `app/[locale]/bestof-larib/[id]/work-area.tsx` refreshes the route after validation and keeps a temporary attempt in memory until the server data updates.

## Enhancement: Bestof Tag Management Overhaul

- Name: Unified tag manager and inline assignment
- What it does: Streamlines tag management by merging assignment and editing into a single dialog, adds inline actions (edit/delete) with confirmation, and introduces a quick tag picker directly in the clinical cases table for faster assignment without leaving the row.
- How to use it: In `/{locale}/bestof-larib/[id]`, use "Create Tag" or the new toggle chips to manage personal tags; in the cases table, click the plus icon to toggle tags instantly or the settings icon to open the full manager.
- Updated files:
  - `app/[locale]/bestof-larib/components/tag-manager-dialog.tsx` rebuilds the dialog with combined assignment, editing, deletion, and refreshed visuals.
  - `app/[locale]/bestof-larib/components/case-tag-quick-picker.tsx` adds the quick popover selector for case rows.
  - `app/[locale]/bestof-larib/components/case-tag-cell.tsx` renders row badges with live updates and entry points to quick assign/manage.
  - `app/[locale]/bestof-larib/page.tsx` swaps the table tag column to the new client cell.
  - `app/[locale]/bestof-larib/[id]/user-tags-section.tsx` and `user-panel.tsx` reuse the same quick assign + manage controls inside the work area panel.
  - `app/[locale]/bestof-larib/actions.ts` exposes update/delete actions for admin and user tags.
  - `lib/services/bestof-larib-tags.ts` adds update/delete helpers for admin and user tags with validation.
  - `messages/{en,fr}.json` localizes the new UI strings.

## Fix: Bestof User Tag Picker Feedback

- Name: Clear feedback for personal tag selections
- What it does: Improves the "My Tags" picker by showing toggle chips with color dots, checkmarks, and auto-save status, preventing the router warning caused by immediate server action calls without a transition.
- How to use it: In the left panel of `/{locale}/bestof-larib/[id]`, selecting or deselecting a tag now highlights the chip, displays consistent messaging, and saves automatically without console errors.
- Updated files:
  - `app/[locale]/bestof-larib/[id]/user-tags-section.tsx` refactors selection persistence using transitions, collapses the list to five tags by default with an expandable view, and introduces the new toggle-style UI without inline status text.
  - `messages/en.json` documents the new helper strings explaining the tag state.
  - `messages/fr.json` mirrors the helper strings for French users.

## UI Enhancement: Bestof Case View – Analysis & Clinical Report

- Name: User case interaction panel (My Analysis + My Clinical Report)
- What it does: Enhances the case view at `/{locale}/bestof-larib/[id]` with:
  - Left sidebar: Attempts, Personal Settings (tags, personal difficulty), and personal comments; Save and Validate actions.
  - Center: "My Analysis" (LVEF, kinetic disorders, LGE presence, final diagnosis) and a rich text editor for "My Clinical Report".
  - Right: Existing case content preview (PDF or text) preserved.
  - Admins see the same UI but all inputs and actions are disabled.
- How to use it:
  - Open any case; fill analysis fields and report; click "Save Progress" to show a confirmation toast or "Validate Case" to confirm validation.
- Updated files:
  - `app/[locale]/bestof-larib/[id]/page.tsx` integrates the new panel and header badges.
  - `app/[locale]/bestof-larib/[id]/user-panel.tsx` new client component for user/admin interaction.
  - `messages/{en,fr}.json` adds `bestof.caseView.*` keys.
  - `app/[locale]/bestof-larib/[id]/actions.ts` server actions for saving attempts, validating, and upserting personal settings.
  - `lib/services/bestof-larib-attempts.ts` service layer for attempts and settings.
  - `prisma/schema.prisma` added `CaseAttempt` and `UserCaseSettings` models.

## Feature: Bestof Larib Clinical Cases
## UI Enhancement: Replace prompt() with dialogs for inline creation

- Name: Inline create dialogs (Exam, Disease, Position)
- What it does: Replaces native `prompt()` with elegant shadcn input dialogs when creating new Exam Types, Disease Tags, or Positions from within forms. This improves UX and keeps styling consistent.
- How to use it:
  - Bestof: In the Create Case dialog, click “+ Add New Exam Type” or “+ Add New Disease” to open a dialog, enter a name, and confirm. The newly created value is auto-selected.
  - Admin Users: In Add/Edit User, click “+ Add New Position” to open the dialog, enter a name, and confirm. The new position is auto-selected.
  - Profile (Admin): In the Profile editor, click “+ Add New Position” to open the dialog and create a new position.

### Technical Details

- Added `components/ui/input-dialog.tsx` generic input dialog built on shadcn `Dialog` and `Input`.
- Autofocus: the text field focuses on open via `autoFocus`.
- Validation helper: confirm is disabled until trimmed value reaches a minimum length (default 2, configurable with `minLength`).
- Size control: `DialogContent` now supports a `size` prop: `small` (narrow), default (medium), `large` (wide). The Bestof “Create Case” dialog uses `large`, and inline create dialogs use `small`.
- Updated files:
  - `app/[locale]/bestof-larib/components/create-case-dialog.tsx`: Replaces `prompt()` for Exam/Disease creation.
  - `app/[locale]/admin/users/user-add-dialog.tsx`: Replaces `prompt()` for Position creation.
  - `app/[locale]/admin/users/user-edit-dialog.tsx`: Replaces `prompt()` for Position creation.
  - `app/[locale]/profile/profile-editor.tsx`: Replaces `prompt()` for Position creation.


- Name: bestof-larib clinical cases
- What it does: Adds a new sub-app at `/{locale}/bestof-larib` with a server-rendered table of clinical cases accessible to all users. Admins can create cases via a dialog with fields for name, exam type, disease tag, difficulty, and custom tags. Content accepts an optional PDF (uploaded to Cloudflare R2) and/or text content; at least one is required. View page displays a PDF preview and/or text. An Edit route is scaffolded for future updates.
- How to use it:
  - From the dashboard or navbar, click “Open” on bestof-larib to navigate to `/{locale}/bestof-larib`.
  - Admins click “Create Case” to open the form. Use “+ Add New Exam Type” or “+ Add New Disease” to create taxonomy values inline.
  - Upload a PDF (≤10MB) or paste text content, then choose “Save Progress” (Draft) or “Create Case” (Published).
  - Click “View” on a row to access the case details page with a PDF preview if available.

### Technical Details

- Prisma: Adds `ExamType`, `DiseaseTag`, and `ClinicalCase` models; and `DifficultyLevel`, `CaseStatus` enums.
- Services: `lib/services/bestof-larib.ts` for listing/creating cases and ensuring taxonomy.
- Server Actions: `app/[locale]/bestof-larib/actions.ts` with `next-safe-action` and auth guards.
- Uploads: `POST /api/uploads/clinical-pdf` streams PDFs to R2 using the existing S3 client.
- UI: Server-first table in `app/[locale]/bestof-larib/page.tsx`, Create Case dialog in `app/[locale]/bestof-larib/ui/create-case-dialog.tsx`, view page at `app/[locale]/bestof-larib/[id]`.
- i18n: New `bestof` namespace in `messages/{en,fr}.json`.

### UI Update: Status & Tags Chips + Draft Save

- Name: Bestof list UX improvements (chips + actions + draft save)
- What it does:
  - Moves Status to the first column and renders it as a chip (green “Published”, yellow “Draft”).
  - Renders Disease as a chip and Difficulty as a distinct outline chip with level colors.
  - Adds an “Admin Tags” column (left of Actions) with a Plus icon button by default when no admin tags exist yet.
  - Adds icons to row action buttons and a new Delete button (not yet wired to deletion logic).
  - Allows “Save Progress” (Draft) in the Create Case dialog even if PDF/Text are missing; exclusivity (not both) still enforced.
- How to use it:
  - Visit `/{locale}/bestof-larib`; status now appears on the far left as colored chips.
  - Row actions include icons; a Delete button is present for admins (no action yet).
  - In “Create Case”, use “Save Progress” to store an incomplete draft; use “Create Case” to publish (requires PDF or text).
- Files updated:
  - `app/[locale]/bestof-larib/page.tsx` (chips, columns, icons, delete button, admin tags column)
  - `app/[locale]/bestof-larib/components/create-case-dialog.tsx` (draft save validation, edit mode support, prefill, conditional actions UI)
  - `app/[locale]/bestof-larib/components/delete-case-button.tsx` (shadcn AlertDialog confirm + toast)
  - `app/[locale]/bestof-larib/actions.ts` (create validation, update & delete actions)
  - `lib/services/bestof-larib.ts` (list includes content fields; update/delete services)
  - `messages/{en,fr}.json` (adds `bestof.table.adminTags` and `bestof.delete`)

---

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

## Feature: Account Menu & Profile Modal

- Name: Account Dropdown + Edit Profile
- What it does: Centralizes profile actions on the right side of the navbar, next to the locale switcher. The round user avatar opens a dropdown showing the user’s name, role, and position. The menu contains an Edit Profile modal, links to each assigned application, and a Logout action. The Edit Profile modal allows regular users to update photo URL, phone, birth date, and language; admins can additionally manage role, position, and applications. Email cannot be changed from this modal.
- How to use:
  - Click the round avatar at the top-right (beside the EN/FR toggle) to open the account menu.
  - Select “Edit Profile” to open the modal, update fields, and save.
  - Application links appear in the menu based on the user’s allowed applications.
  - Use “Logout” at the bottom of the menu to sign out.
  - Fully localized (EN/FR) via next-intl.

## Fix: Navbar Not Updating After Auth Changes

- Name: Live Navbar Auth Refresh
- What it does: Ensures the navbar immediately reflects authentication changes (sign in, sign up, sign out) without a hard refresh.
- How to use it:
  - Logging in or signing up now navigates to `/{locale}/dashboard` and refreshes server components automatically.
  - Logging out from the navbar now redirects to the localized home and refreshes server components, so the Login/Signup buttons reappear instantly.
- Technical details:
  - Updated navbar logout handler to push using `applicationLink(locale, '/')` and call `router.refresh()`.
  - Updated login/signup forms to use the i18n router and `applicationLink(locale, '/dashboard')`, then call `router.refresh()`.
  - Marked `app/[locale]/components/navbar.tsx` as `dynamic = 'force-dynamic'` so it re-renders on each request.

## Feature: Auth-Centric Home Routing

- Name: Home Redirect to Dashboard + Login as Root
- What it does: Authenticated users hitting `/{locale}` are redirected to `/{locale}/dashboard`. Unauthenticated users see the Login form directly at `/{locale}` (no sign-up link shown).
- How to use it:
  - Visiting `/{locale}` while logged in lands you on the Dashboard.
  - Visiting `/{locale}` while logged out shows the Login form.
- Technical details:
  - `app/[locale]/page.tsx`: Redirects to dashboard when a session exists; otherwise renders `<LoginForm showSignupLink={false} />`.
  - `app/[locale]/components/navbar-client.tsx`: Removes the Sign up button for guests; adds a clickable logo linking to `/{locale}` (uses `/public/portal-logo.png`).
  - Update: Logo moved to the left side of the navbar and increased to 40x40 for better visibility.
## Feature: Profile Page Editing + Simplified Navbar

- Name: Profile Editing on Profile Page
- What it does: Removes the separate “Edit Profile” action from the navbar and keeps a single localized link to the Profile page. On the Profile page, users can edit only the fields allowed by their role. Disallowed fields are disabled (greyed out). Saving is done per-field, so you can change a single field without validating the whole form.
- How to use:
  - Open the avatar menu and click “Profile” (now locale-aware).
  - On the Profile page, update an individual field and click “Save” next to it. Regular users can edit profile details like name, phone, birth date, language, position, and photo URL. Admins can additionally change role and allowed applications.
  - The page is fully localized (EN/FR) and uses shadcn/ui components with React Hook Form + Zod.

### Update
- Admins can now edit their Position from the Profile page (users do not see this field).
- Added Country field for both users and admins, with a full country list selector. Empty values are allowed and saved as null.
- Extracted reusable country list to `lib/countries.ts` and reused in Admin User Edit dialog (`/{locale}/admin/users`).
## Feature: Dashboard Applications Cards + Sidebar Removal

- Name: Dashboard Applications Cards
- What it does: On `/{locale}/dashboard`, shows a section titled “Accéder aux applications” listing one attractive card per application assigned to the signed-in user. Each card displays the localized app name and a short description, with a button to open the app. Below, an admin-only section displays a “User management” card linking to `/{locale}/admin/users`. The sidebar is removed from the Dashboard and Admin areas to simplify navigation.
- How to use it:
  - Visit `/{locale}/dashboard`. You’ll see as many cards as your allowed applications (e.g., Best of Larib, Congés, CardioLarib).
  - Admins will also see a “User management” card leading to the admin users list.
- Files:
  - UI: `app/[locale]/dashboard/page.tsx` now renders shadcn `Card` components per application; `app/[locale]/admin/layout.tsx` no longer uses the sidebar.
  - i18n: Added `dashboard.appsSectionTitle`, `dashboard.openApp`, `dashboard.adminSectionTitle`, and per-app descriptions (`dashboard.appDesc_*`) in `messages/{en,fr}.json`.
  - Links: All links use `applicationLink(locale, path)` to preserve the active locale.

## Feature: Admin Position Select in Profile + Sonner Toasters

- Name: Admin Profile Position Select & Toasters
- What it does:
  - On `/{locale}/profile`, when the user is an admin, the Position field is now a Select with the ability to add a new position inline (same UX as Edit User). Options are provided server-side; creation uses a secured server action.
  - Adds Sonner toast notifications on key mutations: Edit User, Add User, and Delete User. Errors are translated and surfaced via toasts.
  - Documents the expectation to show Sonner toasts for meaningful mutations in `AGENTS.md`.
- How to use it:
  - As an admin, open `/{locale}/profile`. Use the Position select. Click “+ Add New Position” to create one and auto-select it.
  - In `/{locale}/admin/users`, toasts appear on success or error for Edit, Add, and Delete actions.
- Files:
  - `app/[locale]/profile/page.tsx`: Fetches positions server-side for admins and passes them to the editor.
  - `app/[locale]/profile/profile-editor.tsx`: Switches Position to Select for admins and enables inline add via `createPositionAction`.
  - `actions/positions.ts`: Shared server actions for creating/listing positions (admin-only).
  - `app/[locale]/admin/users/user-edit-dialog.tsx`: Adds success/error toasts.
  - `app/[locale]/admin/users/user-add-dialog.tsx`: Adds success/error toasts.
  - `app/[locale]/admin/users/user-table.tsx`: Adds success/error toasts for delete.
  - `messages/{en,fr}.json`: Adds i18n keys for toast messages.
  - `AGENTS.md`: Adds guidance to trigger Sonner toasts on impactful mutations.
## Feature: Cloudflare R2 Profile Image Upload

- Name: Real Profile Photo Upload (R2)
- What it does: Replaces raw URL input with a true image upload flow including local preview, direct client upload to Cloudflare R2 via presigned URL, and storage of the public image URL in the user profile.
- How to use:
  - On `/{locale}/profile`, click “Choisir une image/Select image”, pick a file (PNG/JPG/WEBP up to 5MB), then “Upload”. The preview updates and the image URL is saved in the form; click “Save” to persist.
  - Admin-only wording is unchanged; only the input changed to an uploader.

### Technical Details

- Service: `lib/services/storage.ts` implements R2 SigV4 presign and public URL builder.
- API: `app/api/uploads/avatar/route.ts` handles authenticated image upload via server-side proxy to R2 (5MB, image-only).
- UI: `components/ui/file-upload.tsx` (shadcn-style) with local preview and upload.
- Integration: `app/[locale]/profile/profile-editor.tsx` now renders the uploader and binds the resulting URL to the `profilePhoto` field.
- Config: `next.config.ts` updated to allow `next/image` remote patterns for R2; `.env.example` includes `R2_*` variables.
- Prisma: Added optional `User.profilePhotoKey` for future deletion/rotation needs.

### Update: Switch to Server Proxy Upload (AWS SDK)

- Name: Move R2 Upload to API Route
- What it does: Replaces client-side presigned PUT with a Next.js API route that streams the file to R2 server-side (no CORS required).
- How to use:
  - The Profile page uploader works the same; it now posts `multipart/form-data` to `/api/uploads/avatar`.
- Technical details:
  - Added `app/api/uploads/avatar/route.ts` with auth via `getTypedSession()`.
  - Uses `@aws-sdk/client-s3` `PutObjectCommand` with endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `forcePathStyle: true`.
  - Reads credentials and bucket from `R2_*` env vars; no browser CORS needed.
  - `components/ui/file-upload.tsx` now envoie un `FormData` vers l'API.
  - Supprime `actions/storage.ts` (obsolète).

## Feature: Persist Avatar Immediately

- Name: Save Profile Photo on Upload
- What it does: After a successful upload, the app immediately stores `profilePhoto` and `profilePhotoKey` in the database so the image persists across refresh and appears in Prisma Studio.
- How to use it: Upload the image; no additional Save click required for the photo field.
- Technical details:
  - `actions/avatar.ts#saveProfilePhotoAction` (authenticated) updates the user with `profilePhoto` and `profilePhotoKey`.
  - `components/ui/file-upload.tsx` calls this action right after the API upload.

## Feature: Navbar Uses Profile Photo

- Name: Avatar Photo in Navbar + Hover Border Gradient
- What it does: Displays the user's `profilePhoto` (if present) in the navbar instead of initials. The avatar is round with the same border style, turns into a pointer on hover, and the border gains a subtle indigo→cyan gradient.
- How to use it: Upload a photo on `/{locale}/profile`; the navbar immediately shows it and it persists on refresh.
- Files:
  - `app/[locale]/components/navbar-client.tsx`: Uses `user.profilePhoto ?? user.image`, adds gradient hover wrapper and pointer cursor.

## Fix: R2 Presign CORS Compatibility Toggle

- Name: Virtual-Hosted R2 Presign Toggle
- What it does: Adds an opt-in env flag to generate virtual-hosted style presigned URLs for R2 uploads. Some environments report failed preflight (no `Access-Control-Allow-Origin`) against path-style URLs; switching to virtual-hosted often resolves it.
- How to use it:
  - Set `R2_VIRTUAL_HOSTED="true"` in `.env.local`.
  - Restart the dev server; new presigned URLs will look like `https://<BUCKET>.<ACCOUNT_ID>.r2.cloudflarestorage.com/<key>?...`.
  - No UI changes required.
- Technical details:
  - `lib/services/storage.ts`: Chooses host/`canonicalUri` based on `R2_VIRTUAL_HOSTED`.
  - `next.config.ts`: Allows `next/image` to load from both path-style and virtual-hosted R2 hostnames.
  - `.env.example`: Documents `R2_VIRTUAL_HOSTED`.

Recommended R2 CORS policy for local dev (bucket Settings → CORS Policy):

```
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3000
  }
]
```

Notes:
- Ensure `OPTIONS` is included (preflight), and widen `AllowedHeaders` to `*` in case the browser sends additional `Access-Control-Request-Headers`.
- After saving CORS, wait ~1–2 minutes; cached results can linger.

## Fix: Include Content-Type In Presigned PUT

- Name: Content-Type Signed Header for R2 PUT
- What it does: The presigned URL now signs `Content-Type` when provided, matching the exact header sent by the browser. This resolves cases where R2/S3 rejects the request or omits CORS headers during preflight/PUT when `Content-Type` isn’t part of the signature.
- How to use it: No UI change. The upload still sets `Content-Type` from the selected file; the server action forwards it to the presigner.
- Technical details:
  - `lib/services/storage.ts#createPresignedPutUrl(key, expires, contentType?)` adds `content-type` to `SignedHeaders` and canonical headers when provided.
  - API route forwards the file `Content-Type` to the presigner.
## Feature: Rich Text Paste (Word/Docs) + Font Size

- Name: Bestof Rich Text Editor Upgrades
- What it does: Enhances the text editor in bestof-larib so users can paste content directly from Microsoft Word or Google Docs and preserve formatting (bold, italic, underline, lists, headings). Adds a font size control to edit selected text without losing other styles. Pasted inline sizes (px/pt) are kept.
- How to use it:
  - In Create Case, choose the Text content option and paste from Word/Google Docs; formatting is preserved.
  - Use the toolbar to toggle Bold/Italic/Underline, lists, headings, and choose a font size from the Size dropdown or Reset to remove size.
  - PDF selection still disables text editing to keep the exclusive content rule.

### Technical Details

- Editor: TipTap with `StarterKit`, `Underline`, `Link`, `Placeholder`, `TextStyle`, and a `FontSize` extension to parse/render `font-size` inline styles.
- UI: Adds a Size dropdown (shadcn `Select`) to set or reset font size on the current selection; maintains strong typing and removes `any`/ignore patterns.
- Files updated: `components/ui/rich-text-editor.tsx`.

## Update: Case View Layout

- Name: Bestof Case View (Details + Content)
- What it does: The Case “View” page now shows all case details on the left (exam type, disease, difficulty, tags, created date) and the content on the right. If a PDF was uploaded, it shows a PDF viewer; otherwise it renders the formatted text content.
- Files updated: `app/[locale]/bestof-larib/[id]/page.tsx`.

## Fixes: i18n Links + Font Size Select

- Name: Bestof Links & UI Polish
- What it does: Avoids duplicated locale in links by using i18n `Link` with locale-less paths for View/Edit, preventing `/en/en/...`. Adjusts the font-size dropdown styling so the value is not clipped.
- Files updated: `app/[locale]/bestof-larib/page.tsx`, `app/[locale]/bestof-larib/[id]/page.tsx`, `components/ui/rich-text-editor.tsx`.
## UI Enhancement: Bestof Case View – Collapsible sidebar, wider Case Content, unified actions

- Name: Collapsible Case sidebar + unified Save/Validate
- What it does: Makes the left “Case” panel collapsible, enlarges the right Case Content area, and consolidates actions into two buttons — “Save Progress” and “Validate Case” — shown under “My Clinical Report” (bottom-right). Saving/validation now persists personal settings (tags, difficulty, comments), analysis, and clinical report together; validation also marks the latest attempt as validated.
- How to use it:
  - Open any case at `/{locale}/bestof-larib/[id]`.
  - Toggle the “Case” panel to collapse/expand and gain more space for the content.
  - Enter analysis fields and write your report; set personal tags/difficulty/comments.
  - Click “Save Progress” to store everything, or “Validate Case” to save + validate.
  - When revisiting, your tags, difficulty, comments, analysis, and report are pre-filled.
- Files updated:
  - `app/[locale]/bestof-larib/[id]/page.tsx`: server prefill and new layout usage.
  - `app/[locale]/bestof-larib/[id]/work-area.tsx`: new client wrapper (collapsible + resizable columns, unified actions, controlled state, attempts selection).
  - `app/[locale]/bestof-larib/[id]/user-panel.tsx`: removes redundant "Case" header; adds attempts list with click-to-load; controlled AnalysisForm/ClinicalReport.
  - `app/[locale]/bestof-larib/[id]/actions.ts`: adds `saveAllAction` and `saveAllAndValidateAction`.
  - `lib/services/bestof-larib-attempts.ts`: adds `getUserCaseState` for prefill and `listUserCaseAttempts`; `saveAttempt` now reuses the latest draft.
- Feature: Admin/User Tags for Bestof Larib cases
  - Add shared Admin Tags and private User Tags with color and description.
  - Manage tags via a modal on the cases table (+ button), with tabs to assign, manage, and view cases by tag.
  - Admin tags are global for all admins; user tags are visible only to the user who created them.
  - How to use:
    - In the Bestof Larib cases list, click + in the Tags column.
    - Assign: select tags for the case and save.
    - Manage: create new tags (name, color, description).
    - Cases: pick a tag to view all cases flagged with it.
  - Implementation details:
    - New Prisma models: AdminTag, AdminTagOnCase, UserTag, UserTagOnCase.
    - New services in `lib/services/bestof-larib-tags.ts` and actions in `app/[locale]/bestof-larib/actions.ts`.
  - UI: `TagManagerDialog` in `app/[locale]/bestof-larib/components/tag-manager-dialog.tsx` using shadcn/ui.
  - Added generic `Loader` component in `components/ui/loader.tsx` and used in modal for smooth loading states.
## Code Quality: Bestof Larib – Typing & Naming Cleanup (PR1)

- Name: Bestof Larib code quality pass – typing and naming
- What it does: Removes unsafe `any`/`as any` in the Bestof feature, improves variable naming in array helpers, and adds a small helper for typed action error messages.
- How to use it: No user-facing changes. Build and run as usual. Behavior and UI remain identical.
- Updated files:
  - `app/[locale]/bestof-larib/[id]/page.tsx`: Strongly types `attempts` using `CaseAttemptSummary`.
  - `app/[locale]/bestof-larib/[id]/work-area.tsx`: Typed attempts, safer error handling, clearer variable names.
  - `app/[locale]/bestof-larib/[id]/user-panel.tsx`: Typed debounce timer, safer error handling, removed window `as any`, clearer variable names.
  - `app/[locale]/bestof-larib/page.tsx`: Replaces `c` with `caseItem` in maps.
  - `app/[locale]/bestof-larib/components/create-case-dialog.tsx`: Descriptive map variables for exam/disease options.
  - `app/[locale]/bestof-larib/components/tag-manager-dialog.tsx`: Descriptive map/filter variables throughout.
  - `lib/ui/safe-action-error.ts`: New tiny utility to extract a message from `next-safe-action` errors safely.
  - `types/global.d.ts`: Adds `window.__lastAttemptId?: string` to remove `as any` casts.
  - `cleanbestof.md`: Plan for PR1–PR3 to continue cleanup (Zustand + props refactor next).
## Code Quality: Bestof Larib – Props Refactor + Small Store (PR2/PR3)

- Name: Props reduction and shared state for attempts
- What it does: Reduces prop counts by grouping inputs and replaces window globals with a tiny Zustand store.
- How to use it: No UI change. Components are invoked with grouped config objects.
- Updated files:
  - `lib/stores/bestof-attempts.ts`: New Zustand store for `lastAttemptIdByCase`.
  - `app/[locale]/bestof-larib/[id]/user-panel.tsx`: Accepts a single `config` prop; shares last attempt id via store; typed debounced save payload.
  - `app/[locale]/bestof-larib/[id]/work-area.tsx`: Groups props into `{ meta, defaults, rightPane, attempts }`.
  - `app/[locale]/bestof-larib/[id]/page.tsx`: Updated to new `WorkArea` API.
  - `app/[locale]/bestof-larib/components/tag-manager-dialog.tsx`: Fixed union typing by splitting hooks per mode; clarified types for cases list.
## UX: Update tags label + auto-refresh (Bestof)

- Name: Tag edit label and refresh on save
- What it does:
  - Changes the dialog action label from "Edit Tags" to "Update Tags".
  - Refreshes the bestof-larib list after saving tags so new tags appear immediately without hard reload.
  - Closes the Tag Manager dialog automatically on successful save.
- How to use:
  - Click the plus icon in the Admin/User Tags column, select tags, then click "Update Tags". The table updates right away.
- Updated files:
  - `messages/{en,fr}.json` update `bestof.editTags` translations.
  - `app/[locale]/bestof-larib/components/tag-manager-dialog.tsx` calls `router.refresh()` on successful tag save.
## Feature: Bestof list filters, sorting, and user stats

- Name: Filters + sortable headers + attempts/difficulty columns
- What it does:
  - Adds a filters bar above the table (search by name, Status, Exam, Disease, Difficulty). Filters can be combined.
  - Filters auto-apply on change; search has debounce.
  - Adds date range filter (From/To) on created date.
  - Makes column headers sortable (Name, Status, Exam, Disease, Difficulty, Created, Attempts, My Difficulty).
  - Shows per-user Attempts count and My Difficulty in the list.
- How to use:
  - Use the search and selects above the list, then click Apply. Click Reset to clear filters. Click any column header to sort; click again to toggle direction.
- Updated files:
  - `app/[locale]/bestof-larib/page.tsx` reads URL params and renders new columns.
  - `app/[locale]/bestof-larib/components/filters-bar.tsx` client filters toolbar.
  - `app/[locale]/bestof-larib/components/sort-header.tsx` client header sort control.
  - `lib/services/bestof-larib.ts` supports filters/sort; enriches with attempts count and personal difficulty.
  - `messages/{en,fr}.json` adds table labels and filters labels.
## UX: Case view personal tags picker

- Name: User tag toggles with create modal
- What it does:
  - In the case view personal settings, shows all of the user's tags as toggleable items for the current case.
  - Adds a “Create Tag” modal; on success, the tag is auto-selected and saved.
  - UI: Compact chips with hover/focus; active = filled color, inactive = outlined. Admins cannot edit.
  - Auto-save: toggling chips or creating a tag saves immediately (removed the “Update Tags” button in this panel).
- How to use:
  - Open a case, under Personal Settings > My Tags, toggle tags and click “Update Tags”, or create a new one via the modal.
- Updated files:
  - `app/[locale]/bestof-larib/[id]/user-tags-section.tsx` new client component.
  - `app/[locale]/bestof-larib/[id]/user-panel.tsx` integrates the picker.
  - `app/[locale]/bestof-larib/[id]/work-area.tsx` passes user tag data.
  - `app/[locale]/bestof-larib/[id]/page.tsx` fetches user tags and selected case tag ids server-side.
# Changelog

## [Unreleased]

- Bestof Larib: Added role-specific filters in the cases list
  - Admins can filter by admin tag (global admin tags)
  - Admin Tag filter is now multi-select (uses MultiSelect)
  - Users can filter by their own user tags (multi-select)
  - Exam, Disease, and Difficulty filters are now multi-select using the app's MultiSelect component for a better UX
  - Added "My Difficulty" filter (filters by personal difficulty saved per case)
  - Slightly reduced the width of the name search input for better layout
  - Added route-level loading skeleton (loading.tsx) to smooth UI during filter changes/navigation
  - Added in-page table overlay loader for smoother filter transitions
  - How to use: Open Bestof Larib list page, use the new filter selects in the top filter bar. Admins will see an "Admin Tag" filter; authenticated users will see a "User Tag" and a "My Difficulty" filter. All filters update the URL query and results dynamically.
- Performance: Server-side caching for Bestof data and session hydration
  - `getTypedSession` now leverages React 19 `cache` to avoid duplicate session fetches per request.
  - Bestof services (`listClinicalCasesWithDisplayTags`, `listExamTypes`, `listDiseaseTags`, tag queries, etc.) use `unstable_cache` with fine-grained tags.
  - Server actions trigger `revalidateTag` so cached data stays in sync after admin/user changes.
  - How to use: No manual action needed. Navigate the portal as usual; data-heavy pages now reuse cached results until a relevant mutation runs.
  - Updated files: `lib/auth-helpers.ts`, `lib/services/bestof-larib.ts`, `lib/services/bestof-larib-tags.ts`, `lib/services/bestof-larib-attempts.ts`, `app/[locale]/bestof-larib/actions.ts`, `app/[locale]/bestof-larib/[id]/actions.ts`.
