import { requireAuth } from '@/lib/auth-guard'
import { Link } from '@/app/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { formatUserName } from '@/lib/format-user-name'
import { generatePersonalizedGreeting } from '@/lib/services/greeting-generator'
import * as motion from "framer-motion/client"
import { ArrowRight } from 'lucide-react'

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

  const personalizedGreeting = generatePersonalizedGreeting(userName, locale)

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
              {personalizedGreeting}.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-8 pb-32">
        <div className="space-y-24">
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
