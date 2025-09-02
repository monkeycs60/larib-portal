import { requireAuth } from '@/lib/auth-guard';
import { Link } from '@/app/i18n/navigation';
import { getTranslations } from 'next-intl/server';
// no redirect; only show admin link conditionally

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  // Require authentication - will redirect to login if not authenticated
  const session = await requireAuth();
  
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  
  return (
    <div className="min-h-screen p-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">{t('analytics')}</h2>
              <p className="text-gray-600">{t('analyticsDescription')}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">{t('feedback')}</h2>
              <p className="text-gray-600">{t('feedbackDescription')}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">{t('settings')}</h2>
              <p className="text-gray-600">{t('settingsDescription')}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">{t('reports')}</h2>
              <p className="text-gray-600">{t('reportsDescription')}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">{t('users')}</h2>
              <p className="text-gray-600 mb-3">{t('usersDescription')}</p>
              {session.user.role === 'ADMIN' && (
                <Link
                  href={`/${locale}/admin/users`}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2"
                >
                  User management
                </Link>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">{t('integrations')}</h2>
              <p className="text-gray-600">{t('integrationsDescription')}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
