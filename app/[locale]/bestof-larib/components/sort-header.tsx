"use client"
import { usePathname, useRouter } from '@/app/i18n/navigation'

export default function SortHeader({ field, label, activeField, direction }: { field: string; label: string; activeField?: string; direction?: 'asc' | 'desc' }) {
  const router = useRouter()
  const pathname = usePathname()
  const isActive = activeField === field
  const nextDir: 'asc' | 'desc' = isActive ? (direction === 'asc' ? 'desc' : 'asc') : 'asc'

  function onClick() {
    const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    current.set('sort', field)
    current.set('dir', nextDir)
    router.push(`${pathname}?${current.toString()}`)
  }

  return (
    <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={onClick} aria-label={`Sort by ${label}`}>
      <span>{label}</span>
      {isActive ? (
        <span className="text-muted-foreground text-xs">{direction === 'asc' ? '▲' : '▼'}</span>
      ) : (
        <span className="text-muted-foreground text-xs">↕</span>
      )}
    </button>
  )
}
