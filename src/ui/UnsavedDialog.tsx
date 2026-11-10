import { useEffect, useRef } from 'react'

export function UnsavedDialog({ busy, error, onCancel, onDiscard, onSave }: {
  busy: boolean; error: string | null; onCancel: () => void; onDiscard: () => void; onSave: () => void
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
      else document.querySelector<HTMLButtonElement>('[data-open-projects]')?.focus()
    }
  }, [])
  return <dialog ref={dialog} className="unsaved-dialog" aria-labelledby="unsaved-title" aria-describedby="unsaved-description" onCancel={(event) => { event.preventDefault(); onCancel() }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      if (!controls.length) return
      event.preventDefault()
      const current = controls.indexOf(document.activeElement as HTMLButtonElement)
      controls[(current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus()
    }}>
    <h2 id="unsaved-title">Save your changes?</h2>
    <p id="unsaved-description">Your current option has unsaved changes. Save them before opening the other option, or keep working here.</p>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button ref={cancel} className="button" onClick={onCancel}>Keep editing</button><button className="button danger-text" disabled={busy} onClick={onDiscard}>Discard and open</button><button className="button primary" disabled={busy} onClick={onSave}>{busy ? 'Please wait…' : 'Save and open'}</button></div>
  </dialog>
}
