/// <reference types="vite/client" />
import { describe, expect, it, vi } from 'vitest'
import home from '../index.html?raw'
import editor from '../editor/index.html?raw'
import preview from '../public/site/index.html?raw'
import { loadEditor } from './entryLoader'
import { editorRedirectPath } from './editorRoute'

describe('page entry', () => {
  it('renders the selected homepage without importing the editor and directs product links to the editor', () => {
    expect(home).toContain("window.location.replace('/site/index.html' + window.location.search + window.location.hash)")
    expect(preview).toContain('data-type="clash"')
    expect(home).not.toContain('/src/main.tsx')
    expect(home).not.toContain('class="hero"')
    expect(editor).toContain('/src/main.tsx')
    expect(editor).toContain('role="status"')
    expect(preview.match(/href="\/editor\/"/g)).toHaveLength(5)
  })
  it('redirects the bare editor path while preserving its query', () => {
    expect(editorRedirectPath('/editor')).toBe('/editor/')
    expect(editorRedirectPath('/editor?diagnostics=1')).toBe('/editor/?diagnostics=1')
    expect(editorRedirectPath('/editor/')).toBeNull()
    expect(editorRedirectPath('/editorial')).toBeNull()
  })
  it('leaves mounting untouched on load failure and allows a later successful attempt', async () => {
    const mount = vi.fn(), failed = vi.fn()
    await loadEditor(async () => { throw new Error('offline') }, mount, failed)
    expect(mount).not.toHaveBeenCalled()
    expect(failed).toHaveBeenCalledOnce()
    await loadEditor(async () => 'editor', mount, failed)
    expect(mount).toHaveBeenCalledExactlyOnceWith('editor')
  })
})
