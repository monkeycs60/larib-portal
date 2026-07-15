'use client'

import { useId } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'

// Shared journal picker: a text input backed by a <datalist> of the journal bank
// (searchable suggestions) with a clear button. Used identically in the editor and
// in the My Publications submission history.
export function JournalField({
  value,
  onChange,
  journalNames,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  journalNames: string[]
  placeholder?: string
}) {
  const listId = useId()
  return (
    <div className="relative w-full">
      <datalist id={listId}>
        {journalNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <Input
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full pr-8"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted transition hover:text-text-primary"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>
      )}
    </div>
  )
}
