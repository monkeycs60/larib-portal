import { getTranslations } from "next-intl/server"
import { getTypedSession } from "@/lib/auth-helpers"
import { redirect, notFound } from "next/navigation"
import { isSuperAdmin } from "@/lib/permissions"
import { listUsersWithOnboardingStatus } from "@/lib/services/users"
import { listPositions } from "@/lib/services/positions"
import { PageHeader } from "@/app/[locale]/components/page-header"
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
    <div className="min-h-full app-gradient -mx-8 -my-6 px-8 py-6">
      <div className="space-y-4 max-w-7xl mx-auto">
        <PageHeader title={t('usersTitle')} subtitle={t('usersSubtitle')} />
        <UserTable users={users as unknown as UserRow[]} positions={positions} locale={locale} />
      </div>
    </div>
  )
}
