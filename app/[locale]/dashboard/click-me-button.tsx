'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export function ClickMeButton() {
  const t = useTranslations('dashboard')

  function handleClick() {
    console.log('click me')
  }

  return (
    <Button onClick={handleClick} data-testid="click-me-button">
      {t('clickMe')}
    </Button>
  )
}
