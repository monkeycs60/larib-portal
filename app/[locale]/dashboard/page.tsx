import { requireAuth } from '@/lib/auth-guard'
import { Link } from '@/app/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// Note: i18n Link auto-prefixes the active locale; pass non-localized paths

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  // Require authentication - will redirect to login if not authenticated
  const session = await requireAuth()
  
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard' })

  const adminT = await getTranslations({ locale, namespace: 'admin' })

  const apps = (session.user.applications ?? []) as Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'>

  function appSlug(app: 'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'): string {
    return app === 'BESTOF_LARIB' ? '/bestof-larib' : app === 'CONGES' ? '/conges' : '/cardiolarib'
  }

  return (
    <div className="min-h-screen">
      <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('title')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('welcome')}, {session.user.name || session.user.email}!
          </p>
        </header>
        
        <main>
          {/* Applications */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('appsSectionTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <Card key={app} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{adminT(`app_${app}`)}</CardTitle>
                    <CardDescription>{t(`appDesc_${app}`)}</CardDescription>
                  </CardHeader>
                  <div className="px-6 pb-6">
                    <Button asChild variant="default">
                      <Link href={appSlug(app)}>{t('openApp')}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Admin-only section */}
          {session.user.role === 'ADMIN' && (
            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('adminSectionTitle')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{adminT('usersNav')}</CardTitle>
                    <CardDescription>{adminT('usersSubtitle')}</CardDescription>
                  </CardHeader>
                  <div className="px-6 pb-6">
                    <Button asChild variant="secondary">
                      <Link href={'/admin/users'}>{adminT('usersNav')}</Link>
                    </Button>
                  </div>
                </Card>
              </div>
            </section>
          )}
        </main>
      </div>
        </div>
    </div>
  );
}
