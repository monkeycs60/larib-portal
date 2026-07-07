'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { startOfDay, format, getYear, eachDayOfInterval } from 'date-fns'
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
import { AlertCircle, AlertTriangle, Calendar as CalendarIcon, Info, ChevronLeft, ChevronRight, Send } from 'lucide-react'
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
    approvedLeaveLegend: string
    conflictLegend: string
    overlapTitle: string
    overlapBody: string
  }
  defaultMonthIso: string
  userContext: {
    remainingDays: number
    arrivalDate: string | null
    departureDate: string | null
    locale: 'fr' | 'en'
    frenchHolidays: Record<string, string>
    approvedLeaves: Array<{ startDate: string; endDate: string }>
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

  const approvedLeaveDays = useMemo(() => {
    const days: Date[] = []
    for (const leave of userContext.approvedLeaves) {
      const from = startOfDay(new Date(leave.startDate))
      const to = startOfDay(new Date(leave.endDate))
      if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from > to) continue
      for (const day of eachDayOfInterval({ start: from, end: to })) {
        days.push(day)
      }
    }
    return days
  }, [userContext.approvedLeaves])

  const selectedDayKeys = useMemo(() => {
    const keys = new Set<string>()
    if (selectedRange?.from) {
      const from = startOfDay(selectedRange.from)
      const to = startOfDay(selectedRange.to ?? selectedRange.from)
      for (const day of eachDayOfInterval({ start: from, end: to })) {
        keys.add(format(day, 'yyyy-MM-dd'))
      }
    }
    return keys
  }, [selectedRange])

  const approvedLeaveMarkerDays = useMemo(
    () => approvedLeaveDays.filter((day) => !selectedDayKeys.has(format(day, 'yyyy-MM-dd'))),
    [approvedLeaveDays, selectedDayKeys]
  )

  const conflictDays = useMemo(
    () =>
      approvedLeaveDays
        .filter((day) => selectedDayKeys.has(format(day, 'yyyy-MM-dd')))
        .sort((left, right) => left.getTime() - right.getTime()),
    [approvedLeaveDays, selectedDayKeys]
  )

  const hasConflict = conflictDays.length > 0

  const conflictLabel = useMemo(
    () => conflictDays.map((day) => format(day, 'd MMM yyyy', { locale: dateLocale })).join(', '),
    [conflictDays, dateLocale]
  )

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
            {hasConflict && (
              <div className='flex items-start gap-3 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3'>
                <AlertTriangle className='h-5 w-5 shrink-0 text-danger-600 mt-0.5' />
                <div>
                  <p className='text-sm font-semibold text-danger-700'>{translations.overlapTitle}</p>
                  <p className='text-sm text-danger-600 mt-0.5'>{translations.overlapBody.replace('{dates}', conflictLabel)}</p>
                </div>
              </div>
            )}
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

          <div className='mt-6'>
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
              approvedLeave: approvedLeaveMarkerDays,
              conflict: conflictDays,
            }}
            modifiersClassNames={{
              holiday: 'holiday-day',
              approvedLeave: 'approved-leave-day',
              conflict: 'conflict-day',
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
          </div>

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
            .approved-leave-day {
              background-image: repeating-linear-gradient(
                45deg,
                #e2e8f0 0,
                #e2e8f0 3px,
                #f1f5f9 3px,
                #f1f5f9 6px
              );
              color: var(--color-text-secondary);
            }
            .conflict-day {
              box-shadow: inset 0 0 0 2px var(--color-danger-500);
              border-radius: 0.375rem;
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
                <span className='inline-flex items-center gap-1.5'>
                  <span
                    className='h-2.5 w-3.5 rounded-sm border border-gray-200'
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, #e2e8f0 0, #e2e8f0 2px, #f1f5f9 2px, #f1f5f9 4px)' }}
                  />
                  {translations.approvedLeaveLegend}
                </span>
                <span className='inline-flex items-center gap-1.5'>
                  <span className='h-2.5 w-2.5 rounded-sm border-2 border-danger-500' />
                  {translations.conflictLegend}
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
                  hasConflict ||
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
