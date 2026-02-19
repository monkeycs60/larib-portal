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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { updateLeaveAction } from '../actions'
import {
  countWorkingDays,
  getExcludedDaysInfo,
  getHolidayDatesForCalendar,
} from '@/lib/services/conges'
import type { DateRange, Matcher } from 'react-day-picker'
import { getIso, pluralize, dayPickerClassNames } from './day-picker-shared'

export type EditLeaveEntry = {
  id: string
  startDate: string
  endDate: string
  reason: string | null
  dayCount: number
}

export type EditLeaveDialogTranslations = {
  editTitle: string
  editDescription: string
  editSubmit: string
  editSuccess: string
  editError: string
  startLabel: string
  endLabel: string
  reasonLabel: string
  optionalHint: string
  cancelButton: string
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
}

export type EditLeaveUserContext = {
  remainingDays: number
  arrivalDate: string | null
  departureDate: string | null
  locale: 'fr' | 'en'
  frenchHolidays: Record<string, string>
}

type EditLeaveDialogProps = {
  entry: EditLeaveEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  translations: EditLeaveDialogTranslations
  userContext: EditLeaveUserContext
}

const editFormSchema = z.object({
  startDate: z.string().min(1, 'start'),
  endDate: z.string().min(1, 'end'),
  reason: z.string().max(500).optional(),
})

type EditFormValues = z.infer<typeof editFormSchema>

