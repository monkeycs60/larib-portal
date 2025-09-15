'use client'
import { useMemo } from 'react'
import { useBestofLoadingStore } from '@/lib/stores/bestof-loading'
import { Loader } from '@/components/ui/loader'
import { useTranslations } from 'next-intl'

export default function TableOverlay() {
  const loading = useBestofLoadingStore((s) => s.loading)
  const t = useTranslations('bestof')
  const classes = useMemo(
    () =>
      `pointer-events-none absolute inset-0 z-10 transition-opacity duration-200 ${
        loading ? 'opacity-100' : 'opacity-0'
      }`,
    [loading]
  )
  return (
    <div aria-hidden={!loading} className={classes}>
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader label={t('loading')} />
      </div>
    </div>
  )
}
