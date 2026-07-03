'use client'

import { useState } from 'react'
import { Link, usePathname } from '@/app/i18n/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { LayoutDashboard, GraduationCap, CalendarDays, Users, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isSuperAdmin } from '@/lib/permissions'

type SidebarUser = {
  role?: 'ADMIN' | 'USER'
  applications?: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'> | null
}

type SidebarItem = {
  href: string
  label: string
  icon: LucideIcon
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
  const [collapsed, setCollapsed] = useState(false)

  const applications = user.applications ?? []
  const isAdmin = isSuperAdmin(user)

  const applicationItems: SidebarItem[] = []
  if (applications.includes('BESTOF_LARIB')) {
    applicationItems.push({ href: '/bestof-larib', label: tAdmin('app_BESTOF_LARIB'), icon: GraduationCap })
  }
  if (applications.includes('CONGES')) {
    applicationItems.push({ href: '/conges', label: tAdmin('app_CONGES'), icon: CalendarDays })
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

  if (isAdmin) {
    sections.push({
      heading: t('sectionAdministration'),
      items: [{ href: '/admin/users', label: tAdmin('usersNav'), icon: Users }],
    })
  }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col bg-navy-700 text-white transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-2 py-5 text-center',
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
      </div>

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
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
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
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-navy-600 p-3">
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
    </aside>
  )
}
