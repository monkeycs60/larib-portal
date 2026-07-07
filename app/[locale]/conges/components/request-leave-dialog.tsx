'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { startOfDay, format, getYear } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar as CalendarIcon, Info, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { requestLeaveAction } from '../actions'
import { countWorkingDays, getExcludedDaysInfo, getHolidayDatesForCalendar } from '@/lib/services/conges'
import type { DateRange, Matcher } from 'react-day-picker'
import { getIso, pluralize, dayPickerClassNames } from './day-picker-shared'

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
    weekendDays: string
    holidays: string
    holiday: string
    day: string
    days: string
    holidayLegend: string
    datesSection: string
    selectedRangeLegend: string
    optionalTag: string
    footerHint: string
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
      <DialogContent className='sm:max-w-4xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col'>
        <div className='relative bg-bg-surface px-6 py-4'>
          <span className='absolute left-0 top-0 h-full w-1 rounded-l-lg bg-coral-500' />
          <div className='flex items-start gap-3'>
            <div className='rounded-xl bg-coral-50 p-2.5 text-coral-600'>
              <CalendarIcon className='h-5 w-5' />
            </div>
            <DialogHeader className='gap-0.5'>
              <DialogTitle className='text-lg font-bold'>{translations.title}</DialogTitle>
              <DialogDescription className='text-sm text-text-secondary'>{translations.description}</DialogDescription>
            </DialogHeader>
          </div>
        </div>
        <form className='flex flex-1 min-h-0 flex-col' onSubmit={form.handleSubmit(handleSubmit)}>
          <div className='flex-1 overflow-y-auto bg-bg-app px-6 py-5 space-y-4'>
            <section className='rounded-xl border border-line bg-bg-surface p-5'>
              <div className='flex items-center gap-2 mb-4'>
                <span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
                <span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{translations.datesSection}</span>
                <span className='h-px flex-1 bg-line ml-2' />
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-text-primary mb-1.5'>{translations.startLabel}</label>
                  <div className='flex items-center gap-2 rounded-lg border border-line bg-bg-surface px-3 py-2.5 text-sm'>
                    <CalendarIcon className='h-4 w-4 shrink-0 text-text-muted' />
                    <span className={selectedRange?.from ? 'text-text-primary' : 'text-text-muted'}>
                      {selectedRange?.from ? format(selectedRange.from, 'PPP', { locale: dateLocale }) : '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-text-primary mb-1.5'>{translations.endLabel}</label>
                  <div className='flex items-center gap-2 rounded-lg border border-line bg-bg-surface px-3 py-2.5 text-sm'>
                    <CalendarIcon className='h-4 w-4 shrink-0 text-text-muted' />
                    <span className={selectedRange?.to ? 'text-text-primary' : 'text-text-muted'}>
                      {selectedRange?.to ? format(selectedRange.to, 'PPP', { locale: dateLocale }) : '—'}
                    </span>
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
              background-color: var(--color-danger-500);
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

              <div className='mt-4 flex flex-wrap items-center gap-4 text-xs text-text-secondary'>
                <span className='inline-flex items-center gap-1.5'>
                  <span className='h-2 w-2 rounded-full bg-coral-500' />
                  {translations.selectedRangeLegend}
                </span>
                <span className='inline-flex items-center gap-1.5'>
                  <span className='h-2 w-2 rounded-full bg-danger-500 ring-1 ring-white' />
                  {translations.holidayLegend}
                </span>
              </div>
            </section>

          {leaveCalculation && (
            <div className='space-y-3'>
              <div className='grid grid-cols-3 gap-3'>
                <div className='rounded-lg border border-line bg-bg-surface p-3 text-center'>
                  <div className='text-xs text-text-secondary mb-1'>
                    {translations.requestedDays}
                  </div>
                  <div className='text-2xl font-semibold text-primary'>
                    {leaveCalculation.requestedDays}
                  </div>
                  <div className='text-xs text-text-secondary'>
                    {pluralize(leaveCalculation.requestedDays, translations.day, translations.days)}
                  </div>
                </div>
                <div className='rounded-lg border border-line bg-bg-surface p-3 text-center'>
                  <div className='text-xs text-text-secondary mb-1'>
                    {translations.currentRemaining}
                  </div>
                  <div className='text-2xl font-semibold'>
                    {leaveCalculation.currentRemaining}
                  </div>
                  <div className='text-xs text-text-secondary'>
                    {pluralize(leaveCalculation.currentRemaining, translations.day, translations.days)}
                  </div>
                </div>
                <div className='rounded-lg border border-line bg-bg-surface p-3 text-center'>
                  <div className='text-xs text-text-secondary mb-1'>
                    {translations.afterRequest}
                  </div>
                  <div
                    className={`text-2xl font-semibold ${
                      leaveCalculation.isNegative ? 'text-danger-600' : 'text-success-600'
                    }`}
                  >
                    {leaveCalculation.remainingAfter}
                  </div>
                  <div className='text-xs text-text-secondary'>
                    {pluralize(Math.abs(leaveCalculation.remainingAfter), translations.day, translations.days)}
                  </div>
                </div>
              </div>

              {(leaveCalculation.weekendsExcluded > 0 ||
                leaveCalculation.holidaysExcluded.length > 0) && (
                <div className='rounded-lg border bg-muted/30 p-3'>
                  <div className='flex items-center gap-2 text-sm text-text-secondary mb-2'>
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
                        className='bg-coral-50 border-coral-200'
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

            <section className='rounded-xl border border-line bg-bg-surface p-5'>
              <div className='flex items-center gap-2 mb-4'>
                <span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
                <span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{translations.reasonLabel}</span>
                <span className='text-xs text-text-muted'>{translations.optionalTag}</span>
                <span className='h-px flex-1 bg-line ml-2' />
              </div>
              <Textarea
                id='reason'
                placeholder={translations.optionalHint}
                maxLength={500}
                rows={4}
                disabled={isExecuting}
                {...form.register('reason')}
              />
            </section>
          </div>

          <div className='flex items-center justify-between gap-3 border-t border-line bg-bg-surface px-6 py-4'>
            <div>
              {!selectedRange?.to ? (
                <span className='flex items-center gap-2 text-sm text-text-muted'>
                  <span className='h-1.5 w-1.5 rounded-full bg-warn-500' />
                  {translations.footerHint}
                </span>
              ) : null}
            </div>
            <div className='flex items-center gap-3'>
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
                <Send className='size-4' />
                {translations.submit}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
