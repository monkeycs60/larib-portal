import { getTypedSession } from '@/lib/auth-helpers'
import { NavbarClient } from './navbar-client'
import { AppSidebar } from './app-sidebar'
import { toActiveApplications } from '@/lib/permissions'

// Always rendered dynamically to reflect auth changes
export const dynamic = 'force-dynamic'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getTypedSession()
  const user = session?.user

  if (!user) {
    return (
      <>
        <NavbarClient user={null} />
        {children}
      </>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={{ ...user, applications: toActiveApplications(user.applications), adminApplications: toActiveApplications(user.adminApplications) }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="app-gradient flex-1">{children}</main>
      </div>
    </div>
  )
}
