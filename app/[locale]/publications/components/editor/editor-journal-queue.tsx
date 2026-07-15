'use client'

import { useTranslations } from 'next-intl'
import type { JournalTargetItem } from '@/lib/services/publications/journal-targets'
import { CollapsibleCard } from './collapsible-card'

function metricsLine(target: JournalTargetItem): string {
  const parts: string[] = []
  if (target.impactFactor != null) parts.push(`IF ${target.impactFactor}`)
  if (target.sjr != null) parts.push(`SJR ${target.sjr}`)
  return parts.join(' · ')
}

export function EditorJournalQueue({ targets }: { targets: JournalTargetItem[] }) {
  const t = useTranslations('publications')
  return (
    <CollapsibleCard
      title={
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">
          <span className="h-2 w-2 rounded-full bg-coral-500" />
          {t('editor.journalListTitle')}
        </span>
      }
    >
      <p className="text-sm text-text-secondary">{t('editor.journalQueueSubtitle')}</p>

      {targets.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-text-muted">
          {t('editor.journalQueueEmpty')}
        </p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {targets.map((target) => {
            const metrics = metricsLine(target)
            return (
              <li key={target.id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[12px] font-bold text-text-secondary tabular-nums dark:bg-white/10">
                  {target.rank}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold text-text-primary">{target.name}</span>
                  {metrics && <span className="block text-xs text-text-muted">{metrics}</span>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </CollapsibleCard>
  )
}