export function EditLeaveDialog({
  entry,
  open,
  onOpenChange,
  translations,
  userContext,
}: EditLeaveDialogProps) {
  const [editSelectedRange, setEditSelectedRange] = useState<DateRange | undefined>(
    entry
      ? { from: new Date(entry.startDate), to: new Date(entry.endDate) }
      : undefined
  )

  const dateLocale = userContext.locale === 'fr' ? fr : enUS

  const contractDates = useMemo(() => {
    const arrival = userContext.arrivalDate ? new Date(userContext.arrivalDate) : null
    const departure = userContext.departureDate ? new Date(userContext.departureDate) : null
    return { arrival, departure }
  }, [userContext.arrivalDate, userContext.departureDate])

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      startDate: entry ? startOfDay(new Date(entry.startDate)).toISOString() : '',
      endDate: entry ? startOfDay(new Date(entry.endDate)).toISOString() : '',
      reason: entry?.reason ?? '',
    },
  })

  const { execute: executeUpdate, isExecuting: isUpdating } = useAction(updateLeaveAction, {
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

      toast.error(error.serverError ?? translations.editError)
    },
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(translations.editSuccess)
        editForm.reset()
        setEditSelectedRange(undefined)
        onOpenChange(false)
      }
    },
  })

  const editLeaveCalculation = useMemo(() => {
    if (!editSelectedRange?.from || !editSelectedRange?.to) {
      return null
    }

    const workingDays = countWorkingDays(
      editSelectedRange.from,
      editSelectedRange.to,
      userContext.frenchHolidays
    )
    const excludedInfo = getExcludedDaysInfo(
      editSelectedRange.from,
      editSelectedRange.to,
      userContext.frenchHolidays
    )

    const originalDayCount = entry?.dayCount ?? 0
    const adjustedRemaining = userContext.remainingDays + originalDayCount
    const remainingAfter = adjustedRemaining - workingDays

    return {
      requestedDays: workingDays,
      currentRemaining: adjustedRemaining,
      remainingAfter,
      weekendsExcluded: excludedInfo.weekends,
      holidaysExcluded: excludedInfo.holidays,
      isNegative: remainingAfter < 0,
    }
  }, [editSelectedRange, userContext.remainingDays, userContext.frenchHolidays, entry?.dayCount])

  const editContractValidation = useMemo(() => {
    if (!editSelectedRange?.from) return null

    const start = editSelectedRange.from
    const end = editSelectedRange.to ?? editSelectedRange.from

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
  }, [editSelectedRange, contractDates, translations.outsideContract])

  const holidayDates = useMemo(() => {
    const currentYear = getYear(new Date())
    return getHolidayDatesForCalendar(userContext.frenchHolidays, currentYear - 1, currentYear + 2)
  }, [userContext.frenchHolidays])

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

  const handleCloseEditDialog = () => {
    editForm.reset()
    setEditSelectedRange(undefined)
    onOpenChange(false)
  }

  const handleEditSubmit = async (values: EditFormValues) => {
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

    if (editContractValidation && !editContractValidation.isValid) {
      toast.error(translations.outsideContract)
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
      setEditSelectedRange({ from: startDate, to: endDate })
      editForm.reset({
        startDate: startOfDay(startDate).toISOString(),
        endDate: startOfDay(endDate).toISOString(),
        reason: entry.reason ?? '',
      })
    }
    if (!isOpen) {
      handleCloseEditDialog()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-5xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{translations.editTitle}</DialogTitle>
          <DialogDescription>{translations.editDescription}</DialogDescription>
        </DialogHeader>
        <form className='grid gap-6' onSubmit={editForm.handleSubmit(handleEditSubmit)}>
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>{translations.startLabel}</Label>
              <div className='rounded-md border bg-muted/30 p-2 text-sm'>
                {editSelectedRange?.from
                  ? format(editSelectedRange.from, 'PPP', { locale: dateLocale })
                  : '—'}
              </div>
            </div>
            <div className='space-y-2'>
              <Label>{translations.endLabel}</Label>
              <div className='rounded-md border bg-muted/30 p-2 text-sm'>
                {editSelectedRange?.to
                  ? format(editSelectedRange.to, 'PPP', { locale: dateLocale })
                  : '—'}
              </div>
            </div>
          </div>

          <DayPicker
            mode='range'
            numberOfMonths={2}
            defaultMonth={entry ? new Date(entry.startDate) : new Date()}
            selected={editSelectedRange}
            onSelect={(range) => {
              setEditSelectedRange(range)
              const startIso = getIso(range?.from)
              const endIso = getIso(range?.to ?? range?.from)
              editForm.setValue('startDate', startIso ?? '')
              editForm.setValue('endDate', endIso ?? '')
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

          {editLeaveCalculation && (
            <div className='space-y-3'>
              <div className='grid grid-cols-3 gap-3'>
                <div className='rounded-lg border bg-card p-3 text-center'>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {translations.requestedDays}
                  </div>
                  <div className='text-2xl font-semibold text-primary'>
                    {editLeaveCalculation.requestedDays}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {pluralize(
                      editLeaveCalculation.requestedDays,
                      translations.day,
                      translations.days
                    )}
                  </div>
                </div>
                <div className='rounded-lg border bg-card p-3 text-center'>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {translations.currentRemaining}
                  </div>
                  <div className='text-2xl font-semibold'>
                    {editLeaveCalculation.currentRemaining}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {pluralize(
                      editLeaveCalculation.currentRemaining,
                      translations.day,
                      translations.days
                    )}
                  </div>
                </div>
                <div className='rounded-lg border bg-card p-3 text-center'>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {translations.afterRequest}
                  </div>
                  <div
                    className={`text-2xl font-semibold ${
                      editLeaveCalculation.isNegative ? 'text-destructive' : 'text-green-600'
                    }`}
                  >
                    {editLeaveCalculation.remainingAfter}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {pluralize(
                      Math.abs(editLeaveCalculation.remainingAfter),
                      translations.day,
                      translations.days
                    )}
                  </div>
                </div>
              </div>

              {(editLeaveCalculation.weekendsExcluded > 0 ||
                editLeaveCalculation.holidaysExcluded.length > 0) && (
                <div className='rounded-lg border bg-muted/30 p-3'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground mb-2'>
                    <Info className='h-4 w-4' />
                    {translations.excludedDays}
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {editLeaveCalculation.weekendsExcluded > 0 && (
                      <Badge variant='secondary'>
                        {editLeaveCalculation.weekendsExcluded} {translations.weekendDays}
                      </Badge>
                    )}
                    {editLeaveCalculation.holidaysExcluded.map((holiday) => (
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

              {editLeaveCalculation.isNegative && (
                <Alert variant='destructive'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>{translations.insufficientDays}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {editContractValidation && !editContractValidation.isValid && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{editContractValidation.message}</AlertDescription>
            </Alert>
          )}

          <div className='space-y-2'>
            <Label htmlFor='edit-reason'>{translations.reasonLabel}</Label>
            <Textarea
              id='edit-reason'
              placeholder={translations.optionalHint}
              maxLength={500}
              disabled={isUpdating}
              {...editForm.register('reason')}
            />
          </div>

          <DialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
            <Button type='button' variant='outline' onClick={handleCloseEditDialog}>
              {translations.cancelButton}
            </Button>
            <Button
              type='submit'
              disabled={
                isUpdating ||
                Boolean(editLeaveCalculation?.isNegative) ||
                Boolean(editContractValidation && !editContractValidation.isValid)
              }
            >
              {translations.editSubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
