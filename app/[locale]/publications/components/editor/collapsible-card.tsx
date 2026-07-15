'use client'

import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CollapsibleCard({
  title,
  actions,
  children,
}: {
  title: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">{title}</div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Collapse section"
            aria-expanded={open}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-muted transition hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <ChevronUp className={cn('h-4 w-4 transition-transform', !open && 'rotate-180')} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
