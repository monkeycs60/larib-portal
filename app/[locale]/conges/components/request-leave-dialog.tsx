'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { addDays, startOfDay } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
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
import { requestLeaveAction } from '../actions'

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
  }
  defaultMonthIso: string
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

export function RequestLeaveDialog({ translations, defaultMonthIso }: RequestLeaveDialogProps) {
  const [open, setOpen] = useState(false)

  const defaultMonth = useMemo(() => {
    const parsed = new Date(defaultMonthIso)
    return Number.isNaN(parsed.valueOf()) ? new Date() : parsed
  }, [defaultMonthIso])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      reason: '',
    },
  })

  const [selectedRange, setSelectedRange] = useState<{ from?: Date; to?: Date }>({})

  const { execute, isExecuting } = useAction(requestLeaveAction, {
    onError: ({ error }) => {
      if (error.serverError === 'leaveOverlap') {
        toast.error(translations.overlapError)
        return
      }

      if (error.validationErrors?.fieldErrors?.endDate) {
        toast.error(translations.invalidRange)
        return
      }

      toast.error(error.serverError ?? translations.invalidRange)
    },
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(translations.success)
        form.reset()
        setSelectedRange({})
        setOpen(false)
      }
    },
  })

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

    await execute({
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason?.trim() ? values.reason.trim() : undefined,
    })
  }

  const minSelectable = useMemo(() => startOfDay(new Date()), [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{translations.trigger}</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{translations.title}</DialogTitle>
          <DialogDescription>{translations.description}</DialogDescription>
        </DialogHeader>
        <form
          className='grid gap-6'
          onSubmit={form.handleSubmit(handleSubmit)}>
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>{translations.startLabel}</Label>
              <div className='rounded-md border bg-muted/30 p-2 text-sm'>
                {selectedRange.from ? selectedRange.from.toLocaleDateString() : '—'}
              </div>
            </div>
            <div className='space-y-2'>
              <Label>{translations.endLabel}</Label>
              <div className='rounded-md border bg-muted/30 p-2 text-sm'>
                {selectedRange.to ? selectedRange.to.toLocaleDateString() : '—'}
              </div>
            </div>
          </div>

          <Calendar
            initialFocus
            defaultMonth={defaultMonth}
            mode='range'
            numberOfMonths={2}
            selected={selectedRange}
            onSelect={(range) => {
              setSelectedRange(range ?? {})
              const startIso = getIso(range?.from)
              const endIso = getIso(range?.to ?? (range?.from ? addDays(range.from, 0) : undefined))
              form.setValue('startDate', startIso ?? '')
              form.setValue('endDate', endIso ?? '')
            }}
            disabled={(date) => date < minSelectable}
          />

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
                setSelectedRange({})
                setOpen(false)
              }}
            >
              {translations.cancel}
            </Button>
            <Button type='submit' disabled={isExecuting}>
              {translations.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
