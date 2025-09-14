import { cn } from '@/lib/utils'

type LoaderProps = {
  label?: string
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  className?: string
}

export function Loader({ label, size = 'md', full = false, className }: LoaderProps) {
  const sizePx = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3',
        full ? 'h-full w-full' : undefined,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          'rounded-full animate-spin border-2 border-muted-foreground/30 border-t-primary',
          sizePx,
          'shadow-[0_0_0_1px_rgba(0,0,0,0.02)]',
        )}
      />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
    </div>
  )
}

