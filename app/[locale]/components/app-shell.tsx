import { getTypedSession } from '@/lib/auth-helpers'
import { NavbarClient } from './navbar-client'
import { AppSidebar } from './app-sidebar'
import { AppTopBar } from './app-topbar'

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
      <AppSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar user={user} />
        <main className="flex-1 bg-bg-app">{children}</main>
      </div>
    </div>
  )
}
