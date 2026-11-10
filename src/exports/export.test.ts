import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSampleProject } from '../domain/sample'
import { getPlanPrimitives } from '../geometry'
import { captureSnapshot } from './snapshot'
import { createPlan, createPng } from './export'

vi.mock('../scene/capture', () => ({ captureRoomPng: vi.fn(async () => new Blob(['room'], { type: 'image/png' })) }))
class BrandImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) { queueMicrotask(() => this.onload?.()) }
}
beforeEach(() => vi.stubGlobal('Image', BrandImage))
afterEach(() => vi.unstubAllGlobals())

describe('snapshot exports', () => {
  it('uses segmented shared wall bands and opening symbols instead of a solid boundary', () => {
    const envelope = createSampleProject()
    envelope.project.room.openings.push({ id: crypto.randomUUID(), type: 'door', wall: 'N', offsetMm: 500, widthMm: 900, heightMm: 2100, sillMm: 0, hinge: 'min' })
    const snapshot = captureSnapshot(envelope)
    const plan = getPlanPrimitives(snapshot.envelope.project)
    const svg = createPlan(snapshot)
    expect(svg).toContain(`<metadata>Snapshot ID: ${snapshot.id}</metadata>`)
    for (const wall of plan.walls) expect(svg).toContain(`<rect x="${wall.xMm}" y="${wall.zMm}" width="${wall.widthMm}" height="${wall.depthMm}" fill="#24302b"/>`)
    expect(plan.walls.some((wall) => wall.xMm === 500 && wall.zMm === -100 && wall.widthMm === 900)).toBe(false)
    expect(svg).not.toContain('height="3500" fill="#f3f1ea" stroke=')
    expect(svg).toContain(plan.openings[0].pathD)
    envelope.project.instances[0].centerXMm = 2500
    expect(createPlan(snapshot)).toBe(svg)
  })
  it('puts the same full snapshot identity in the PNG title band', async () => {
    const snapshot = captureSnapshot(createSampleProject())
    const fillText = vi.fn(); const drawImage = vi.fn(); const fillRect = vi.fn(); const close = vi.fn()
    const context = { fillText, drawImage, fillRect, save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), fillStyle: '', font: '' }
    const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png'])) }
    vi.stubGlobal('document', { createElement: () => canvas })
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close })))
    await createPng(snapshot)
    expect([canvas.width, canvas.height]).toEqual([1600, 1200])
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 32, 64, 1536, 1104)
    expect(fillText).toHaveBeenCalledWith(`Snapshot ID: ${snapshot.id}`, 32, 47, 1536)
    expect(close).toHaveBeenCalledOnce()
    expect(fillText).toHaveBeenCalledWith('NOOK', 83, 1147)
  })
  it('renders an architectural plan through an SVG image instead of createImageBitmap', async () => {
    const snapshot = captureSnapshot(createSampleProject())
    const drawImage = vi.fn(); const fillText = vi.fn(); const bitmap = vi.fn()
    const context = { fillText, drawImage, fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), fillStyle: '', font: '' }
    const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png'])) }
    class FakeImage {
      naturalWidth = 5000; naturalHeight = 5500
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) { queueMicrotask(() => this.onload?.()) }
    }
    const createObjectURL = vi.fn(() => 'blob:plan'); const revokeObjectURL = vi.fn()
    vi.stubGlobal('document', { createElement: () => canvas })
    vi.stubGlobal('Image', FakeImage)
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.stubGlobal('createImageBitmap', bitmap)
    await createPng(snapshot, { view: 'top', dimensions: true })
    expect(bitmap).not.toHaveBeenCalled()
    expect(drawImage).toHaveBeenCalledWith(expect.any(FakeImage), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:plan')
    expect(fillText).toHaveBeenCalledWith('NOOK', 83, 1147)
  })
})
