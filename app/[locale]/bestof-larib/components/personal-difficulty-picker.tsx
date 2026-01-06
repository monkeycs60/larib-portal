"use client"

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

type DifficultyOption = {
  value: PersonalDifficultyValue
  colorClass: string
  borderClass: string
  textClass: string
  label: string
}

export type PersonalDifficultyValue = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''

type Props = {
  value: PersonalDifficultyValue
  onChange: (value: PersonalDifficultyValue) => void
  disabled?: boolean
  isLoading?: boolean
  menuLabel?: string
  minimal?: boolean
}

export default function PersonalDifficultyPicker({ value, onChange, disabled, isLoading, menuLabel, minimal }: Props) {
  const t = useTranslations('bestof')
  const [open, setOpen] = useState(false)

  const options: DifficultyOption[] = [
    {
      value: '',
      colorClass: 'bg-muted-foreground/20',
      borderClass: 'border-muted-foreground/40',
      textClass: 'text-muted-foreground',
      label: menuLabel ?? t('caseView.difficultyNotSet'),
    },
    {
      value: 'BEGINNER',
      colorClass: 'bg-emerald-500',
      borderClass: 'border-emerald-500/70 bg-emerald-50',
      textClass: 'text-emerald-700',
      label: t('difficulty.beginner'),
    },
    {
      value: 'INTERMEDIATE',
      colorClass: 'bg-rose-500',
      borderClass: 'border-rose-500/70 bg-rose-50',
      textClass: 'text-rose-700',
      label: t('difficulty.intermediate'),
    },
    {
      value: 'ADVANCED',
      colorClass: 'bg-red-500',
      borderClass: 'border-red-500/70 bg-red-50',
      textClass: 'text-red-700',
      label: t('difficulty.advanced'),
    },
  ]

  const current = options.find(option => option.value === value) ?? options[0]
  const isDisabled = disabled || isLoading

  function handleSelect(next: PersonalDifficultyValue) {
    if (isDisabled) return
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={(next) => { if (!isDisabled) setOpen(next) }}>
      <PopoverTrigger asChild>
        {minimal ? (
          <button
            type="button"
            className={cn(
              'h-3.5 w-3.5 rounded-full transition-all hover:scale-110',
              current.colorClass,
              isDisabled && 'opacity-60 cursor-not-allowed'
            )}
            disabled={isDisabled}
            aria-label={current.label}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'h-auto rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              'flex items-center gap-2',
              current.borderClass,
              current.textClass,
              isDisabled && 'opacity-60 cursor-not-allowed'
            )}
            disabled={isDisabled}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className={cn('h-2.5 w-2.5 rounded-full', current.colorClass)} />
              <span>{current.label}</span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex items-center gap-2">
          {options.map(option => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value === '' ? 'unset' : option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'relative h-5 w-5 rounded-full transition-all hover:scale-110',
                  option.colorClass,
                  isSelected && 'ring-2 ring-offset-2 ring-foreground'
                )}
                aria-label={option.label}
                title={option.label}
              />
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
