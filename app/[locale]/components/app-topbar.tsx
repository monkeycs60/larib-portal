'use client'

import { Link, useRouter } from '@/app/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Globe, LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { applicationLink } from '@/lib/application-link'
import { isSuperAdmin } from '@/lib/permissions'

type TopBarUser = {
  email: string
  name?: string | null
  image?: string | null
  profilePhoto?: string | null
  position?: string | null
  role?: 'ADMIN' | 'USER'
  firstName?: string | null
  lastName?: string | null
}

export function AppTopBar({ user }: { user: TopBarUser }) {
  const t = useTranslations('navigation')
  const tAdmin = useTranslations('admin')
  const locale = useLocale()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const displayName = useMemo(() => user.firstName ?? user.name ?? user.email, [user])

  const initials = useMemo(() => {
    const pick = (value: string) => (value?.trim()?.charAt(0) ?? '').toUpperCase()
    const first = user.firstName ?? user.name ?? user.email
    const last = user.lastName ?? ''
    return `${pick(first)}${pick(last)}` || pick(user.email)
  }, [user])

  const avatarSrc = (user.profilePhoto ?? user.image ?? undefined) as string | undefined

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'fr' : 'en'
    const currentPath = window.location.pathname.replace(`/${locale}`, '')
    router.push(currentPath || '/', { locale: newLocale })
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await authClient.signOut()
      window.location.href = applicationLink(locale, '/')
    } catch (error: unknown) {
      console.error(error)
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-end gap-3 border-b border-line bg-bg-surface px-6">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleLanguage}
        title={locale === 'en' ? 'Switch to French' : 'Passer en anglais'}
      >
        <Globe className="h-4 w-4" />
        {locale === 'en' ? 'EN' : 'FR'}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Account menu"
            className="inline-flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
          >
            <Avatar className="size-9">
              <AvatarImage src={avatarSrc} alt={displayName} />
              <AvatarFallback className="bg-coral-500 font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-start gap-3 py-2">
            <Avatar className="size-10">
              <AvatarImage src={avatarSrc} alt={displayName} />
              <AvatarFallback className="bg-coral-500 font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium text-text-primary">{displayName}</div>
              <div className="truncate text-xs text-text-secondary">{user.email}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {isSuperAdmin(user) && (
                  <Badge variant="default" className="text-[10px]">
                    {tAdmin('roleAdmin')}
                  </Badge>
                )}
                {user.position && (
                  <Badge variant="neutral" className="text-[10px]">
                    {user.position}
                  </Badge>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">{t('profile')}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout} disabled={isLoggingOut}>
            <LogOut className="mr-2 size-4" /> {isLoggingOut ? t('loggingOut') : t('logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
