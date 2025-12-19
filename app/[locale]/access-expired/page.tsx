import { getTranslations } from 'next-intl/server';
import { getTypedSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { getUserStatusById, getUserDepartureDate } from '@/lib/services/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default async function AccessExpiredPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getTypedSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const status = await getUserStatusById(session.user.id);
  if (status !== 'INACTIVE') {
    redirect(`/${locale}/dashboard`);
  }

  const departureDate = await getUserDepartureDate(session.user.id);
  const t = await getTranslations({ locale, namespace: 'accessExpired' });

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">{t('description')}</p>
          {departureDate && (
            <p className="text-sm text-muted-foreground">
              {t('expiredOn', { date: departureDate.toISOString().slice(0, 10) })}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{t('contactAdmin')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
