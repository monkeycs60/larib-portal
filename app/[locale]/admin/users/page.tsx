import { getTranslations } from "next-intl/server"
import { getTypedSession } from "@/lib/auth-helpers"
import { redirect, notFound } from "next/navigation"
import { listUsersWithAccountStatus } from "@/lib/services/users"
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
  if (session.user.role !== 'ADMIN') notFound()

  const t = await getTranslations({ locale, namespace: 'admin' })
  const users = await listUsersWithAccountStatus()
  const positions = await listPositions()

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">{t('usersTitle')}</h1>
        <p className="text-muted-foreground">{t('usersSubtitle')}</p>
      </div>
      <UserTable users={users as unknown as UserRow[]} positions={positions} locale={locale} />
    </div>
  )
}
