'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format, startOfDay, getYear } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Calendar as CalendarIcon,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { adminUpdateLeaveAction } from '../actions'
import {
  countWorkingDays,
  getExcludedDaysInfo,
  getHolidayDatesForCalendar,
} from '@/lib/services/conges'
import type { DateRange, Matcher } from 'react-day-picker'
import { getIso, pluralize, dayPickerClassNames } from './day-picker-shared'

export type AdminEditLeaveEntry = {
  id: string
  startDate: string
  endDate: string
  reason: string | null
  dayCount: number
}

export type AdminEditLeaveDialogTranslations = {
  title: string
  description: string
  submit: string
  cancel: string
  editSuccess: string
  editError: string
  overlapError: string
  invalidRange: string
  missingRange: string
  startLabel: string
  endLabel: string
  reasonLabel: string
  optionalHint: string
  requestedDays: string
  excludedDays: string
  weekendDays: string
  holidays: string
  holiday: string
  day: string
  days: string
  holidayLegend: string
}

type AdminEditLeaveDialogProps = {
  entry: AdminEditLeaveEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  translations: AdminEditLeaveDialogTranslations
  locale: 'fr' | 'en'
  frenchHolidays: Record<string, string>
}

const adminEditFormSchema = z.object({
  startDate: z.string().min(1, 'start'),
  endDate: z.string().min(1, 'end'),
  reason: z.string().max(500).optional(),
})

type AdminEditFormValues = z.infer<typeof adminEditFormSchema>

