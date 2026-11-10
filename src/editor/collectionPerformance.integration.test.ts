import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { CATALOG, defaultFinishes, getAvailableConcepts, getConcept } from '../catalog'
import { createSampleProject } from '../domain/sample'
import { validateProjectSpatial, getPlanPrimitives } from '../geometry'
import { validateStructure } from '../validation/structural'
import { captureSnapshot } from '../exports/snapshot'
import { createPlan } from '../exports/export'
import { NookDatabase, readRecord, saveRecord } from '../persistence/db'

// Actual baseline room assembled through the visible editor; see before-24-plan.svg.
const placements = [
  [
    "SOF-SCA-01",
    1500,
    1000
  ],
  [
    "CHR-SCA-01",
    4500,
    1000
  ],
  [
    "CFT-SCA-01",
    7500,
    1000
  ],
  [
    "SFT-SCA-01",
    10500,
    1000
  ],
  [
    "MED-SCA-01",
    1500,
    3000
  ],
  [
    "BKC-SCA-01",
    4500,
    3000
  ],
  [
    "RUG-SCA-01",
    7500,
    3000
  ],
  [
    "LMP-SCA-01",
    10500,
    3000
  ],
  [
    "SOF-MCM-01",
    1500,
    5000
  ],
  [
    "CHR-MCM-01",
    4500,
    5000
  ],
  [
    "CFT-MCM-01",
    7500,
    5000
  ],
  [
    "SFT-MCM-01",
    10500,
    5000
  ],
  [
    "MED-MCM-01",
    1500,
    7000
  ],
  [
    "BKC-MCM-01",
    4500,
    7000
  ],
  [
    "RUG-MCM-01",
    7500,
    7000
  ],
  [
    "LMP-MCM-01",
    10500,
    7000
  ],
  [
    "SOF-SCA-01",
    6000,
    6000
  ],
  [
    "CHR-SCA-01",
    6000,
    5000
  ],
  [
    "CFT-SCA-01",
    6000,
    6750
  ],
  [
    "SFT-SCA-01",
    5250,
    5250
  ],
  [
    "MED-SCA-01",
    6000,
    7250
  ],
  [
    "BKC-SCA-01",
    7000,
    6750
  ],
  [
    "RUG-SCA-01",
    6000,
    6000
  ],
  [
    "LMP-SCA-01",
    6750,
    5250
  ]
] as const
const databases: NookDatabase[] = []
afterEach(async () => { for (const database of databases.splice(0)) await database.delete() })
function maximumScene() {
  const envelope = createSampleProject()
  Object.assign(envelope.project.room, { widthMm: 12000, depthMm: 12000 })
  envelope.project.name = 'Performance — 24-piece baseline'
  envelope.project.instances = placements.map(([conceptId, centerXMm, centerZMm]) => ({ id: crypto.randomUUID(), conceptId, centerXMm, centerZMm, quarterTurn: 0, finishes: defaultFinishes(getConcept(2, conceptId)!) }))
  return envelope
}

describe('maximum-scene compatibility and outputs', () => {
  it('keeps the captured mixed 24-piece room valid and round trips its complete snapshot', async () => {
    const envelope = maximumScene()
    expect(envelope.project.instances).toHaveLength(24)
    expect(validateStructure(envelope).success).toBe(true)
    expect(validateProjectSpatial(envelope.project)).toEqual([])
    const database = new NookDatabase(`nook-performance-${crypto.randomUUID()}`)
    databases.push(database)
    await saveRecord(database, envelope, null)
    const reopened = await readRecord(database, envelope.project.id)
    expect(reopened.envelope).toEqual(envelope)
    const snapshot = captureSnapshot(reopened.envelope)
    const plan = getPlanPrimitives(snapshot.envelope.project)
    const svg = createPlan(snapshot)
    expect(plan.items).toHaveLength(24)
    for (const item of plan.items) expect(svg).toContain(item.pathD)
    expect(svg).toContain('12000 mm')
    expect(svg).toContain('24. Drum-shade Floor Lamp')
    envelope.project.instances[0].centerXMm += 100
    expect(snapshot.envelope.project.instances[0].centerXMm).toBe(1500)
  })
  it('continues to reject a 25th placed object', () => {
    const envelope = maximumScene()
    envelope.project.instances.push({ ...envelope.project.instances[0], id: crypto.randomUUID() })
    expect(validateStructure(envelope).success).toBe(false)
    expect(validateProjectSpatial(envelope.project).some(issue => issue.code === 'capacity' && issue.severity === 'hard')).toBe(true)
  })
})

