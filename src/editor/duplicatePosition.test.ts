import { describe, expect, it } from 'vitest'
import { defaultFinishes, getConcept } from '../catalog'
import { createSampleProject } from '../domain/sample'
import type { FurnitureInstance } from '../domain/types'
import { validateProjectSpatial } from '../geometry'
import { validateStructure } from '../validation/structural'
import { duplicateOffset } from './duplicatePosition'

describe('duplicate candidate placement', () => {
  it('places an arbitrarily rotated, flipped, elevated lamp on integer millimeters', () => {
    const envelope = createSampleProject(), concept = getConcept(2, 'LMP-SCA-01')!
    const lamp: FurnitureInstance = { id: crypto.randomUUID(), conceptId: concept.id, centerXMm: 3000, centerZMm: 2400, quarterTurn: 1, rotationDegrees: 105, elevationMm: 100, flipHorizontal: true, flipVertical: true, finishes: defaultFinishes(concept), comments: [] }
    envelope.project.instances.push(lamp)
    const [dx, dz] = duplicateOffset(envelope.project, lamp, concept)
    expect(dx).toBeGreaterThan(0)
    expect(dz).toBe(0)
    const copy = { ...lamp, id: crypto.randomUUID(), centerXMm: lamp.centerXMm + dx, centerZMm: lamp.centerZMm + dz, finishes: { ...lamp.finishes }, comments: [] }
    envelope.project.instances.push(copy)
    expect(Number.isInteger(copy.centerXMm) && Number.isInteger(copy.centerZMm)).toBe(true)
    expect(validateStructure(envelope).success).toBe(true)
    expect(validateProjectSpatial(envelope.project).filter((issue) => issue.severity === 'hard')).toEqual([])
    expect([copy.rotationDegrees, copy.elevationMm, copy.flipHorizontal, copy.flipVertical]).toEqual([105, 100, true, true])
  })
  it.each([0, 1, 2, 3] as const)('uses exact extents for quarter turn %s', (q) => {
    const project = createSampleProject().project, source = { ...project.instances[0], quarterTurn: q, centerXMm: 5000, centerZMm: 1750 }
    project.room.widthMm = 10000; project.instances = [source]
    const concept = getConcept(2, source.conceptId)!
    const [dx, dz] = duplicateOffset(project, source, concept)
    expect([dx, dz]).toEqual([q % 2 ? 1030 : 1950, 0])
  })
  it('tries the left side when the right side would cross a wall', () => {
    const project = createSampleProject().project, source = { ...project.instances[0], centerXMm: 3500, centerZMm: 800, rotationDegrees: 15 }
    project.room.widthMm = 5000; project.instances = [source]
    const [dx, dz] = duplicateOffset(project, source, getConcept(2, source.conceptId)!)
    expect(dx).toBeLessThan(0); expect(dz).toBe(0)
    expect(validateProjectSpatial({ ...project, instances: [{ ...source, centerXMm: source.centerXMm + dx }] }).filter((i) => i.severity === 'hard')).toEqual([])
  })
  it('returns the original position when no directional candidate fits', () => {
    const project = createSampleProject().project, source = { ...project.instances[0], centerXMm: 1000, centerZMm: 500 }
    project.room.widthMm = 2000; project.room.depthMm = 1000; project.instances = [source]
    expect(duplicateOffset(project, source, getConcept(2, source.conceptId)!)).toEqual([0, 0])
  })
})
