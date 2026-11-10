import { useEffect, useRef } from 'react'

export function SavedProjectDeleteDialog({ projectName, busy, error, onCancel, onConfirm }: {
  projectName: string
  busy: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = dialog.current
    node?.showModal()
    cancel.current?.focus()
    return () => {
      node?.close()
      if (previous?.isConnected) previous.focus()
      else {
        const savedHeading = document.querySelector<HTMLElement>('[data-saved-project-heading]')
        if (savedHeading) savedHeading.focus()
        else document.querySelector<HTMLButtonElement>('[data-open-projects]')?.focus()
      }
    }
  }, [])

  return <dialog ref={dialog} className="unsaved-dialog saved-delete-dialog" aria-labelledby="saved-delete-title" aria-describedby="saved-delete-description" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel() }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      if (!controls.length) return
      event.preventDefault()
      const current = controls.indexOf(document.activeElement as HTMLButtonElement)
      controls[(current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus()
    }}>
    <h2 id="saved-delete-title">Delete saved project?</h2>
    <p id="saved-delete-description">“{projectName}” will be removed from this browser. This can’t be undone.</p>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="dialog-actions">
      <button ref={cancel} className="button" disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="button danger-text" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : 'Delete project'}</button>
    </div>
  </dialog>
}