describe('expanded catalog compatibility', () => {
  it('retains the catalog families alongside ten Filipino designs and three plants', () => {
    expect(CATALOG.filter(concept => concept.style !== 'FIL' && concept.style !== 'PLT')).toHaveLength(57)
    expect(CATALOG.filter(concept => concept.style === 'PLT')).toHaveLength(3)
    expect(getAvailableConcepts()).toHaveLength(46)
    expect(CATALOG.filter(concept => concept.style === 'FIL').map(concept => concept.id).sort()).toEqual(['BKC-FIL-01', 'CFT-FIL-01', 'CHR-FIL-01', 'LMP-FIL-01', 'MED-FIL-01', 'RUG-FIL-01', 'SFT-FIL-01', 'SOF-FIL-01', 'SOF-FIL-02', 'SOF-FIL-03'])
    expect(CATALOG.some(concept => concept.id.includes('-GEN-'))).toBe(false)
  })
  it('round trips the pilot with mirrors, rotation, elevation and local comments', async () => {
    const envelope = createSampleProject()
    const concept = getConcept(2, 'CHR-FIL-01')!
    const chair = { id: crypto.randomUUID(), conceptId: concept.id, centerXMm: 700, centerZMm: 2300, quarterTurn: 1 as const, rotationDegrees: 105, flipHorizontal: true, flipVertical: true, elevationMm: 120, finishes: defaultFinishes(concept), comments: ['Opaque weave pilot'] }
    envelope.project.instances.push(chair)
    expect(validateStructure(envelope).success).toBe(true)
    expect(validateProjectSpatial(envelope.project)).toEqual([])
    const database = new NookDatabase(`nook-chair-${crypto.randomUUID()}`)
    databases.push(database)
    await saveRecord(database, envelope, null)
    const reopened = await readRecord(database, envelope.project.id)
    expect(reopened.envelope).toEqual(envelope)
    const snapshot = captureSnapshot(reopened.envelope)
    const plan = getPlanPrimitives(snapshot.envelope.project)
    const item = plan.items.find(entry => entry.id === chair.id)!
    expect(item.pathD.length).toBeGreaterThan(0)
    const svg = createPlan(snapshot)
    expect(svg).toContain(item.pathD)
    expect(svg).toContain('Curved-cane Lounge Chair')
    expect(svg).toContain('turn 105°; horizontal flip true; vertical flip true')
    chair.comments.push('Later edit')
    expect(snapshot.envelope.project.instances.find(entry => entry.id === chair.id)!.comments).toEqual(['Opaque weave pilot'])
    const invalid = structuredClone(reopened.envelope)
    invalid.project.instances[3].finishes.Weave = 'OAK'
    expect(validateStructure(invalid).success).toBe(false)
  })
  it('fits the pilot into the captured maximum scene without increasing capacity', () => {
    const envelope = maximumScene()
    const oldChair = envelope.project.instances[17]
    const concept = getConcept(2, 'CHR-FIL-01')!
    envelope.project.instances[17] = { ...oldChair, conceptId: concept.id, finishes: defaultFinishes(concept) }
    expect(envelope.project.instances).toHaveLength(24)
    expect(validateStructure(envelope).success).toBe(true)
    expect(validateProjectSpatial(envelope.project)).toEqual([])
  })
})
