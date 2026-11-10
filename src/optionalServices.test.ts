import { describe, expect, it, vi } from 'vitest'
import { createSampleProject } from './domain/sample'
import { prepareCapturedExport, saveCapturedProject } from './optionalServices'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('on-demand services', () => {
  it('saves the pre-load design and version even if edits occur while loading', async () => {
    const envelope = createSampleProject()
    const pending = deferred<(value: typeof envelope, version: number | null) => Promise<number>>()
    const save = vi.fn(async (_value: typeof envelope, _version: number | null) => 5)
    const result = saveCapturedProject(envelope, 4, () => pending.promise)
    envelope.project.name = 'A later edit'
    pending.resolve(save)
    expect(await result).toBe(5)
    expect(save.mock.calls[0]![0].project.name).not.toBe('A later edit')
    expect(save.mock.calls[0]![1]).toBe(4)
  })
  it('prepares both outputs from the snapshot made before the module loads', async () => {
    const envelope = createSampleProject()
    const pending = deferred<{ createPlan: (snapshot: import('./exports/snapshot').Snapshot) => string; createPng: (snapshot: import('./exports/snapshot').Snapshot) => Promise<Blob> }>()
    const createPlan = vi.fn((snapshot: import('./exports/snapshot').Snapshot) => snapshot.envelope.project.name)
    const createPng = vi.fn(async (snapshot: import('./exports/snapshot').Snapshot) => new Blob([snapshot.envelope.project.name]))
    const result = prepareCapturedExport(envelope, () => pending.promise)
    envelope.project.name = 'A later edit'
    pending.resolve({ createPlan, createPng })
    const prepared = await result
    expect(prepared.snapshot.envelope.project.name).not.toBe('A later edit')
    expect(createPlan).toHaveBeenCalledWith(prepared.snapshot)
    expect(createPng).toHaveBeenCalledWith(prepared.snapshot)
    expect(await prepared.svg.text()).toBe(prepared.snapshot.envelope.project.name)
    expect(await prepared.png.text()).toBe(prepared.snapshot.envelope.project.name)
  })
})
