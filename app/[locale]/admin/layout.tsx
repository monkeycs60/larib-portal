import { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { getTypedSession } from "@/lib/auth-helpers"
import { notFound, redirect } from "next/navigation"

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

  await getTranslations({ locale, namespace: 'admin' })

  // Sidebar removed; simple content container
  return <div className="min-h-[calc(100vh-4rem)] py-6 px-8">{children}</div>
}
