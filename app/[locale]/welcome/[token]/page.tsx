import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientForm } from './client-form'

export default async function WelcomeSetPasswordPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params
  const t = await getTranslations({ locale, namespace: 'welcome' })

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm token={token} locale={locale} />
        </CardContent>
      </Card>
    </div>
  )
}
