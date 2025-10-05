import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function CalendarSkeleton() {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-3 w-24' />
        </div>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-8 w-8 rounded-md' />
          <Skeleton className='h-8 w-8 rounded-md' />
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-7 gap-2'>
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={`weekday-${index}`} className='h-4 w-full' />
          ))}
        </div>
        <div className='grid grid-cols-7 gap-2'>
          {Array.from({ length: 42 }).map((_, index) => (
            <Skeleton key={`day-${index}`} className='h-20 w-full rounded-lg' />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
