"use client"

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronDown } from 'lucide-react'
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
}

export default function PersonalDifficultyPicker({ value, onChange, disabled, isLoading, menuLabel }: Props) {
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
      colorClass: 'bg-amber-500',
      borderClass: 'border-amber-500/70 bg-amber-50',
      textClass: 'text-amber-700',
      label: t('difficulty.intermediate'),
    },
    {
      value: 'ADVANCED',
      colorClass: 'bg-rose-500',
      borderClass: 'border-rose-500/70 bg-rose-50',
      textClass: 'text-rose-700',
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
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map(option => {
                const isSelected = option.value === value
                return (
                  <CommandItem
                    key={option.value === '' ? 'unset' : option.value}
                    onSelect={() => handleSelect(option.value)}
                    className={cn('flex items-center justify-between gap-2 px-3 py-2')}
                  >
                    <span className={cn('flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium', option.borderClass, option.textClass)}>
                      <span className={cn('h-2.5 w-2.5 rounded-full', option.colorClass)} />
                      <span>{option.label}</span>
                    </span>
                    <Check className={cn('size-4 transition-opacity', isSelected ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
