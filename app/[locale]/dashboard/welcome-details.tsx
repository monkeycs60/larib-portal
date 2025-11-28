'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

interface WelcomeDetailsProps {
  locale: string
}

export function WelcomeDetails({ locale }: WelcomeDetailsProps) {
  const t = useTranslations('dashboard')

  const formattedDate = useMemo(() => {
    const today = new Date()
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(today)
  }, [locale])

  const randomMessage = useMemo(() => {
    const messages = t.raw('welcomeMessages') as string[]
    const randomIndex = Math.floor(Math.random() * messages.length)
    return messages[randomIndex]
  }, [t])

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground font-light">
        {formattedDate}
      </p>
      <p className="text-base text-foreground/80 italic">
        {randomMessage}
      </p>
    </div>
  )
}
