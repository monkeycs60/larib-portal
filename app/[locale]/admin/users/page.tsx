import { getTranslations } from "next-intl/server"
import { getTypedSession } from "@/lib/auth-helpers"
import { redirect, notFound } from "next/navigation"
import { listUsers, getUserRole } from "@/lib/services/users"
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
  const role = await getUserRole(session.user.id)
  if (role !== 'ADMIN') notFound()

  const t = await getTranslations({ locale, namespace: 'admin' })
  const users = await listUsers()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('usersTitle')}</h1>
        <p className="text-muted-foreground">{t('usersSubtitle')}</p>
      </div>
      <UserTable users={users as unknown as UserRow[]} />
    </div>
  )
}
