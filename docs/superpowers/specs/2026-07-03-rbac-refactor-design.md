# Design — Refonte RBAC (rôles par app)

- **Date:** 2026-07-03
- **Branche de départ:** `design/refonte-ui`
- **Statut:** validé en brainstorming, prêt pour le plan d'implémentation
- **Sous-projet 1** — à réaliser **avant** la sous-app Publications (qui en dépend).

## 1. Contexte & objectif

Aujourd'hui l'autorisation repose sur un `User.role: ADMIN | USER` **global** qui gouverne **tous** les checks admin, plus `User.applications: Application[]` qui gouverne l'**accès** par app (pas l'admin). Il n'y a **pas** de notion d'admin par app : un admin l'est partout, ou pas du tout.

On veut : un **super-admin portail** (gestion des comptes) + un rôle **Admin / Membre par app**, pour pouvoir désigner p.ex. un admin Congés qui n'est pas admin de tout.

## 2. Décisions (verrouillées)

- **Modèle = tableaux d'enum** (Option 1) : on garde `applications: Application[]` (accès) et on ajoute `adminApplications: Application[]` (admin par app, sous-ensemble de `applications`).
- **Super-admin = `Role.ADMIN`** (enum `Role` **conservé, pas de renommage**). `USER` = non super-admin.
- **Admin d'une app** = `isSuperAdmin(user)` **OU** `app ∈ user.adminApplications`.
- **Règle de répartition** : tout ce qui touche aux **comptes/portail** → super-admin ; tout ce qui est **métier d'une app** → admin de cette app. Le super-admin passe **toutes** les gardes.
- **Migration** : chaque `ADMIN` existant → reste super-admin (aucun changement de comportement) ; chaque `USER` → membre de ses apps (`adminApplications = []`).

## 3. Changements de modèle

### Prisma (`prisma/schema.prisma`)
- `User.adminApplications Application[] @default([])` (nouveau ; invariant applicatif `adminApplications ⊆ applications`).
- Migration additive (⚠ jamais `migrate reset`). Aucune donnée à rétro-remplir : les `ADMIN` restent super-admins (passent tout), les `USER` ont `adminApplications = []` par défaut.

### Session (`lib/auth-helpers.ts`)
- Ajouter `adminApplications` au `select` de `getTypedSession()` (`:21-30`) pour qu'il soit hydraté sur `session.user` comme `role`/`applications`. Flux de types via `types/session.ts` automatique (type Prisma généré).

## 4. Primitives d'autorisation (à créer)

### Helpers purs — `lib/permissions.ts` (nouveau)
```ts
export function isSuperAdmin(user: { role: Role }): boolean         // role === 'ADMIN'
export function canAdminApp(user: { role: Role; adminApplications: Application[] }, app: Application): boolean
  // isSuperAdmin(user) || user.adminApplications.includes(app)
export function canAccessApp(user, app): boolean                    // isSuperAdmin || applications.includes(app)
```

### Gardes server-action — `actions/safe-action.ts`
Le point de bascule unique aujourd'hui est `adminOnlyAction` (`:31-37`). On le remplace par :
- `superAdminAction` = l'actuel `adminOnlyAction` (check `role === 'ADMIN'`), renommé pour l'intention. (On garde un alias `adminOnlyAction` le temps de la migration si utile, puis on supprime.)
- `appAdminAction(app: Application)` = factory `authenticatedAction.use(...)` qui `throw 'Forbidden'` si `!canAdminApp(ctx.user, app)`.

### Garde page — `lib/auth-guard.ts`
- `requireAppAdmin(app)` (au-dessus de `requireAuth`) pour les pages admin d'une app ; `requireSuperAdmin()` pour `/admin/**`.

## 5. Migration des points de bascule (inventaire → cible)

### 5.1 Rester **super-admin** (`role === 'ADMIN'`, aucune bascule)
- `app/[locale]/admin/layout.tsx:19` (garde tout `/admin/**`) et `admin/users/page.tsx:18`.
- **admin/users — toutes les actions** (`app/[locale]/admin/users/actions.ts`) : `updateUserAction:31`, `deleteUserAction:61`, `createUserInviteAction:99`, `resendInvitationAction:192`, et les **positions** `listPositionsAction:156`/`createPositionAction:163`/`updatePositionAction:171`/`deletePositionsAction:179` (+ doublon `actions/positions.ts`). → passer de `adminOnlyAction` à `superAdminAction`.
- `dashboard/page.tsx:160` (carte Admin → `/admin/users`), `app-sidebar.tsx:34,55-60` (section Administration), `app-topbar.tsx:101` + `navbar-client.tsx:147` (badge admin). → `isSuperAdmin`.
- `actions/profile.ts:26` (self-edit de son `role`/`applications`) + `profile/page.tsx:39,43` + `profile-editor.tsx:93-94` : seul un **super-admin** peut modifier `role`/`applications`/`adminApplications`. → `isSuperAdmin`.
- `create-admin/actions.ts:44,47` (bootstrap super-admin via code d'accès) : inchangé (seed super-admin).

### 5.2 Basculer en **admin Congés** (`canAdminApp(user, 'CONGES')`)
- Actions (`app/[locale]/conges/actions.ts`) : `updateLeaveStatusAction:144`, `updateLeaveAllocationAction:163`, `adminDeleteLeaveAction:251`, `adminUpdateLeaveAction:271` → `appAdminAction('CONGES')`.
- `conges/actions.ts:106` (auto-approbation de sa propre demande) : condition `isSuperAdmin || canAdminApp(user,'CONGES')`.
- `conges/page.tsx` : `isAdmin` (`:75,78,507,523-536`) → `canAdminApp(user,'CONGES')` pour afficher les sections admin (pending, historique décisions, vue équipe). Garde d'accès `:60` : `canAccessApp(user,'CONGES')` (un admin Congés a forcément l'accès puisque `adminApplications ⊆ applications`).
- `lib/services/conges/index.ts:496` `getAdminEmails` : cibler les **admins Congés** — `where: { OR: [{ role: 'ADMIN' }, { adminApplications: { has: 'CONGES' } }] }`.

