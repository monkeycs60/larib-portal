import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getTypedSession } from "@/lib/auth-helpers";
import { ProfileEditor } from "./profile-editor";
import { listPositions } from "@/lib/services/positions";
import { prisma } from "@/lib/prisma";

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
    }
  })

  if (!user) redirect("/login")

  const birthDate = user.birthDate
    ? new Date(user.birthDate).toISOString().slice(0,10)
    : null

  const positions = user.role === 'ADMIN' ? await listPositions() : []

  const initialValues = {
    email: user.email,
    isAdmin: user.role === 'ADMIN',
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    phoneNumber: user.phoneNumber ?? undefined,
    birthDate: birthDate ?? undefined,
    language: (user.language ?? (locale === 'fr' ? 'FR' : 'EN')) as 'EN' | 'FR',
    position: user.position ?? undefined,
    country: user.country ?? undefined,
    profilePhoto: user.profilePhoto ?? undefined,
    role: user.role,
    applications: (user.applications ?? []) as ['BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'] | undefined,
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('title')}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{t('welcome')}</p>
          </div>
          <div className="border-t border-gray-200 p-4 sm:p-6">
            <ProfileEditor
              initial={initialValues}
              positions={positions}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
