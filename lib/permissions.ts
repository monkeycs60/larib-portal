import type { Application, Role } from '@/app/generated/prisma'

// Tolerant of optional/null fields: session.user always has them, but some UI
// prop types (e.g. SidebarUser) declare role/applications as optional.
type WithRole = { role?: Role | null }
type WithAdminApps = WithRole & { adminApplications?: Application[] | null }

export function isSuperAdmin(user: WithRole): boolean {
  return user.role === 'ADMIN'
}

export function canAdminApp(user: WithAdminApps, app: Application): boolean {
  return isSuperAdmin(user) || (user.adminApplications ?? []).includes(app)
}

export function canAccessApp(
  user: WithRole & { applications?: Application[] | null; adminApplications?: Application[] | null },
  app: Application,
): boolean {
  return isSuperAdmin(user) || (user.applications ?? []).includes(app) || (user.adminApplications ?? []).includes(app)
}

export function accessibleApplications(
  user: { applications?: Application[] | null; adminApplications?: Application[] | null },
): Application[] {
  return Array.from(new Set([...(user.applications ?? []), ...(user.adminApplications ?? [])]))
}
