import { getTranslations } from "next-intl/server"
import { getTypedSession } from "@/lib/auth-helpers"
import { redirect, notFound } from "next/navigation"
import { isSuperAdmin } from "@/lib/permissions"
import { listUsersWithOnboardingStatus } from "@/lib/services/users"
import { listPositions } from "@/lib/services/positions"
import { UserTable, type UserRow } from "./user-table"

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const session = await getTypedSession()
  const { locale } = await params
  if (!session) {
    redirect(`/${locale}/login`)
  }
  if (!isSuperAdmin(session.user)) notFound()

  const t = await getTranslations({ locale, namespace: 'admin' })
  const users = await listUsersWithOnboardingStatus()
  const positions = await listPositions()

  return (
    <div className="min-h-full bg-[radial-gradient(60rem_40rem_at_top_right,var(--color-coral-50),transparent_70%)] bg-bg-app -mx-8 -my-6 px-8 py-6">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="border-l-4 border-coral-500 pl-4">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{t('usersTitle')}</h1>
          <p className="text-text-secondary">{t('usersSubtitle')}</p>
        </div>
        <UserTable users={users as unknown as UserRow[]} positions={positions} locale={locale} />
      </div>
    </div>
  )
}
