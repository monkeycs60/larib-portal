import { getTranslations } from 'next-intl/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import { getUserAccountStatus, getUserDepartureDate } from '@/lib/services/users'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CalendarX, LogOut, Mail } from 'lucide-react'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function AccessExpiredPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getTypedSession()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  const accountStatus = await getUserAccountStatus(session.user.id)
  if (accountStatus === 'ACTIVE') {
    redirect(`/${locale}/dashboard`)
  }

  const departureDate = await getUserDepartureDate(session.user.id)
  const t = await getTranslations({ locale, namespace: 'accessExpired' })

  async function handleSignOut() {
    'use server'
    await auth.api.signOut({ headers: await headers() })
    redirect(`/${locale}/login`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <CalendarX className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-red-600">{t('title')}</CardTitle>
            <CardDescription className="mt-2">
              {t('description')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground">
              {t('expiredOn')}:{' '}
              <span className="font-medium text-foreground">
                {departureDate
                  ? new Intl.DateTimeFormat(locale, {
                      dateStyle: 'long',
                    }).format(departureDate)
                  : '—'}
              </span>
            </p>
            <p className="text-muted-foreground mt-2">
              {t('account')}: <span className="font-medium text-foreground">{session.user.email}</span>
            </p>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {t('contactAdmin')}
          </p>

          <div className="flex flex-col gap-3">
            <Button asChild variant="outline">
              <a href="mailto:support@larib-portal.com">
                <Mail className="h-4 w-4 mr-2" />
                {t('contactSupport')}
              </a>
            </Button>
            <form action={handleSignOut}>
              <Button type="submit" variant="ghost" className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                {t('signOut')}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
