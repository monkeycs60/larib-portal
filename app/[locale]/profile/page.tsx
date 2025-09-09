import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getTypedSession } from "@/lib/auth-helpers";
import { ProfileEditor } from "./profile-editor";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getTypedSession()
  if (!session) redirect("/login")

  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'profile' })

  const birthDate = session.user.birthDate
    ? new Date(session.user.birthDate).toISOString().slice(0,10)
    : null

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
              initial={{
                email: session.user.email,
                isAdmin: session.user.role === 'ADMIN',
                firstName: session.user.firstName ?? undefined,
                lastName: session.user.lastName ?? undefined,
                phoneNumber: session.user.phoneNumber ?? undefined,
                birthDate: birthDate ?? undefined,
                language: (session.user.language ?? (locale === 'fr' ? 'FR' : 'EN')) as 'EN' | 'FR',
                position: session.user.position ?? undefined,
                country: session.user.country ?? undefined,
                profilePhoto: session.user.profilePhoto ?? undefined,
                role: session.user.role,
                applications: (session.user.applications ?? []) as ['BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'] | undefined,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
