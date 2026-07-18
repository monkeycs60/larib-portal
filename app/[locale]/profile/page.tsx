import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getTypedSession } from "@/lib/auth-helpers";
import { ProfileEditor } from "./profile-editor";
import { PageHeader } from "@/app/[locale]/components/page-header";
import { listPositions } from "@/lib/services/positions";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getTypedSession()
  if (!session) redirect("/login")

  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'profile' })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      birthDate: true,
      language: true,
      position: true,
      country: true,
      profilePhoto: true,
      role: true,
      applications: true,
      adminApplications: true,
    }
  })

  if (!user) redirect("/login")

  const birthDate = user.birthDate
    ? new Date(user.birthDate).toISOString().slice(0,10)
    : null

  const positions = isSuperAdmin(user) ? await listPositions() : []

  const initialValues = {
    email: user.email,
    isAdmin: isSuperAdmin(user),
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    phoneNumber: user.phoneNumber ?? undefined,
    birthDate: birthDate ?? undefined,
    language: (user.language ?? (locale === 'fr' ? 'FR' : 'EN')) as 'EN' | 'FR',
    position: user.position ?? undefined,
    country: user.country ?? undefined,
    profilePhoto: user.profilePhoto ?? undefined,
    role: user.role,
    applications: (user.applications ?? []) as ['BESTOF_LARIB' | 'CONGES' | 'PUBLICATIONS'] | undefined,
    adminApplications: user.adminApplications ?? [],
  }

  return (
    <div className="min-h-full app-gradient -mx-8 -my-6 px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <PageHeader title={t('title')} subtitle={t('welcome')} />
        <ProfileEditor
          initial={initialValues}
          positions={positions}
        />
      </div>
    </div>
  )
}
