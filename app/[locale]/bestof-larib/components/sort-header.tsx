"use client"
import { usePathname, useRouter } from '@/app/i18n/navigation'

export default function SortHeader({ field, label }: { field: string; label: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const current = params.get('sort')
  const dir = params.get('dir') as 'asc' | 'desc' | null
  const isActive = current === field
  const nextDir: 'asc' | 'desc' = !isActive ? 'asc' : dir === 'asc' ? 'desc' : 'asc'

  function onClick() {
    const next = new URLSearchParams(params)
    next.set('sort', field)
    next.set('dir', nextDir)
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={onClick} aria-label={`Sort by ${label}`}>
      <span>{label}</span>
      {isActive ? (
        <span className="text-muted-foreground text-xs">{dir === 'asc' ? '▲' : '▼'}</span>
      ) : (
        <span className="text-muted-foreground text-xs">↕</span>
      )}
    </button>
  )
}

