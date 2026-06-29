'use client'

import { Link, usePathname } from '@/app/i18n/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { LayoutDashboard, GraduationCap, CalendarDays, Users, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const applications = user.applications ?? []
  const isAdmin = user.role === 'ADMIN'

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
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-navy-700 text-white">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-6 w-9 items-start justify-center overflow-hidden">
          <Image
            src="/logo-app.png"
            alt="Larib Portal logo"
            width={36}
            height={36}
            className="brightness-0 invert"
          />
        </div>
        <span className="text-sm font-semibold uppercase tracking-wider">{t('appName')}</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.heading}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-navy-300">
              {section.heading}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-navy-600 text-white before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-coral-500'
                          : 'text-navy-100 hover:bg-navy-600 hover:text-white'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', active ? 'text-coral-400' : 'text-navy-200')} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
