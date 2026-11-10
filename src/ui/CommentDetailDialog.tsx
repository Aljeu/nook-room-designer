import { useEffect, useRef } from 'react'
import type { ObjectComment } from '../domain/types'
import { Icon } from './Icon'
import { relativeCommentTime } from './CommentItems'

export function CommentDetailDialog({ objectName, comment, onClose, onToggleResolved, onDelete }: {
  objectName: string
  comment: ObjectComment
  onClose: () => void
  onToggleResolved: () => void
  onDelete: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = dialog.current
    node?.showModal()
    node?.querySelector<HTMLButtonElement>('.comment-detail-close')?.focus()
    return () => { node?.close(); if (previous?.isConnected) previous.focus() }
  }, [])

  return <dialog
    ref={dialog}
    className="comment-detail-dialog"
    aria-labelledby="comment-detail-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
  >
    <header className="comment-detail-heading">
      <div>
        <p className="eyebrow">{objectName}</p>
        <h2 id="comment-detail-title">Comment</h2>
      </div>
      <button type="button" className="icon-button comment-detail-close" aria-label="Close comment" onClick={onClose}><Icon name="close" /></button>
    </header>
    <article className={'comment-detail-body' + (comment.resolvedAt ? ' is-resolved' : '')}>
      <p>{comment.text}</p>
      <time dateTime={comment.createdAt}>{relativeCommentTime(comment.createdAt, Date.now())}</time>
      {comment.resolvedAt && <span className="comment-detail-resolved">Resolved {relativeCommentTime(comment.resolvedAt, Date.now())}</span>}
    </article>
    <div className="comment-detail-actions">
      <button
        type="button"
        className="comment-detail-icon-button"
        aria-label={comment.resolvedAt ? 'Reopen comment' : 'Resolve comment'}
        title={comment.resolvedAt ? 'Reopen comment' : 'Resolve comment'}
        aria-pressed={!!comment.resolvedAt}
        onClick={onToggleResolved}
      >
        <Icon name="checkCheck" size={22} />
      </button>
      <button type="button" className="comment-detail-icon-button comment-detail-delete" aria-label="Delete comment" title="Delete comment" onClick={onDelete}>
        <Icon name="x" size={22} />
      </button>
    </div>
  </dialog>
}
