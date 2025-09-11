"use client"
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'

type Props = {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, disabled, className }: Props) {
  const deps = useMemo(() => [disabled] as const, [disabled])

  const FontSize = useMemo(
    () =>
      Extension.create({
        name: 'fontSize',
        addGlobalAttributes() {
          return [
            {
              types: ['textStyle'],
              attributes: {
                fontSize: {
                  default: null as string | null,
                  parseHTML: element => (element as HTMLElement).style.fontSize || null,
                  renderHTML: attributes => {
                    const size = (attributes as { fontSize?: string | null }).fontSize
                    if (!size) return {}
                    return { style: `font-size: ${size}` }
                  },
                },
              },
            },
          ]
        },
      }),
    [],
  )
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        Underline,
        Link.configure({
          autolink: true,
          linkOnPaste: true,
          openOnClick: false,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto'],
        }),
        TextStyle,
        FontSize,
        Placeholder.configure({ placeholder: placeholder || '' }),
      ],
      content: value || '',
      editable: !disabled,
      editorProps: {
        attributes: {
          class: 'ProseMirror min-h-32 rounded-md border px-3 py-2 text-sm prose prose-sm max-w-none focus:outline-none',
        },
        handleClick(view) {
          if (!view.hasFocus()) view.focus()
          return false
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        onChange?.(html)
      },
    },
    deps,
  )

  function chain() {
    return editor?.chain().focus()
  }

  function keepSelection(e: React.MouseEvent) {
    e.preventDefault()
  }

  const fontSizes: ReadonlyArray<{ label: string; value: string }> = [
    { label: '12', value: '12px' },
    { label: '14', value: '14px' },
    { label: '16', value: '16px' },
    { label: '18', value: '18px' },
    { label: '20', value: '20px' },
    { label: '24', value: '24px' },
  ] as const

  function setFontSize(size: string | null) {
    if (!editor) return
    if (size) {
      editor.chain().focus().setMark('textStyle', { fontSize: size }).run()
    } else {
      editor.chain().focus().updateAttributes('textStyle', { fontSize: null }).run()
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('bold') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleBold().run()}><b>B</b></Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('italic') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleItalic().run()}><i>I</i></Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('underline') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleUnderline().run()}>U</Button>
          <span className="mx-1 w-px h-6 bg-border" />
          <Select
            aria-label="Font size"
            className="h-8 w-[90px]"
            disabled={!editor || disabled}
            onChange={(e) => {
              const v = e.target.value
              if (v === '__reset__') setFontSize(null)
              else setFontSize(v)
            }}
          >
            <option value="" disabled>Size</option>
            {fontSizes.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
            <option value="__reset__">Reset</option>
          </Select>
          <span className="mx-1 w-px h-6 bg-border" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!editor || disabled}
            onMouseDown={keepSelection}
            onClick={() => {
              editor?.chain().focus().clearContent().run()
              onChange?.('')
            }}
          >Clear</Button>
        </div>
      </div>
      <div className={`${disabled ? 'bg-muted cursor-not-allowed' : 'bg-background'}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default RichTextEditor
