import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { Icon } from './Icon'

export function Popover({ title, id, triggerRef, onClose, children, initialFocus = 'heading', className, showClose = true, dismissOnOutside = true, dismissOnEscape = true }: {
  title: string; id: string; triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: (restoreFocus?: boolean) => void; children: ReactNode; initialFocus?: 'heading' | 'first-field' | 'none'; className?: string; showClose?: boolean; dismissOnOutside?: boolean; dismissOnEscape?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const headingId = useId()
  // A non-modal disclosure: normal tab order, Escape to close, no focus trap.
  useEffect(() => {
    const focusTarget = initialFocus === 'none' ? null : initialFocus === 'first-field'
      ? ref.current?.querySelector<HTMLElement>('input, textarea, select')
      : ref.current?.querySelector<HTMLElement>('[data-popover-heading]')
    focusTarget?.focus()
    function outside(event: PointerEvent) {
      if (document.querySelector('dialog[open]')) return
      const target = event.target as Node
      if (!ref.current?.contains(target) && !triggerRef.current?.contains(target)) onClose(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return
      event.preventDefault()
      onClose(true)
    }
    function closeOnFocusOutside(event: FocusEvent) {
      if (document.querySelector('dialog[open]')) return
      const target = event.target
      if (target instanceof Node && !ref.current?.contains(target) && !triggerRef.current?.contains(target)) onClose(false)
    }
    if (dismissOnOutside) { document.addEventListener('pointerdown', outside); document.addEventListener('focusin', closeOnFocusOutside) }
    if (dismissOnEscape) document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('focusin', closeOnFocusOutside) }
  }, [dismissOnEscape, dismissOnOutside, initialFocus, onClose, triggerRef])
  return <section ref={ref} id={id} className={'popover' + (className ? ' ' + className : '')} role="region" aria-labelledby={headingId}
    onBlur={(event) => {
      if (!dismissOnOutside) return
      if (document.querySelector('dialog[open]')) return
      const next = event.relatedTarget
      if (next instanceof Node && !event.currentTarget.contains(next) && !triggerRef.current?.contains(next)) onClose(false)
    }}
    onKeyDown={(event) => { if (dismissOnEscape && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(true) } }}>
    <div className="popover-heading"><h2 id={headingId} tabIndex={-1} data-popover-heading>{title}</h2>{showClose && <button className="icon-button" aria-label={'Close ' + title.toLowerCase()} onClick={() => onClose(true)}><Icon name="close" /></button>}</div>
    {children}
  </section>
}
