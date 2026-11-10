import { describe, expect, it } from 'vitest'
import { CATALOG, getAvailableConcepts, getConcept } from '../catalog'
import { createSampleProject } from '../domain/sample'
import { validateStructure } from './structural'

const sample = () => createSampleProject()

describe('revision 2 catalog', () => {
  it('contains the expanded catalog with ten Filipino designs and three plants', () => {
    expect(CATALOG).toHaveLength(70)
    expect(new Set(CATALOG.map((x) => x.id)).size).toBe(70)
    expect(getAvailableConcepts()).toHaveLength(46)
    expect(getAvailableConcepts().filter(x=>x.style==='FIL')).toHaveLength(10)
    expect(getAvailableConcepts().filter(x=>x.style==='PLT')).toHaveLength(3)
    expect(getConcept(1, 'SOF-SCA-01')).toBeUndefined()
    expect(getConcept(2, 'CFT-SCA-01')?.footprint).toEqual({ kind: 'roundedRectangle', radiusMm: 60 })
  })
})

describe('structural validation (not spatial validation)', () => {
  it('accepts the approved sample with independent IDs and exact placement', () => {
    const data = sample()
    expect(data.project.instances.map(({ centerXMm, centerZMm }) => [centerXMm, centerZMm])).toEqual([[2000, 800], [2000, 1900], [2000, 1650]])
    expect(validateStructure(data).success).toBe(true)
  })
  it('rejects unsupported revisions, unknown and unavailable concepts', () => {
    const data = sample()
    expect(validateStructure({ ...data, catalogRevision: 3 }).success).toBe(false)
    data.project.instances[0].conceptId = 'CHR-CON-01'
    const result = validateStructure(data)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((x) => x.message.includes('not yet available'))).toBe(true)
    data.project.instances[0].conceptId = 'MISSING'
    expect(validateStructure(data).success).toBe(false)
  })
  it('rejects duplicate IDs, extra fields, invalid names and non-v4 IDs', () => {
    const data = sample()
    data.project.instances[0].id = data.project.room.id
    expect(validateStructure(data).success).toBe(false)
    expect(validateStructure({ ...sample(), executable: 'x' }).success).toBe(false)
    const invalid = sample()
    invalid.project.name = '  Room  '
    invalid.project.id = '00000000-0000-0000-0000-000000000000'
    expect(validateStructure(invalid).success).toBe(false)
  })
  it('enforces exact finish regions and paired rug choices', () => {
    const data = sample()
    expect(validateStructure(data).success).toBe(true)
    data.project.instances[0].finishes.Frame = 'OFF'
    expect(validateStructure(data).success).toBe(true)
    data.project.instances[0].finishes.Frame = 'CAN'
    expect(validateStructure(data).success).toBe(false)
    const rug = sample()
    rug.project.instances[2].finishes.TextileMotif = 'OAT'
    expect(validateStructure(rug).success).toBe(false)
    const extra = sample()
    extra.project.instances[1].finishes.Extra = 'OAK'
    expect(validateStructure(extra).success).toBe(false)
    const swap = sample()
    swap.project.instances[2].finishes = { TextileGround: 'RBL', TextileMotif: 'OAT' }
    expect(validateStructure(swap).success).toBe(true)
  })
  it('rejects fractional, nonfinite, out-of-range, and excessive input', () => {
    for (const value of [999, 12001, 4000.5, Infinity]) {
      const data = sample()
      data.project.room.widthMm = value
      expect(validateStructure(data).success).toBe(false)
    }
    const data = sample()
    data.project.instances = Array.from({ length: 25 }, () => ({ ...sample().project.instances[0] }))
    expect(validateStructure(data).success).toBe(false)
  })
  it('does not claim that structurally valid placements fit the room', () => {
    const data = sample()
    data.project.instances[0].centerXMm = 0
    expect(validateStructure(data).success).toBe(true)
  })
})
