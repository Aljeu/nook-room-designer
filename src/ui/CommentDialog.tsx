import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from './Icon'
import { CommentItems, toCommentDisplay } from './CommentItems'
import type { CommentEntry } from '../domain/types'

export function CommentDialog({ objectName, comments, onClose, onSubmit, onOpenComment }: {
  objectName: string
  comments: CommentEntry[]
  onClose: () => void
  onSubmit: (comment: string) => void
  onOpenComment: (commentId: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState('')
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = dialog.current
    node?.showModal()
    textarea.current?.focus()
    return () => { node?.close(); if (previous?.isConnected) previous.focus() }
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSubmit(text)
  }

  return <dialog ref={dialog} className="comment-dialog" aria-labelledby="comment-dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="comment-dialog-heading"><div><p className="eyebrow">OBJECT COMMENTS</p><h2 id="comment-dialog-title">{objectName}</h2></div><button className="icon-button" aria-label="Close comments" onClick={onClose}><Icon name="close" /></button></div>
    <div className="comment-list" aria-label="Existing comments">
      {comments.length ? <CommentItems comments={toCommentDisplay(comments)} onOpenComment={onOpenComment} /> : <p className="muted">No comments yet. Add the first note for this piece.</p>}
    </div>
    <form onSubmit={submit}>
      <label className="comment-label" htmlFor="object-comment">Add a comment</label>
      <textarea ref={textarea} id="object-comment" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} rows={3} placeholder="Write a note about this piece…" />
      <div className="comment-form-footer"><span className="muted">{draft.length}/500</span><div className="dialog-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={!draft.trim()}>Add comment</button></div></div>
    </form>
  </dialog>
}
