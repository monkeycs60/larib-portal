'use client';
import { cn } from '@/lib/utils'

type ProgressProps = {
  value: number // 0-100
  className?: string
  label?: string
}

export function Progress({ value, className, label }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <div className='mb-1 text-xs text-muted-foreground'>{label}</div>
      ) : null}
      <div
        className='h-2 w-full bg-muted rounded'
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
      >
        <div
          className='h-full bg-primary rounded transition-[width] duration-200'
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