### 5.3 Basculer en **admin Bestof** (`canAdminApp(user, 'BESTOF_LARIB')`)
- Actions (`app/[locale]/bestof-larib/actions.ts`) : exam-types `:80/:112/:96`, disease-tags `:88/:121/:104`, `updateCaseAction:132`, `deleteCaseAction:152`, et **admin tags** `:164/:169/:175/:184/:195/:229/:247` → `appAdminAction('BESTOF_LARIB')`.
- Pages statistiques (`statistics/page.tsx:37`, `.../users/[userId]/page.tsx:32`, `.../attempts/[attemptId]/page.tsx:22`) → `requireAppAdmin('BESTOF_LARIB')`.
- UI `bestof-larib/page.tsx:59` + `[id]/page.tsx:41` (`isAdmin` pour create/edit, filtres draft, admin tags) → `canAdminApp(user,'BESTOF_LARIB')`.
- Routes DICOM `app/api/bestof/dicoms/{check-bulk:21,download:21,download-batch:29}` (accès aux cas non publiés) → `canAdminApp(user,'BESTOF_LARIB')`.

### 5.4 Invitation / acceptation
- `welcome/actions.ts:46,51` (écrit `role` + `applications` depuis l'invite) → gérer aussi `adminApplications` dans le payload d'invitation.

## 6. UI `/admin/users` (super-admin)
- `admin/users/actions.ts` : ajouter `adminApplications: z.array(z.enum([...]))` aux schémas de `updateUserAction`/`createUserInviteAction` et persister via `updateUser`/`createUser` (`lib/services/users.ts`) ; validation `adminApplications ⊆ applications`.
- `user-add-dialog.tsx` + `user-edit-dialog.tsx` : pour chaque app, **deux cases — Accès + Admin de l'app** (`applications` / `adminApplications`), en plus du toggle **super-admin** (`role`). Réutilise `AVAILABLE_APPLICATIONS`.
- Corriger au passage l'incohérence d'enum `applications` (les actions incluent `CARDIOLARIB`, le add-dialog l'omet) — aligner.

## 7. Anomalies existantes à trancher (dans ce refactor)
1. **`createCaseAction`** (`bestof-larib/actions.ts:53`) est `authenticatedAction` (tout user connecté peut créer un cas). Reco : le passer en `appAdminAction('BESTOF_LARIB')` par cohérence (⚠ changement de comportement) — **à confirmer**.
2. **`bestof-larib/page.tsx:33`** n'a **aucune garde d'accès** (tout user connecté y accède, seule l'UID change). Reco : ajouter `canAccessApp(user,'BESTOF_LARIB')` comme pour Congés — **à confirmer**.
3. **`CARDIOLARIB`** : valeur d'enum sans route ; on la laisse hors des pickers UI (statu quo), juste aligner les schémas.

## 8. Tests
- Unitaires : `isSuperAdmin` / `canAdminApp` / `canAccessApp` (super-admin passe tout ; admin d'une app ≠ admin d'une autre ; membre bloqué).
- E2E Playwright (`tests/e2e/`), FR/EN dans le même test :
  - Un **admin Congés** (non super-admin) approuve une demande de congé mais **n'accède pas** à `/admin/users` ni aux stats Bestof.
  - Un **admin Bestof** crée/édite un cas mais **ne peut pas** approuver un congé.
  - Un **super-admin** passe toutes les gardes et édite les rôles dans `/admin/users`.
  - Un **membre** est en lecture/usage simple partout.
- Étendre `prisma/seed.test.ts` : un super-admin, un admin-Congés, un admin-Bestof, un membre.
- **Ne pas affaiblir** les tests existants : adapter les fixtures de rôle, pas les assertions.

## 9. Migration des données (users existants)
- Additive : `adminApplications` par défaut `[]`.
- Comportement préservé : les `ADMIN` restent super-admins (passent tout) ; les `USER` deviennent membres. Aucune bascule de données requise. La rétrogradation d'un super-admin en admin-par-app se fait ensuite **manuellement** via `/admin/users`.

## 10. Non-objectifs / hors périmètre
- Pas de table normalisée `UserApplicationRole` (Option 2 écartée).
- Pas plus de 2 rôles par app (Admin / Membre).
- Pas de migration de la sémantique au-delà de ce qui est listé §5 ; `CARDIOLARIB` reste dormant.
- Pas de renommage `Role.ADMIN → SUPER_ADMIN`.

## 11. Lien avec la spec Publications
La spec `2026-07-03-publications-management-design.md` supposait un bolt-on incrémental d'`adminApplications`. Avec ce refactor **fait avant**, Publications consomme directement les primitives ci-dessus : « admin publications » = `canAdminApp(user, 'PUBLICATIONS')`, garde d'action `appAdminAction('PUBLICATIONS')`. La §2 de la spec Publications sera mise à jour pour pointer vers ce document plutôt que décrire le bolt-on.
