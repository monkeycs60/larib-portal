"use client"
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, disabled, className }: Props) {
  const [html, setHtml] = useState<string>(value ?? '')
  const editorRef = useRef<HTMLDivElement | null>(null)

  function apply(cmd: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList') {
    document.execCommand(cmd)
  }

  function onInput() {
    const current = editorRef.current?.innerHTML ?? ''
    setHtml(current)
    onChange?.(current)
  }

  function clear() {
    if (!editorRef.current) return
    editorRef.current.innerHTML = ''
    setHtml('')
    onChange?.('')
  }

  return (
    <div className={className}>
      <div className="flex gap-1 mb-2">
        <Button type="button" size="sm" variant="outline" onClick={() => apply('bold')} disabled={disabled}><b>B</b></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply('italic')} disabled={disabled}><i>I</i></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply('underline')} disabled={disabled}><u>U</u></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply('insertUnorderedList')} disabled={disabled}>• List</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply('insertOrderedList')} disabled={disabled}>1. List</Button>
        <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={disabled}>Clear</Button>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline
        contentEditable={!disabled}
        className={`min-h-32 rounded-md border px-3 py-2 text-sm focus:outline-none ${disabled ? 'bg-muted cursor-not-allowed' : 'bg-background'}`}
        onInput={onInput}
        suppressContentEditableWarning
        placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
    </div>
  )
}

export default RichTextEditor

