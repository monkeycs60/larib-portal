import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-wrap items-end gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-56" />
          </div>
        ))}
        <div className="ml-auto">
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="grid grid-cols-8 gap-4 p-3 border-b bg-muted/30">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
        <div>
          {Array.from({ length: 8 }).map((_, r) => (
            <div key={r} className="grid grid-cols-8 gap-4 p-3 border-b">
              {Array.from({ length: 8 }).map((__, c) => (
                <Skeleton key={c} className="h-4 w-24" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

