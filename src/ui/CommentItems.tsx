import { useEffect, useState } from 'react'
import type { CommentEntry, ObjectComment } from '../domain/types'

export function toCommentDisplay(comments: CommentEntry[] | undefined): ObjectComment[] {
  return (comments ?? []).map((comment, index) => typeof comment === 'string'
    ? { id: `legacy:${index}`, text: comment }
    : comment)
}

export function relativeCommentTime(value: string | undefined, now: number) {
  if (!value) return 'Time unavailable'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'Time unavailable'
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp)
}

export function CommentItems({ comments, onOpenComment }: {
  comments: ObjectComment[]
  onOpenComment: (commentId: string) => void
}) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return <ul className="comment-items">{comments.map((comment) => <li key={comment.id} className="comment-item">
    <button
      type="button"
      className={'comment-preview-row' + (comment.resolvedAt ? ' is-resolved' : '')}
      aria-label={`${comment.text}${comment.resolvedAt ? ', resolved' : ''}`}
      title={comment.text}
      onClick={() => onOpenComment(comment.id)}
    >
      <span className="comment-preview-text">{comment.text}</span>
      <time className="comment-preview-time" dateTime={comment.createdAt}>{relativeCommentTime(comment.createdAt, now)}</time>
    </button>
  </li>)}</ul>
}
