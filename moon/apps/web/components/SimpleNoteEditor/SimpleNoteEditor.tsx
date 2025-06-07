import { forwardRef, MouseEvent, useCallback, useRef, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { useDebouncedCallback } from 'use-debounce'

import { BlurAtTopOptions } from '@gitmono/editor/extensions/BlurAtTop'
import { Note } from '@gitmono/types'
import { cn } from '@gitmono/ui/src/utils'

import { EMPTY_HTML } from '@/atoms/markdown'
import { TitleTextField } from '@/components/TitleTextField'
import { useBeforeRouteChange } from '@/hooks/useBeforeRouteChange'
import { useUpdateNote } from '@/hooks/useUpdateNote'
import { apiErrorToast } from '@/utils/apiErrorToast'

import { SimpleNoteContent, SimpleNoteContentRef } from '@/components/SimpleNoteEditor/SimpleNoteContent'
import { useHandleBottomScrollOffset } from '@/components/NoteEditor/useHandleBottomScrollOffset'

interface Props {
  note: Note
  quickNote?: boolean
}

export function SimpleNoteEditor({ note, quickNote }: Props) {
  const editorRef = useRef<SimpleNoteContentRef>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const reactionsRef = useRef<HTMLDivElement>(null)

  const editable = note.viewer_can_edit ? 'all' : 'viewer'

  const mouseDownInEditorRef = useRef(false)
  const id = `note-editor-${note.id}`
  const onContainerMouseDown = (event: MouseEvent) => {
    mouseDownInEditorRef.current = !!editorRef.current?.editor?.view.dom.contains(event.target as Node)
  }
  const onContainerMouseUp = (event: MouseEvent) => {
    if (mouseDownInEditorRef.current) return

    const isReactionsClick =
      event.target === reactionsRef.current || !!reactionsRef.current?.contains(event.target as Node)
    const isClickInContainer = !!(event.target as HTMLElement).closest(`#${id}`)
    const isClickInTippy = !!(event.target as HTMLElement).closest('[data-tippy-root]')

    if (isClickInContainer && !isReactionsClick && !isClickInTippy) {
      if (titleRef.current && event.clientY < titleRef.current.getBoundingClientRect().bottom) {
        titleRef.current.focus()
      } else if (editorContainerRef.current) {
        const { top, bottom } = editorContainerRef.current.getBoundingClientRect()

        if (event.clientY < top) {
          editorRef.current?.focus('start')
        } else if (event.clientY > bottom) {
          editorRef.current?.focus('end')
        } else {
          editorRef.current?.focus(event)
        }
      }
    }
  }

  const focusTitle: BlurAtTopOptions['onBlur'] = useCallback((pos) => {
    titleRef.current?.focus()
    if (pos === 'end') {
      titleRef.current?.setSelectionRange(titleRef.current.value.length, titleRef.current.value.length)
    }
  }, [])

  const onKeyDownScrollHandler = useHandleBottomScrollOffset({
    editor: editorRef.current?.editor
  })

  const canAutofocus = !!note?.viewer_is_author
  const hasDescription = !!note?.description_html && note?.description_html !== EMPTY_HTML
  const canAutofocusTitle = canAutofocus && !note?.title
  const canAutofocusDescription = canAutofocus && !canAutofocusTitle && !hasDescription

  return (
    <div className='flex w-full flex-1 flex-col'>
      <div
        id={id}
        className='flex w-full flex-1 cursor-text flex-col gap-4 pb-[10vh]'
        onDragOverCapture={(e) => {
          e.preventDefault()
          editorRef?.current?.handleDragOver(true, e)
        }}
        onDragLeaveCapture={(e) => editorRef?.current?.handleDragOver(false, e)}
        onDragExitCapture={(e) => editorRef?.current?.handleDragOver(false, e)}
        onDrop={(e) => editorRef?.current?.handleDrop(e)}
        onMouseDownCapture={onContainerMouseDown}
        onMouseUpCapture={onContainerMouseUp}
      >
        {!quickNote && (
          <div
            className={cn(
              'group/title flex w-full flex-row-reverse items-start gap-4 max-lg:flex-col md:gap-5 lg:gap-6',
              {
                'flex-col-reverse max-lg:flex-col-reverse': isMobile
              }
            )}
          >
            <NoteTitle
              ref={titleRef}
              note={note}
              onEnter={() => editorRef.current?.focus('start-newline')}
              onFocusNext={() => editorRef.current?.focus('restore')}
              autofocus={canAutofocusTitle}
            />
          </div>
        )}

        <div ref={editorContainerRef} className='w-full'>
          <SimpleNoteContent
            ref={editorRef}
            noteId="temp"
            editable={editable}
            content={note?.description_html || EMPTY_HTML}
            onBlurAtTop={focusTitle}
            autofocus={canAutofocusDescription}
            onKeyDown={onKeyDownScrollHandler}
          />
        </div>
      </div>
    </div>
  )
}

interface NoteTitleProps {
  note?: Note
  autofocus?: boolean
  onEnter?: () => void
  onFocusNext?: () => void
}

const NoteTitle = forwardRef<HTMLTextAreaElement, NoteTitleProps>(function NoteTitle(props, ref) {
  const { note, autofocus, onEnter, onFocusNext } = props
  const [formTitle, setFormTitle] = useState(note?.title)
  const { mutate: updateNote } = useUpdateNote()
  const save = useCallback(() => {
    if (!note?.viewer_can_edit || !note?.id || formTitle === note.title) return
    updateNote(
      { noteId: note.id, title: formTitle ?? '' },
      {
        onError: apiErrorToast
      }
    )
  }, [note?.viewer_can_edit, note?.id, note?.title, formTitle, updateNote])
  const debouncedSave = useDebouncedCallback(save, 1000, { trailing: true })

  useBeforeRouteChange(save, !!note?.viewer_can_edit)

  return (
    <TitleTextField
      ref={ref}
      className='mx-auto w-full max-w-[44rem] text-[clamp(2rem,_4vw,_2.5rem)] font-bold leading-[1.2]'
      placeholder={note ? 'Untitled' : undefined}
      value={formTitle}
      onChange={(value) => {
        setFormTitle(value)
        debouncedSave()
      }}
      onEnter={onEnter}
      onFocusNext={onFocusNext}
      autoFocus={autofocus}
      readOnly={!note?.viewer_can_edit}
    />
  )
}) 