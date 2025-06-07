import {
  DragEvent,
  forwardRef,
  KeyboardEvent,
  memo,
  MouseEvent,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import { Editor as TTEditor } from '@tiptap/core'
import { EditorContent } from '@tiptap/react'

import { ActiveEditorComment, BlurAtTopOptions } from '@gitmono/editor'
import { LayeredHotkeys } from '@gitmono/ui'

// import { AttachmentLightbox } from '@/components/AttachmentLightbox'
import { MentionList } from '@/components/MarkdownEditor/MentionList'
import { ReactionList } from '@/components/MarkdownEditor/ReactionList'
import { ResourceMentionList } from '@/components/MarkdownEditor/ResourceMentionList'
import { ADD_ATTACHMENT_SHORTCUT, SlashCommand } from '@/components/Post/Notes/SlashCommand'
import { useAutoScroll } from '@/hooks/useAutoScroll'

import { CodeBlockLanguagePicker } from '@/components/CodeBlockLanguagePicker'
import { EditorBubbleMenu } from '@/components/EditorBubbleMenu'
import { MentionInteractivity } from '@/components/InlinePost/MemberHovercard'
import { DropProps, useEditorFileHandlers } from '@/components/MarkdownEditor/useEditorFileHandlers'
import { HighlightCommentPopover } from '@/components/NoteComments/HighlightCommentPopover'
import { useUploadNoteAttachments } from '@/components/Post/Notes/Attachments/useUploadAttachments'
import { NoteCommentPreview } from '@/components/Post/Notes/CommentRenderer'
import { useNoteEditor } from '@/components/Post/Notes/useNoteEditor'

interface Props {
  noteId: string
  editable?: 'all' | 'viewer'
  autofocus?: boolean
  content: string
  onBlurAtTop?: BlurAtTopOptions['onBlur']
  onKeyDown?: (event: KeyboardEvent) => void
}

export interface SimpleNoteContentRef {
  focus(pos: 'start' | 'end' | 'restore' | 'start-newline' | MouseEvent): void
  handleDrop(props: DropProps): void
  handleDragOver(isOver: boolean, event: DragEvent): void
  editor: TTEditor | null
}

export const SimpleNoteContent = memo(
  forwardRef<SimpleNoteContentRef, Props>((props, ref) => {
    const { noteId, editable = 'viewer', autofocus = false, onBlurAtTop, content } = props

    const [activeComment, setActiveComment] = useState<ActiveEditorComment | null>(null)
    const [hoverComment, setHoverComment] = useState<ActiveEditorComment | null>(null)
    // const [openAttachmentId, setOpenAttachmentId] = useState<string | undefined>()

    const canUploadAttachments = editable === 'all'
    const upload = useUploadNoteAttachments({ noteId, enabled: canUploadAttachments })

    const editor = useNoteEditor({
      content,
      autofocus,
      editable: editable,
      onHoverComment: setHoverComment,
      onActiveComment: setActiveComment,
      // onOpenAttachment: setOpenAttachmentId,
      onBlurAtTop,
      provider: null
    })

    const { onDrop, onPaste, imperativeHandlers } = useEditorFileHandlers({
      enabled: canUploadAttachments,
      upload,
      editor
    })

    // these functions allow us to call editorRef?.current?.handleDrop() etc. on the parent container
    useImperativeHandle(
      ref,
      () => ({
        focus: (pos) => {
          if (pos === 'start') {
            editor.commands.focus('start')
          } else if (pos === 'start-newline') {
            editor.commands.focus('start')
            editor.commands.insertContent('\n')
          } else if (pos === 'end') {
            editor.commands.focus('end')
          } else if (pos === 'restore') {
            editor.commands.focus()
          } else if ('clientX' in pos && 'clientY' in pos && 'target' in pos) {
            if (editor.view.dom.contains(pos.target as Node)) {
              return
            }

            const { left, right, top } = editor.view.dom.getBoundingClientRect()
            const isRight = pos.clientX > right
            const editorPos = editor.view.posAtCoords({
              left: isRight ? right : left,
              top: pos.clientY
            })

            if (editorPos) {
              const posAdjustment = isRight && editor.view.coordsAtPos(editorPos.pos).left === left ? -1 : 0

              editor.commands.focus(editorPos.pos + posAdjustment)
            } else if (pos.clientY < top) {
              editor.commands.focus('start')
            } else {
              editor.commands.focus('end')
            }
          }
        },
        ...imperativeHandlers,
        editor
      }),
      [editor, imperativeHandlers]
    )

    const containerRef = useRef<HTMLDivElement>(null)

    useAutoScroll({
      ref: containerRef,
      enabled: true
    })

    return (
      <div ref={containerRef} className="relative min-h-[160px]">
        <LayeredHotkeys
          keys={ADD_ATTACHMENT_SHORTCUT}
          callback={() => {
            if (!editor.isFocused) return

            const input = document.createElement('input')

            input.type = 'file'
            input.onchange = async () => {
              if (input.files?.length) {
                upload({
                  files: Array.from(input.files),
                  editor
                })
              }
            }
            input.click()
          }}
          options={{ enableOnContentEditable: true, enableOnFormTags: true }}
        />

        <NoteCommentPreview
          onExpand={() => {
            if (hoverComment) {
              setHoverComment(null)
              setActiveComment(hoverComment)
            }
          }}
          previewComment={activeComment ? null : hoverComment}
          editor={editor}
          noteId={noteId}
        />
        <MentionInteractivity container={containerRef} />
        <CodeBlockLanguagePicker editor={editor} />
        <SlashCommand editor={editor} upload={upload} />
        <MentionList editor={editor} />
        <ResourceMentionList editor={editor} />
        <ReactionList editor={editor} />

        {/* <AttachmentLightbox
          subject={note}
          selectedAttachmentId={openAttachmentId}
          onClose={() => setOpenAttachmentId(undefined)}
          onSelectAttachment={({ id }) => setOpenAttachmentId(id)}
        /> */}

        <HighlightCommentPopover
          activeComment={activeComment}
          editor={editor}
          noteId={noteId}
          onCommentDeactivated={() => setActiveComment(null)}
        />

        <EditorBubbleMenu editor={editor} canComment />

        <EditorContent editor={editor} onKeyDown={props.onKeyDown} onPaste={onPaste} onDrop={onDrop} />
      </div>
    )
  })
)

SimpleNoteContent.displayName = 'SimpleNoteContent' 