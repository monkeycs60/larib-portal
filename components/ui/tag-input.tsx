"use client"
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Props = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
  max?: number
}

export function TagInput({ value, onChange, placeholder, disabled, max = 10 }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const tags = new Set(value)

  function addTag(raw: string) {
    const t = raw.trim()
    if (!t) return
    if (tags.has(t)) return
    if (tags.size >= max) return
    onChange([...tags, t])
    setText('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addTag(text)
    } else if (e.key === 'Backspace' && text.length === 0) {
      const arr = Array.from(tags)
      const last = arr.pop()
      if (last) onChange(arr)
    }
  }

  function onChangeText(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    // If user pasted with delimiters, split immediately
    if (v.includes(',') || v.includes(' ')) {
      const parts = v.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
      const next = new Set(tags)
      for (const p of parts) {
        if (next.size >= max) break
        next.add(p)
      }
      onChange(Array.from(next))
      setText('')
      return
    }
    setText(v)
  }

  function removeTag(t: string) {
    const next = value.filter(v => v !== t)
    onChange(next)
    inputRef.current?.focus()
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={text}
          onChange={onChangeText}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => addTag(text)} disabled={disabled}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map(t => (
          <Badge key={t} variant="secondary" className="flex items-center gap-1">
            <span>{t}</span>
            <button type="button" onClick={() => removeTag(t)} className="text-xs opacity-70 hover:opacity-100" aria-label={`remove ${t}`}>×</button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

export default TagInput

