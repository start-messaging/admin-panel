import { useCallback, useEffect } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Heading1,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailMergeField } from '@/types/email';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  mergeFields: EmailMergeField[];
  disabled?: boolean;
}

/** One toolbar button. Kept local — nothing else in the panel has this shape. */
function ToolButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // onMouseDown rather than onClick: clicking a toolbar button would
      // otherwise blur the editor first, collapsing the selection the command
      // is about to act on.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        'flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}

function Toolbar({
  editor,
  mergeFields,
}: {
  editor: Editor;
  mergeFields: EmailMergeField[];
}) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  }, [editor]);

  const addImage = useCallback(() => {
    // A URL rather than an upload: an inline data URI pushes the message past
    // the size where Gmail clips it, and clipped mail hides the unsubscribe
    // link that has to stay visible.
    const url = window.prompt('Image URL (must be publicly reachable)');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
      <ToolButton
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 className="size-3.5" />
      </ToolButton>

      <Divider />

      <ToolButton
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-3.5" />
      </ToolButton>

      <Divider />

      <ToolButton
        title="Insert link"
        active={editor.isActive('link')}
        onClick={setLink}
      >
        <Link2 className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Remove link"
        disabled={!editor.isActive('link')}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Link2Off className="size-3.5" />
      </ToolButton>
      <ToolButton title="Insert image" onClick={addImage}>
        <ImageIcon className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Insert table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <TableIcon className="size-3.5" />
      </ToolButton>

      <Divider />

      <ToolButton
        title="Heading"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading1 className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Subheading"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        <Heading2 className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Bulleted list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="size-3.5" />
      </ToolButton>

      <Divider />

      <ToolButton
        title="Align left"
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Align centre"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="size-3.5" />
      </ToolButton>
      <ToolButton
        title="Align right"
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="size-3.5" />
      </ToolButton>

      <Divider />

      {/* Merge fields. A plain select rather than a dropdown menu component,
          because it has to stay usable on a phone and this is the one control
          an admin will reach for on every campaign. */}
      <div className="flex items-center gap-1">
        <Braces className="size-3.5 text-muted-foreground" />
        <select
          className="h-7 rounded-md border-0 bg-transparent px-1 text-xs text-muted-foreground outline-none hover:bg-muted"
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            editor
              .chain()
              .focus()
              .insertContent(`{{${e.target.value}}}`)
              .run();
            e.target.value = '';
          }}
        >
          <option value="">Insert field…</option>
          {mergeFields.map((f) => (
            <option key={f.token} value={f.token}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * The campaign body editor.
 *
 * Output goes straight into an email, so the extension set is chosen for what
 * mail clients actually render rather than for what looks good in a browser:
 * no code blocks, no task lists, no colour picker. Outlook renders through
 * Word's HTML engine and silently drops most of what a web editor produces.
 */
export function RichTextEditor({
  value,
  onChange,
  mergeFields,
  disabled,
}: RichTextEditorProps) {
  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // Neither survives an email client, and both invite an admin to write
        // a body that renders as a wall of monospace in Outlook.
        code: false,
        codeBlock: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          // Every href is rewritten through the click-tracking redirect at
          // send time, so only http(s) can be allowed through here.
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      Image.configure({
        HTMLAttributes: {
          // Without a max-width an image wider than the 600px shell forces
          // horizontal scrolling in every mobile client.
          style: 'max-width:100%;height:auto;display:block;',
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose-email min-h-[280px] px-4 py-3 outline-none text-sm leading-relaxed',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Only pushed in when the two have genuinely diverged — TipTap emits its own
  // normalised HTML on every keystroke, so comparing against the last value we
  // sent up would reset the cursor to the start of the document as you type.
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    if (editor.isFocused) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div className="h-[340px] animate-pulse rounded-xl border bg-muted/30" />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background focus-within:border-ring">
      <Toolbar editor={editor} mergeFields={mergeFields} />
      <EditorContent editor={editor} />
    </div>
  );
}
