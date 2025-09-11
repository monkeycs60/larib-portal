"use client"
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

type Props = {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, disabled, className }: Props) {
  // Recreate editor when disabled changes to update editability (no useEffect)
  const deps = useMemo(() => [disabled] as const, [disabled])
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
        Placeholder.configure({ placeholder: placeholder || '' }),
      ],
      content: value || '',
      editable: !disabled,
      editorProps: {
        attributes: {
          class: 'ProseMirror min-h-32 rounded-md border px-3 py-2 text-sm prose prose-sm max-w-none focus:outline-none',
        },
        handleClick(view, pos, event) {
          // Ensure editor gets focus on wrapper clicks
          if (!view.hasFocus()) view.focus()
          return false
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        onChange?.(html)
      },
    },
    deps as unknown as any,
  )

  function chain() {
    return editor?.chain().focus()
  }

  function keepSelection(e: React.MouseEvent) {
    // Prevent toolbar click from blurring the editor (which loses selection)
    e.preventDefault()
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('bold') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleBold().run()}><b>B</b></Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('italic') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleItalic().run()}><i>I</i></Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('strike') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleStrike().run()}>S</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('underline') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleUnderline?.().run?.()}>U</Button>
          <span className="mx-1 w-px h-6 bg-border" />
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('paragraph') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.setParagraph().run()}>P</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('heading', { level: 2 }) ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => {
            if (!editor) return
            const sel = editor.state.selection
            const isEmptyLine = sel.empty && sel.$from.parent && sel.$from.parent.textContent.length === 0
            if (sel.empty && !isEmptyLine) {
              editor.chain().focus().splitBlock().setNode('heading', { level: 2 }).run()
            } else {
              chain()?.toggleHeading({ level: 2 }).run()
            }
          }}>H2</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('heading', { level: 3 }) ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => {
            if (!editor) return
            const sel = editor.state.selection
            const isEmptyLine = sel.empty && sel.$from.parent && sel.$from.parent.textContent.length === 0
            if (sel.empty && !isEmptyLine) {
              editor.chain().focus().splitBlock().setNode('heading', { level: 3 }).run()
            } else {
              chain()?.toggleHeading({ level: 3 }).run()
            }
          }}>H3</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('bulletList') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleBulletList().run()}>• List</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('orderedList') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleOrderedList().run()}>1. List</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('blockquote') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleBlockquote().run()}>❝</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant={editor?.isActive('codeBlock') ? 'secondary' : 'outline'} disabled={!editor || disabled} onClick={() => chain()?.toggleCodeBlock().run()}>Code</Button>
          <span className="mx-1 w-px h-6 bg-border" />
          <Button type="button" size="sm" onMouseDown={keepSelection} variant="outline" disabled={!editor || disabled} onClick={() => chain()?.setHorizontalRule().run()}>HR</Button>
          <span className="mx-1 w-px h-6 bg-border" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onMouseDown={keepSelection}
            disabled={!editor || disabled}
            onClick={() => {
              const url = prompt('Enter URL') || ''
              const safe = url.trim()
              if (!safe) return
              try {
                const u = new URL(safe.startsWith('http') ? safe : `https://${safe}`)
                chain()?.setLink({ href: u.toString() }).run()
              } catch {
                // ignore invalid
              }
            }}
          >Link</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant="outline" disabled={!editor || disabled} onClick={() => chain()?.unsetLink().run()}>Unlink</Button>
          <span className="mx-1 w-px h-6 bg-border" />
          <Button type="button" size="sm" onMouseDown={keepSelection} variant="outline" disabled={!editor || disabled} onClick={() => editor?.commands.undo()}>Undo</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant="outline" disabled={!editor || disabled} onClick={() => editor?.commands.redo()}>Redo</Button>
          <Button type="button" size="sm" onMouseDown={keepSelection} variant="ghost" disabled={!editor || disabled} onClick={() => editor?.commands.clearContent()}>Clear</Button>
        </div>
      </div>
      <div className={`${disabled ? 'bg-muted cursor-not-allowed' : 'bg-background'}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default RichTextEditor
