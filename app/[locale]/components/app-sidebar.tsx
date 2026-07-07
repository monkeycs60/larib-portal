'use client'

import { useMemo, useState } from 'react'
import { Link, usePathname, useRouter } from '@/app/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  Globe,
  LogOut,
  Pencil,
  ChevronUp,
  Check,
  BookOpen,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isSuperAdmin, accessibleApplications, canAdminApp } from '@/lib/permissions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { applicationLink } from '@/lib/application-link'

type SidebarUser = {
  email: string
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  profilePhoto?: string | null
  image?: string | null
  position?: string | null
  role?: 'ADMIN' | 'USER'
  applications?: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB' | 'PUBLICATIONS'> | null
  adminApplications?: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB' | 'PUBLICATIONS'> | null
}

type SidebarItem = {
  href: string
  label: string
  icon: LucideIcon
  adminBadge?: boolean
}

type SidebarSection = {
  heading: string
  items: SidebarItem[]
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const t = useTranslations('navigation')
  const tDashboard = useTranslations('dashboard')
  const tAdmin = useTranslations('admin')
  const pathname = usePathname()
  const locale = useLocale()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const accessible = accessibleApplications(user)
  const isAdmin = isSuperAdmin(user)

  const displayName = useMemo(() => user.firstName ?? user.name ?? user.email, [user])

  const initials = useMemo(() => {
    const pick = (value: string) => (value?.trim()?.charAt(0) ?? '').toUpperCase()
    const first = user.firstName ?? user.name ?? user.email
    const last = user.lastName ?? ''
    return `${pick(first)}${pick(last)}` || pick(user.email)
  }, [user])

  const avatarSrc = user.profilePhoto ?? user.image ?? undefined

  const roleSubtitle = user.position || (isSuperAdmin(user) ? t('roleAdministrator') : t('roleMember'))

  const setLocale = (target: 'en' | 'fr') => {
    if (target === locale) return
    const currentPath = window.location.pathname.replace(`/${locale}`, '')
    router.push(currentPath || '/', { locale: target })
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

  const applicationItems: SidebarItem[] = []
  if (accessible.includes('BESTOF_LARIB')) {
    applicationItems.push({ href: '/bestof-larib', label: tAdmin('app_BESTOF_LARIB'), icon: GraduationCap })
  }
  if (accessible.includes('CONGES')) {
    applicationItems.push({ href: '/conges', label: tAdmin('app_CONGES'), icon: CalendarDays })
  }
  if (accessible.includes('PUBLICATIONS')) {
    applicationItems.push({ href: '/publications', label: tAdmin('app_PUBLICATIONS'), icon: BookOpen })
  }

  const sections: SidebarSection[] = [
    {
      heading: t('sectionOverview'),
      items: [{ href: '/dashboard', label: tDashboard('title'), icon: LayoutDashboard }],
    },
  ]

  if (applicationItems.length > 0) {
    sections.push({ heading: t('sectionApplications'), items: applicationItems })
  }

  const adminItems: SidebarItem[] = []
  if (accessible.includes('BESTOF_LARIB') && canAdminApp(user, 'BESTOF_LARIB')) {
    adminItems.push({ href: '/bestof-larib/admin', label: tAdmin('app_BESTOF_LARIB'), icon: GraduationCap, adminBadge: true })
  }
  if (accessible.includes('CONGES') && canAdminApp(user, 'CONGES')) {
    adminItems.push({ href: '/conges/admin', label: tAdmin('app_CONGES'), icon: CalendarDays, adminBadge: true })
  }
  if (isAdmin) {
    adminItems.push({ href: '/admin/users', label: tAdmin('usersNav'), icon: Users })
  }

  if (adminItems.length > 0) {
    sections.push({ heading: t('sectionAdministration'), items: adminItems })
  }

  const activeHref = sections
    .flatMap((section) => section.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((left, right) => right.length - left.length)[0]

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col bg-navy-700 text-white transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <Link
        href="/dashboard"
        aria-label={t('appName')}
        className={cn(
          'flex flex-col items-center gap-2 py-5 text-center transition-opacity hover:opacity-80',
          collapsed ? 'px-2' : 'px-6'
        )}
      >
        <div className="flex h-9 w-[72px] items-start justify-center overflow-hidden">
          <Image
            src="/logo-app.png"
            alt="Larib Portal logo"
            width={72}
            height={72}
            className="brightness-0 invert"
          />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold uppercase tracking-wider">{t('appName')}</span>
        )}
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.heading}>
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-navy-300">
                {section.heading}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = item.href === activeHref
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
                        collapsed ? 'justify-center px-2' : 'px-3',
                        active
                          ? 'bg-navy-600 text-white before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-coral-500'
                          : 'text-navy-100 hover:bg-navy-600 hover:text-white'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-coral-400' : 'text-navy-200')} />
                      {!collapsed && (
                        <span className="flex flex-1 items-center gap-1.5">
                          {item.label}
                          {item.adminBadge && <Shield className="h-3.5 w-3.5 shrink-0 text-coral-400" />}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-navy-600 p-3">
        <div className="space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={t('language')}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium text-navy-100 transition-colors hover:bg-navy-600 hover:text-white cursor-pointer',
                  collapsed ? 'justify-center px-2' : 'px-3'
                )}
              >
                <Globe className="h-4 w-4 shrink-0 text-navy-200" />
                {!collapsed && (
                  <>
                    <span>{t('language')}</span>
                    <span className="ml-auto text-navy-200">{locale === 'en' ? 'EN' : 'FR'}</span>
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
              <DropdownMenuItem onSelect={() => setLocale('en')}>
                <Check className={cn('mr-2 size-4', locale === 'en' ? 'opacity-100' : 'opacity-0')} />
                English
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocale('fr')}>
                <Check className={cn('mr-2 size-4', locale === 'fr' ? 'opacity-100' : 'opacity-0')} />
                Français
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg bg-navy-600 py-2 text-left transition-colors hover:bg-navy-500 cursor-pointer',
                  collapsed ? 'justify-center px-2' : 'px-3'
                )}
              >
                <Avatar className="size-8">
                  <AvatarImage src={avatarSrc} alt={displayName} />
                  <AvatarFallback className="bg-coral-500 text-white font-semibold">{initials}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{displayName}</div>
                      <div className="truncate text-xs text-navy-200">{roleSubtitle}</div>
                    </div>
                    <ChevronUp className="h-4 w-4 shrink-0 text-navy-200" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <Pencil className="mr-2 size-4" />
                  {t('editProfile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleLogout}
                disabled={isLoggingOut}
                className="text-danger-600 focus:text-danger-600"
              >
                <LogOut className="mr-2 size-4" />
                {isLoggingOut ? t('loggingOut') : t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => setCollapsed((previous) => !previous)}
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium text-navy-100 transition-colors hover:bg-navy-600 hover:text-white',
              collapsed ? 'justify-center px-2' : 'px-3'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-navy-200" />
            ) : (
              <ChevronLeft className="h-4 w-4 shrink-0 text-navy-200" />
            )}
            {!collapsed && <span>{t('collapseSidebar')}</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
