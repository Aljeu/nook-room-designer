import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { NumberField } from './Fields'
import { ViewControls } from './ViewControls'
import { ObjectActionWheel } from './ObjectActionWheel'
import { createSampleProject } from '../domain/sample'
import { useEditor } from '../editor/store'
import { canonicalPose, stepPose } from '../scene/camera'

describe('editor accessibility and camera commands', () => {
  it('keeps object actions named when their visual tooltips are hidden', () => {
    const html = renderToStaticMarkup(createElement(ObjectActionWheel, { x: 100, y: 100, canCopy: true, closing: false, onAction: () => {}, onRotateStart: () => {}, onRotateMove: () => {}, onRotateEnd: () => {}, onRotateCancel: () => {}, onCloseComplete: () => {} }))
    expect(html).toContain('aria-label="Flip top to bottom"')
    expect(html).toContain('object-wheel-tooltip tooltip-')
    expect(html).toContain('aria-hidden="true">Flip top to bottom</span>')
    expect(html).not.toContain('title="Flip top to bottom"')
  })
  it('names measurement units and associates guidance without changing canonical units', () => {
    const html = renderToStaticMarkup(createElement(NumberField, { label: 'Across room', unit: 'cm', scale: 10, value: 3301, help: 'Measured to the center.', onCommit: () => null }))
    expect(html).toContain('Across room<span class="sr-only"> (cm)</span>')
    expect(html).toContain('value="330.1"')
    expect(html).toContain('aria-describedby=')
    expect(html).toContain('Measured to the center.')
  })
  it('keeps camera adjustments accessible while locked and retains an unlock action', () => {
    const html = renderToStaticMarkup(createElement(ViewControls, { locked: true, zoom: 1, view: 'isometric', onZoom: () => {}, onReset: () => {}, onToggleLock: () => {}, wallsUp: false, onToggleWalls: () => {}, onPreset: () => {} }))
    expect(html).toContain('aria-label="Camera controls"')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Unlock view')
    expect(html).toContain('Front view')
  })
  it('makes pointer camera steps continuous around the room and bounds tilt', () => {
    const initial = canonicalPose()
    let pose = initial
    for (let index = 0; index < 24; index++) pose = stepPose(pose, 15, 0)
    expect(pose.azimuth - initial.azimuth).toBeCloseTo(2 * Math.PI)
    expect(pose.elevation).toBe(initial.elevation)
    expect(stepPose(pose, 0, 1000).elevation).toBeCloseTo(Math.PI / 2 - .0001)
    expect(stepPose(pose, 0, -1000).elevation).toBeCloseTo(0)
  })
  it('distinguishes enforced rejection from advisory overlap and preserves the rejected design', () => {
    useEditor.setState({ envelope: createSampleProject(), past: [], future: [], selectedId: null, token: 0, savedToken: null, session: 0, recordVersion: null })
    const before = structuredClone(useEditor.getState().envelope)
    expect(useEditor.getState().commit((project) => { project.instances[0].centerXMm = 0 })).toBe(false)
    expect(useEditor.getState().messageKind).toBe('error')
    expect(useEditor.getState().envelope).toEqual(before)
    expect(useEditor.getState().commit((project) => { project.instances[1].centerZMm = project.instances[0].centerZMm })).toBe(true)
    expect(useEditor.getState().messageKind).toBe('warning')
    useEditor.getState().undo()
    expect(useEditor.getState().messageKind).toBe('info')
  })
})
