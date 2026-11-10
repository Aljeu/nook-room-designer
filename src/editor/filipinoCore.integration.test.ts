import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { defaultFinishes, getConcept } from '../catalog'
import { createSampleProject } from '../domain/sample'
import { validateProjectSpatial, getPlanPrimitives } from '../geometry'
import { validateStructure } from '../validation/structural'
import { captureSnapshot } from '../exports/snapshot'
import { createPlan } from '../exports/export'
import { NookDatabase, readRecord, saveRecord } from '../persistence/db'

const placements = [
  ['SOF-FIL-01', 3000, 1000, 0], ['CHR-FIL-01', 1100, 2200, 3],
  ['CFT-FIL-01', 3000, 2300, 0], ['SFT-FIL-01', 4400, 1000, 0],
  ['MED-FIL-01', 3000, 4700, 2], ['BKC-FIL-01', 170, 1100, 3],
  ['RUG-FIL-01', 3000, 2100, 0], ['LMP-FIL-01', 4700, 2600, 0],
] as const
const databases: NookDatabase[] = []
afterEach(async () => { for (const db of databases.splice(0)) await db.delete() })
function study() {
  const envelope = createSampleProject()
  envelope.project.name = 'Filipino — eight-piece study'
  Object.assign(envelope.project.room, { widthMm: 6000, depthMm: 5000 })
  envelope.project.instances = placements.map(([conceptId, centerXMm, centerZMm, quarterTurn]) => ({ id: crypto.randomUUID(), conceptId, centerXMm, centerZMm, quarterTurn, finishes: defaultFinishes(getConcept(2, conceptId)!) }))
  return envelope
}
describe('Filipino core room integration', () => {
  it('round trips all eight core pieces and their shared snapshot through storage and floor plans', async () => {
    const envelope = study()
    const rug = envelope.project.instances.find(item => item.conceptId === 'RUG-FIL-01')!
    rug.finishes = { TextileGround: 'RBL', TextileMotif: 'OAT' }
    expect(validateStructure(envelope).success).toBe(true)
    expect(validateProjectSpatial(envelope.project)).toEqual([])
    const db = new NookDatabase(`nook-fil-core-${crypto.randomUUID()}`)
    databases.push(db)
    await saveRecord(db, envelope, null)
    const reopened = await readRecord(db, envelope.project.id)
    expect(reopened.envelope).toEqual(envelope)
    const snapshot = captureSnapshot(reopened.envelope)
    const plan = getPlanPrimitives(snapshot.envelope.project)
    const svg = createPlan(snapshot)
    expect(plan.items).toHaveLength(8)
    for (const item of plan.items) {
      expect(svg).toContain(item.pathD)
      expect(svg).toContain(getConcept(2, item.conceptId)!.name)
    }
    expect(svg).toContain('6000 mm')
    expect(svg).toContain('5000 mm')
    const invalid = structuredClone(envelope)
    invalid.project.instances[0].finishes.Weave = 'OFF'
    expect(validateStructure(invalid).success).toBe(false)
    invalid.project.instances[0].finishes = defaultFinishes(getConcept(2, 'SOF-FIL-01')!)
    invalid.project.instances[6].finishes.TextileMotif = invalid.project.instances[6].finishes.TextileGround
    expect(validateStructure(invalid).success).toBe(false)
    envelope.project.instances[0].centerXMm += 100
    expect(snapshot.envelope.project.instances[0].centerXMm).toBe(3000)
  })
})
