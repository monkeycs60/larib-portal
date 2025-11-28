import { requireAuth } from '@/lib/auth-guard'
import { Link } from '@/app/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { formatUserName } from '@/lib/format-user-name'
import { getRandomGreeting } from '@/lib/random-greeting'
import * as motion from "framer-motion/client"
import { ArrowRight, Mail, Briefcase, MapPin, Phone, Shield } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireAuth()
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  const adminT = await getTranslations({ locale, namespace: 'admin' })

  const allApps = (session.user.applications ?? []) as Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'>
  const appOrder: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'> = ['BESTOF_LARIB', 'CONGES', 'CARDIOLARIB']
  const apps = appOrder.filter(app => app !== 'CARDIOLARIB' && allApps.includes(app))

  function appSlug(app: 'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'): string {
    return app === 'BESTOF_LARIB' ? '/bestof-larib' : app === 'CONGES' ? '/conges' : '/cardiolarib'
  }

  function getAppIcon(app: 'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB') {
    switch (app) {
      case 'BESTOF_LARIB':
        return (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Graduation cap */}
            <path d="M24 8L4 18l20 10 20-10L24 8z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M12 23v10c0 2 5.4 5 12 5s12-3 12-5V23" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M40 18v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="40" cy="32" r="2" fill="currentColor"/>
          </svg>
        );
      case 'CONGES':
        return (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M8 20h32" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 8v8M32 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="18" cy="28" r="2" fill="currentColor"/>
            <circle cx="30" cy="28" r="2" fill="currentColor"/>
            <circle cx="18" cy="34" r="2" fill="currentColor"/>
          </svg>
        );
      case 'CARDIOLARIB':
        return (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M24 38s-12-8-12-18c0-5 4-9 8-9 2.5 0 4 1.5 4 1.5s1.5-1.5 4-1.5c4 0 8 4 8 9 0 10-12 18-12 18z" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        );
    }
  }

  const userName = formatUserName({
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    name: session.user.name,
    email: session.user.email
  })

  const greetings = t.raw('greetings') as string[]
  const seed = `${session.user.id}-${new Date().toDateString()}`
  const randomGreeting = getRandomGreeting(greetings, seed)

  function getUserInitials(): string {
    const firstInitial = session.user.firstName?.charAt(0) ?? ''
    const lastInitial = session.user.lastName?.charAt(0) ?? ''
    if (firstInitial || lastInitial) {
      return `${firstInitial}${lastInitial}`.toUpperCase()
    }
    return session.user.email.charAt(0).toUpperCase()
  }

  function getRoleLabel(): string {
    return session.user.role === 'ADMIN' ? t('userInfo.roleAdmin') : t('userInfo.roleUser')
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      {/* Hero Section - Compact & Clean */}
      <div className="relative pt-16 pb-10 px-8">
        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl"
          >
            <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight text-foreground mb-4 leading-[1.1]">
              {t('title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-wide">
              {randomGreeting}, <span className="text-foreground font-normal">{userName}</span>.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-8 pb-32">
        <div className="space-y-24">
          {/* User Profile Info */}
          <section>
            <div className="flex items-center gap-4 mb-12">
              <h2 className="text-lg font-medium tracking-wide text-foreground">
                {t('userInfoSectionTitle')}
              </h2>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative overflow-hidden rounded-[2rem] bg-secondary dark:bg-card p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <Avatar className="w-20 h-20 md:w-24 md:h-24 ring-4 ring-background shadow-lg">
                    {session.user.profilePhoto && (
                      <AvatarImage src={session.user.profilePhoto} alt={userName} />
                    )}
                    <AvatarFallback className="text-2xl md:text-3xl font-medium bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-2xl font-serif font-medium text-foreground mb-1">
                        {userName}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {getRoleLabel()}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('userInfo.email')}</p>
                          <p className="text-foreground">{session.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('userInfo.position')}</p>
                          <p className="text-foreground">{session.user.position ?? t('userInfo.notSpecified')}</p>
                        </div>
                      </div>

                      {session.user.country && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('userInfo.country')}</p>
                            <p className="text-foreground">{session.user.country}</p>
                          </div>
                        </div>
                      )}

                      {session.user.phoneNumber && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('userInfo.phone')}</p>
                            <p className="text-foreground">{session.user.phoneNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Applications */}
          <section>
            <div className="flex items-center gap-4 mb-12">
              <h2 className="text-lg font-medium tracking-wide text-foreground">
                {t('appsSectionTitle')}
              </h2>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {apps.map((app) => (
                <motion.div key={app} variants={item}>
                  <Link href={appSlug(app)} className="block h-full">
                    <div className="group h-full relative overflow-hidden rounded-[2rem] bg-secondary dark:bg-card transition-all duration-500 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1">
                      <div className="absolute top-6 right-6 z-10">
                         <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/50 backdrop-blur-sm text-foreground transition-all duration-500 group-hover:bg-white group-hover:scale-110">
                            <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                         </div>
                      </div>
                      
                      <div className="p-10 h-full flex flex-col">
                        <div className="mb-6">
                          <div className="w-14 h-14 mb-6 text-primary transition-transform duration-500 group-hover:scale-110">
                            {getAppIcon(app)}
                          </div>
                          <h3 className="text-2xl font-serif font-medium text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                            {adminT(`app_${app}`)}
                          </h3>
                          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                            {t(`appDesc_${app}`)}
                          </p>
                        </div>
                        
                        <div className="mt-auto pt-8">
                          <span className="inline-flex items-center text-sm font-medium uppercase tracking-wider text-primary">
                            {t('openApp')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Admin-only section */}
          {session.user.role === 'ADMIN' && (
            <section>
               <div className="flex items-center gap-4 mb-12">
                <h2 className="text-lg font-medium tracking-wide text-foreground">
                  {t('adminSectionTitle')}
                </h2>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div variants={item}>
                  <Link href={'/admin/users'} className="block h-full">
                    <div className="group h-full relative overflow-hidden rounded-[2rem] bg-secondary dark:bg-card transition-all duration-500 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1">
                      <div className="absolute top-6 right-6 z-10">
                         <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/50 backdrop-blur-sm text-foreground transition-all duration-500 group-hover:bg-white group-hover:scale-110">
                            <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                         </div>
                      </div>

                      <div className="p-10 h-full flex flex-col">
                        <div className="mb-6">
                          <div className="w-14 h-14 mb-6 text-primary transition-transform duration-500 group-hover:scale-110">
                            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                              <circle cx="18" cy="16" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
                              <path d="M6 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                              <circle cx="34" cy="18" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
                              <path d="M42 38c0-5.523-4.477-10-10-10-1.5 0-2.9.33-4.17.92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                            </svg>
                          </div>
                          <h3 className="text-2xl font-serif font-medium text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                            {adminT('usersNav')}
                          </h3>
                          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                            {adminT('usersSubtitle')}
                          </p>
                        </div>

                        <div className="mt-auto pt-8">
                          <span className="inline-flex items-center text-sm font-medium uppercase tracking-wider text-primary">
                            {t('openApp')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </motion.div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
