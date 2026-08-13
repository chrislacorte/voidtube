import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, Palette, RemoveFormatting } from 'lucide-react'
import { memo, useEffect } from 'react'
import { cn } from '../../lib/utils'
import NodeShell, { useNodeActions } from './NodeShell'

const TEXT_COLORS = [
  { label: 'Black', value: '#1f2937' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Green', value: '#16a34a' },
]

function ToolbarButton({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-xs transition',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function EssayNode({ id, data }) {
  const { updateData, deleteNode, setTitle } = useNodeActions(id)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
    ],
    content: data.content || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[180px] px-1 py-1 text-foreground outline-none focus:outline-none [&_*]:text-inherit',
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateData({ content: ed.getJSON() })
    },
  })

  useEffect(() => {
    if (!editor || data.content === undefined) return
    const current = JSON.stringify(editor.getJSON())
    const incoming = JSON.stringify(data.content)
    if (current !== incoming) {
      editor.commands.setContent(data.content || '')
    }
  }, [editor, data.content])

  const currentColor = editor?.getAttributes('textStyle').color

  return (
    <NodeShell
      id={id}
      title={data.title || 'Essay'}
      onTitleChange={setTitle}
      onDelete={deleteNode}
      width={360}
    >
      {editor && (
        <div className="nodrag nowheel mb-2 space-y-2 border-b border-border pb-2">
          <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton
              title="Bold"
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={14} strokeWidth={2.25} />
            </ToolbarButton>
            <ToolbarButton
              title="Italic"
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={14} strokeWidth={2.25} />
            </ToolbarButton>
            <ToolbarButton
              title="List"
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={14} strokeWidth={2.25} />
            </ToolbarButton>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <ToolbarButton
              title="Clear formatting"
              active={false}
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            >
              <RemoveFormatting size={14} strokeWidth={2.25} />
            </ToolbarButton>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Palette size={13} className="shrink-0 text-muted-foreground" aria-hidden />
            {TEXT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.label}
                onClick={() => editor.chain().focus().setColor(color.value).run()}
                className={cn(
                  'h-5 w-5 rounded-full border transition hover:scale-110',
                  currentColor === color.value
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border/80',
                )}
                style={{ backgroundColor: color.value }}
              />
            ))}
            <label
              title="Custom color"
              className="relative flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border hover:scale-110"
            >
              <span className="text-[8px] font-bold text-muted-foreground">+</span>
              <input
                type="color"
                className="absolute inset-0 cursor-pointer opacity-0"
                value={currentColor || '#1f2937'}
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              />
            </label>
          </div>
        </div>
      )}
      <div className="nodrag nowheel essay-editor">
        <EditorContent editor={editor} />
      </div>
    </NodeShell>
  )
}

export default memo(EssayNode)
