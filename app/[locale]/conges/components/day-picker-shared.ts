import { startOfDay } from 'date-fns'

export function getIso(date: Date | undefined): string | undefined {
  return date ? startOfDay(date).toISOString() : undefined
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export const dayPickerClassNames = {
  root: 'w-full relative',
  months: 'flex flex-col sm:flex-row gap-8 w-full justify-center',
  month: 'flex-1 max-w-sm',
  month_caption: 'flex justify-center pt-1 relative items-center mb-4',
  caption_label: 'text-sm font-medium',
  nav: 'absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 pointer-events-none',
  button_previous:
    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-line hover:bg-gray-100 pointer-events-auto',
  button_next:
    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-line hover:bg-gray-100 pointer-events-auto',
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday:
    'text-text-secondary rounded-md w-full font-normal text-[0.8rem] flex-1 text-center',
  week: 'flex w-full mt-2',
  day: 'flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
  day_button:
    'h-9 w-full p-0 font-normal hover:bg-gray-100 hover:text-gray-900 rounded-md inline-flex items-center justify-center',
  selected:
    'bg-coral-600 text-white hover:bg-coral-700 hover:text-white focus:bg-coral-600 focus:text-white rounded-md',
  range_start:
    'day-range-start bg-coral-600 text-white hover:bg-coral-700 rounded-l-md',
  range_end:
    'day-range-end bg-coral-600 text-white hover:bg-coral-700 rounded-r-md',
  range_middle:
    'bg-coral-50 text-coral-700 rounded-none',
  today: 'ring-1 ring-coral-500 rounded-md font-semibold',
  outside: 'text-text-secondary/40 aria-selected:bg-coral-50',
  disabled: 'text-text-secondary/30 cursor-not-allowed',
  hidden: 'invisible',
} as const
