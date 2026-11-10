import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadEditor } from './entryLoader'

const host = document.getElementById('root')!
void loadEditor(
  () => import('./App'),
  ({ default: App }) => createRoot(host).render(<StrictMode><App /></StrictMode>),
  () => {
    const main = document.createElement('main')
    main.className = 'entry-status'
    const message = document.createElement('p')
    message.setAttribute('role', 'alert')
    message.textContent = 'The room planner could not open. Please try again.'
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.textContent = 'Try again'
    retry.addEventListener('click', () => window.location.reload())
    main.append(message, retry)
    host.replaceChildren(main)
    retry.focus()
  },
)
