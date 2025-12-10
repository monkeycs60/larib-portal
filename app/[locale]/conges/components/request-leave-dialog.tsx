'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { addDays, startOfDay, format, getYear } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar as CalendarIcon, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import { requestLeaveAction } from '../actions'
import { countWorkingDays, getExcludedDaysInfo, getHolidayDatesForCalendar } from '@/lib/services/conges'
import type { DateRange, Matcher } from 'react-day-picker'

type RequestLeaveDialogProps = {
  translations: {
    trigger: string
    title: string
    description: string
    startLabel: string
    endLabel: string
    reasonLabel: string
    optionalHint: string
    submit: string
    cancel: string
    success: string
    overlapError: string
    invalidRange: string
    missingRange: string
    insufficientDays: string
    pastDate: string
    outsideContract: string
    requestedDays: string
    currentRemaining: string
    afterRequest: string
    excludedDays: string
    weekends: string
    holidays: string
    holiday: string
    day: string
    days: string
  }
  defaultMonthIso: string
  userContext: {
    remainingDays: number
    arrivalDate: string | null
    departureDate: string | null
    locale: 'fr' | 'en'
    frenchHolidays: Record<string, string>
  }
}

const formSchema = z.object({
  startDate: z.string().min(1, 'start'),
  endDate: z.string().min(1, 'end'),
  reason: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof formSchema>

function getIso(date: Date | undefined): string | undefined {
  return date ? startOfDay(date).toISOString() : undefined
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export function RequestLeaveDialog({
  translations,
  defaultMonthIso,
  userContext,
}: RequestLeaveDialogProps) {
  const [open, setOpen] = useState(false)

  const defaultMonth = useMemo(() => {
    const parsed = new Date(defaultMonthIso)
    return Number.isNaN(parsed.valueOf()) ? new Date() : parsed
  }, [defaultMonthIso])

  const dateLocale = userContext.locale === 'fr' ? fr : enUS

  const contractDates = useMemo(() => {
    const arrival = userContext.arrivalDate ? new Date(userContext.arrivalDate) : null
    const departure = userContext.departureDate ? new Date(userContext.departureDate) : null
    return { arrival, departure }
  }, [userContext.arrivalDate, userContext.departureDate])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      reason: '',
    },
  })

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined)

  const { execute, isExecuting } = useAction(requestLeaveAction, {
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

      if (error.serverError === 'insufficientDays') {
        toast.error(translations.insufficientDays)
        return
      }

      if (error.serverError === 'pastDate') {
        toast.error(translations.pastDate)
        return
      }

      if (error.serverError === 'outsideContract') {
        toast.error(translations.outsideContract)
        return
      }

      toast.error(error.serverError ?? translations.invalidRange)
    },
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(translations.success)
        form.reset()
        setSelectedRange(undefined)
        setOpen(false)
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
      userContext.frenchHolidays
    )
    const excludedInfo = getExcludedDaysInfo(
      selectedRange.from,
      selectedRange.to,
      userContext.frenchHolidays
    )
    const remainingAfter = userContext.remainingDays - workingDays

    return {
      requestedDays: workingDays,
      currentRemaining: userContext.remainingDays,
      remainingAfter,
      weekendsExcluded: excludedInfo.weekends,
      holidaysExcluded: excludedInfo.holidays,
      isNegative: remainingAfter < 0,
    }
  }, [selectedRange, userContext.remainingDays, userContext.frenchHolidays])

  const contractValidation = useMemo(() => {
    if (!selectedRange?.from) return null

    const start = selectedRange.from
    const end = selectedRange.to ?? selectedRange.from

    if (contractDates.arrival && start < startOfDay(contractDates.arrival)) {
      return {
        isValid: false,
        message: translations.outsideContract,
      }
    }

    if (contractDates.departure && end > startOfDay(contractDates.departure)) {
      return {
        isValid: false,
        message: translations.outsideContract,
      }
    }

    return { isValid: true, message: null }
  }, [selectedRange, contractDates, translations.outsideContract])

  const holidayDates = useMemo(() => {
    const currentYear = getYear(new Date())
    return getHolidayDatesForCalendar(userContext.frenchHolidays, currentYear - 1, currentYear + 2)
  }, [userContext.frenchHolidays])

  const handleSubmit = async (values: FormValues) => {
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

    if (contractValidation && !contractValidation.isValid) {
      toast.error(translations.outsideContract)
      return
    }

    await execute({
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason?.trim() ? values.reason.trim() : undefined,
    })
  }

  const minSelectable = useMemo(() => {
    const today = startOfDay(new Date())
    if (contractDates.arrival && contractDates.arrival > today) {
      return contractDates.arrival
    }
    return today
  }, [contractDates.arrival])

  const maxSelectable = useMemo(() => {
    return contractDates.departure ?? undefined
  }, [contractDates.departure])

  const disabledDays = useMemo((): Matcher[] => {
    const matchers: Matcher[] = [{ before: minSelectable }]
    if (maxSelectable) {
      matchers.push({ after: maxSelectable })
    }
    return matchers
  }, [minSelectable, maxSelectable])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{translations.trigger}</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
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
                {selectedRange?.to ? format(selectedRange.to, 'PPP', { locale: dateLocale }) : '—'}
              </div>
            </div>
          </div>

          <DayPicker
            mode='range'
            numberOfMonths={2}
            defaultMonth={defaultMonth}
            selected={selectedRange}
            onSelect={(range) => {
              setSelectedRange(range)
              const startIso = getIso(range?.from)
              const endIso = getIso(range?.to ?? (range?.from ? addDays(range.from, 0) : undefined))
              form.setValue('startDate', startIso ?? '')
              form.setValue('endDate', endIso ?? '')
            }}
            locale={dateLocale}
            disabled={disabledDays}
            modifiers={{
              holiday: holidayDates,
            }}
            modifiersClassNames={{
              holiday: 'holiday-day',
            }}
            classNames={{
              months: 'flex flex-col sm:flex-row gap-4 w-full',
              month: 'flex-1',
              month_caption: 'flex justify-center pt-1 relative items-center mb-4',
              caption_label: 'text-sm font-medium',
              nav: 'flex items-center gap-1',
              button_previous:
                'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent',
              button_next:
                'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday: 'text-muted-foreground rounded-md w-full font-normal text-[0.8rem] flex-1 text-center',
              week: 'flex w-full mt-2',
              day: 'flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
              day_button:
                'h-9 w-full p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded-md inline-flex items-center justify-center',
              selected:
                'bg-amber-500 text-white hover:bg-amber-600 hover:text-white focus:bg-amber-500 focus:text-white rounded-md',
              range_start:
                'bg-amber-500 text-white hover:bg-amber-600 hover:text-white rounded-l-md rounded-r-none',
              range_end:
                'bg-amber-500 text-white hover:bg-amber-600 hover:text-white rounded-r-md rounded-l-none',
              range_middle:
                'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 rounded-none',
              today: 'ring-1 ring-primary rounded-md font-semibold',
              outside: 'text-muted-foreground/40 aria-selected:bg-amber-100/50',
              disabled: 'text-muted-foreground/30 cursor-not-allowed',
              hidden: 'invisible',
            }}
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
              background-color: rgb(249 115 22);
            }
          `}</style>

          {leaveCalculation && (
            <div className='space-y-3'>
              <div className='grid grid-cols-3 gap-3'>
                <div className='rounded-lg border bg-card p-3 text-center'>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {translations.requestedDays}
                  </div>
                  <div className='text-2xl font-semibold text-primary'>
                    {leaveCalculation.requestedDays}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {pluralize(leaveCalculation.requestedDays, translations.day, translations.days)}
                  </div>
                </div>
                <div className='rounded-lg border bg-card p-3 text-center'>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {translations.currentRemaining}
                  </div>
                  <div className='text-2xl font-semibold'>
                    {leaveCalculation.currentRemaining}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {pluralize(leaveCalculation.currentRemaining, translations.day, translations.days)}
                  </div>
                </div>
                <div className='rounded-lg border bg-card p-3 text-center'>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {translations.afterRequest}
                  </div>
                  <div
                    className={`text-2xl font-semibold ${
                      leaveCalculation.isNegative ? 'text-destructive' : 'text-green-600'
                    }`}
                  >
                    {leaveCalculation.remainingAfter}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {pluralize(Math.abs(leaveCalculation.remainingAfter), translations.day, translations.days)}
                  </div>
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
                        {leaveCalculation.weekendsExcluded} {translations.weekends}
                      </Badge>
                    )}
                    {leaveCalculation.holidaysExcluded.map((holiday) => (
                      <Badge
                        key={holiday.date.toISOString()}
                        variant='outline'
                        className='bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                      >
                        <CalendarIcon className='h-3 w-3 mr-1' />
                        {format(holiday.date, 'd MMM', { locale: dateLocale })} - {holiday.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {leaveCalculation.isNegative && (
                <Alert variant='destructive'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>{translations.insufficientDays}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {contractValidation && !contractValidation.isValid && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{contractValidation.message}</AlertDescription>
            </Alert>
          )}

          <div className='space-y-2'>
            <Label htmlFor='reason'>{translations.reasonLabel}</Label>
            <Textarea
              id='reason'
              placeholder={translations.optionalHint}
              maxLength={500}
              disabled={isExecuting}
              {...form.register('reason')}
            />
          </div>

          <DialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                form.reset()
                setSelectedRange(undefined)
                setOpen(false)
              }}
            >
              {translations.cancel}
            </Button>
            <Button
              type='submit'
              disabled={
                isExecuting ||
                Boolean(leaveCalculation?.isNegative) ||
                Boolean(contractValidation && !contractValidation.isValid)
              }
            >
              {translations.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
