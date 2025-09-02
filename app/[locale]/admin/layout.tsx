import { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { getTypedSession } from "@/lib/auth-helpers"
import { notFound, redirect } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const session = await getTypedSession()
  const { locale } = await params

  if (!session) {
    redirect(`/${locale}/login`)
  }
  if (session.user.role !== 'ADMIN') notFound()

  const t = await getTranslations({ locale, namespace: 'admin' })

  const items = [
    {
      href: `/${locale}/admin/users`,
      label: t('usersNav'),
    },
  ]

  // No reliable current path on server; keep simple highlighting off here
  return (
    <div className="min-h-[calc(100vh-4rem)] flex">{/* account for Navbar height */}
      <Sidebar items={items} activePath={''} title={t('title')} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