export function AdminEditLeaveDialog({
  entry,
  open,
  onOpenChange,
  translations,
  locale,
  frenchHolidays,
}: AdminEditLeaveDialogProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    entry
      ? { from: new Date(entry.startDate), to: new Date(entry.endDate) }
      : undefined
  )

  const dateLocale = locale === 'fr' ? fr : enUS

  const form = useForm<AdminEditFormValues>({
    resolver: zodResolver(adminEditFormSchema),
    defaultValues: {
      startDate: entry ? startOfDay(new Date(entry.startDate)).toISOString() : '',
      endDate: entry ? startOfDay(new Date(entry.endDate)).toISOString() : '',
      reason: entry?.reason ?? '',
    },
  })

  const { execute: executeUpdate, isExecuting: isUpdating } = useAction(adminUpdateLeaveAction, {
    onError: ({ error }) => {
      if (error.serverError === 'leaveOverlap') {
        toast.error(translations.overlapError)
        return
      }

      const validationErrors = error.validationErrors as
        | { fieldErrors?: { endDate?: unknown } }
        | undefined
      if (validationErrors?.fieldErrors?.endDate) {
        toast.error(translations.invalidRange)
        return
      }

      toast.error(error.serverError ?? translations.editError)
    },
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(translations.editSuccess)
        form.reset()
        setSelectedRange(undefined)
        onOpenChange(false)
      }
    },
  })

  const leaveCalculation = useMemo(() => {
    if (!selectedRange?.from || !selectedRange?.to) {
      return null
    }

    const workingDays = countWorkingDays(
      selectedRange.from,
      selectedRange.to,
      frenchHolidays
    )
    const excludedInfo = getExcludedDaysInfo(
      selectedRange.from,
      selectedRange.to,
      frenchHolidays
    )

    return {
      requestedDays: workingDays,
      weekendsExcluded: excludedInfo.weekends,
      holidaysExcluded: excludedInfo.holidays,
    }
  }, [selectedRange, frenchHolidays])

  const holidayDates = useMemo(() => {
    const currentYear = getYear(new Date())
    return getHolidayDatesForCalendar(frenchHolidays, currentYear - 1, currentYear + 2)
  }, [frenchHolidays])

  const disabledDays = useMemo((): Matcher[] => {
    return [{ dayOfWeek: [0, 6] }]
  }, [])

  const handleClose = () => {
    form.reset()
    setSelectedRange(undefined)
    onOpenChange(false)
  }

  const handleSubmit = async (values: AdminEditFormValues) => {
    if (!entry) return

    if (!values.startDate || !values.endDate) {
      toast.error(translations.missingRange)
      return
    }

    const start = new Date(values.startDate)
    const end = new Date(values.endDate)

    if (start > end) {
      toast.error(translations.invalidRange)
      return
    }

    await executeUpdate({
      requestId: entry.id,
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason?.trim() ? values.reason.trim() : undefined,
    })
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && entry) {
      const startDate = new Date(entry.startDate)
      const endDate = new Date(entry.endDate)
      setSelectedRange({ from: startDate, to: endDate })
      form.reset({
        startDate: startOfDay(startDate).toISOString(),
        endDate: startOfDay(endDate).toISOString(),
        reason: entry.reason ?? '',
      })
    }
    if (!isOpen) {
      handleClose()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-5xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{translations.title}</DialogTitle>
          <DialogDescription>{translations.description}</DialogDescription>
        </DialogHeader>
        <form className='grid gap-6' onSubmit={form.handleSubmit(handleSubmit)}>
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>{translations.startLabel}</Label>
              <div className='rounded-md border bg-muted/30 p-2 text-sm'>
                {selectedRange?.from
                  ? format(selectedRange.from, 'PPP', { locale: dateLocale })
                  : '—'}
              </div>
            </div>
            <div className='space-y-2'>
              <Label>{translations.endLabel}</Label>
              <div className='rounded-md border bg-muted/30 p-2 text-sm'>
                {selectedRange?.to
                  ? format(selectedRange.to, 'PPP', { locale: dateLocale })
                  : '—'}
              </div>
            </div>
          </div>

          <DayPicker
            mode='range'
            numberOfMonths={2}
            defaultMonth={entry ? new Date(entry.startDate) : new Date()}
            selected={selectedRange}
            onSelect={(range) => {
              setSelectedRange(range)
              const startIso = getIso(range?.from)
              const endIso = getIso(range?.to ?? range?.from)
              form.setValue('startDate', startIso ?? '')
              form.setValue('endDate', endIso ?? '')
            }}
            locale={dateLocale}
            weekStartsOn={1}
            disabled={disabledDays}
            modifiers={{
              holiday: holidayDates,
            }}
            modifiersClassNames={{
              holiday: 'holiday-day',
            }}
            classNames={dayPickerClassNames}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? (
                  <ChevronLeft className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                ),
            }}
          />

          <style jsx global>{`
            .holiday-day {
              position: relative;
            }
            .holiday-day::after {
              content: '';
              position: absolute;
              top: 2px;
              right: 2px;
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background-color: rgb(220 38 38);
              box-shadow: 0 0 0 1px white;
            }
            .day-range-start.day-range-end {
              border-radius: 0.375rem !important;
            }
            .day-range-start:not(.day-range-end) {
              border-top-right-radius: 0 !important;
              border-bottom-right-radius: 0 !important;
            }
            .day-range-end:not(.day-range-start) {
              border-top-left-radius: 0 !important;
              border-bottom-left-radius: 0 !important;
            }
          `}</style>

          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span
              className='inline-block h-2 w-2 rounded-full'
              style={{ backgroundColor: 'rgb(220 38 38)', boxShadow: '0 0 0 1px white' }}
            />
            {translations.holidayLegend}
          </div>

          {leaveCalculation && (
            <div className='space-y-3'>
              <div className='rounded-lg border bg-card p-3 text-center inline-block'>
                <div className='text-xs text-muted-foreground mb-1'>
                  {translations.requestedDays}
                </div>
                <div className='text-2xl font-semibold text-primary'>
                  {leaveCalculation.requestedDays}
                </div>
                <div className='text-xs text-muted-foreground'>
                  {pluralize(
                    leaveCalculation.requestedDays,
                    translations.day,
                    translations.days
                  )}
                </div>
              </div>

              {(leaveCalculation.weekendsExcluded > 0 ||
                leaveCalculation.holidaysExcluded.length > 0) && (
                <div className='rounded-lg border bg-muted/30 p-3'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground mb-2'>
                    <Info className='h-4 w-4' />
                    {translations.excludedDays}
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {leaveCalculation.weekendsExcluded > 0 && (
                      <Badge variant='secondary'>
                        {leaveCalculation.weekendsExcluded} {translations.weekendDays}
                      </Badge>
                    )}
                    {leaveCalculation.holidaysExcluded.map((holiday) => (
                      <Badge
                        key={holiday.date.toISOString()}
                        variant='outline'
                        className='bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                      >
                        <CalendarIcon className='h-3 w-3 mr-1' />
                        {format(holiday.date, 'd MMM', { locale: dateLocale })} - {holiday.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className='space-y-2'>
            <Label htmlFor='admin-edit-reason'>{translations.reasonLabel}</Label>
            <Textarea
              id='admin-edit-reason'
              placeholder={translations.optionalHint}
              maxLength={500}
              disabled={isUpdating}
              {...form.register('reason')}
            />
          </div>

          <DialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
            <Button type='button' variant='outline' onClick={handleClose}>
              {translations.cancel}
            </Button>
            <Button type='submit' disabled={isUpdating}>
              {translations.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
