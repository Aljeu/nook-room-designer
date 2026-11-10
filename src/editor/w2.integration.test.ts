import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { defaultFinishes, getAvailableConcepts, getConcept } from '../catalog'
import { createSampleProject } from '../domain/sample'
import type { FurnitureInstance, ProjectEnvelope } from '../domain/types'
import { validateStructure } from '../validation/structural'
import { getPlanPrimitives, validateProjectSpatial } from '../geometry'
import { captureSnapshot } from '../exports/snapshot'
import { createPlan } from '../exports/export'
import { NookDatabase, readRecord, saveRecord } from '../persistence/db'

const databases: NookDatabase[] = []
afterEach(async () => { for (const database of databases.splice(0)) await database.delete() })

function mcmStudy(): ProjectEnvelope {
  const envelope = createSampleProject()
  envelope.project.name = 'Mid-century — eight-piece study'
  envelope.project.room.widthMm = 6000
  envelope.project.room.depthMm = 5000
  const placements = [
    ['SOF-MCM-01', 3000, 1000, 0], ['CHR-MCM-01', 1200, 2300, 3],
    ['CFT-MCM-01', 3000, 2400, 0], ['SFT-MCM-01', 4600, 1000, 0],
    ['MED-MCM-01', 3000, 4700, 2], ['BKC-MCM-01', 170, 1100, 3],
    ['RUG-MCM-01', 3000, 2100, 0], ['LMP-MCM-01', 4700, 2600, 0],
  ] as const
  envelope.project.instances = placements.map(([conceptId, centerXMm, centerZMm, quarterTurn]) => {
    const concept = getConcept(2, conceptId)!
    return { id: crypto.randomUUID(), conceptId, centerXMm, centerZMm, quarterTurn, finishes: defaultFinishes(concept) }
  })
  return envelope
}

describe('W2 catalogue integration', () => {
  it('round trips MCM geometry, paired rug colors and richer transforms through saved data and plans', async () => {
    const envelope = mcmStudy()
    const chair = envelope.project.instances.find(item => item.conceptId === 'CHR-MCM-01')!
    Object.assign(chair, { rotationDegrees: 105, quarterTurn: 1, flipHorizontal: true, elevationMm: 10, comments: ['W2 review note'] })
    const rug = envelope.project.instances.find(item => item.conceptId === 'RUG-MCM-01')!
    rug.finishes = { TextileGround: 'RBL', TextileMotif: 'OAT' }
    expect(getAvailableConcepts()).toHaveLength(46)
    expect(validateStructure(envelope).success).toBe(true)
    expect(validateProjectSpatial(envelope.project)).toEqual([])
    const database = new NookDatabase(`nook-w2-${crypto.randomUUID()}`)
    databases.push(database)
    const version = await saveRecord(database, envelope, null)
    const reopened = await readRecord(database, envelope.project.id)
    expect(version).toBe(1)
    expect(reopened.envelope).toEqual(envelope)
    const snapshot = captureSnapshot(reopened.envelope)
    const plan = getPlanPrimitives(snapshot.envelope.project)
    const svg = createPlan(snapshot)
    expect(plan.items).toHaveLength(8)
    for (const item of plan.items) {
      expect(item.pathD.length).toBeGreaterThan(0)
      expect(svg).toContain(item.pathD)
      expect(svg).toContain(getConcept(2, item.conceptId)!.name)
    }
    expect(svg).toContain('turn 105°; horizontal flip true')
    chair.comments!.push('Later edit')
    expect(snapshot.envelope.project.instances.find(item => item.id === chair.id)!.comments).toEqual(['W2 review note'])
  })
  it('keeps the W2 SCA/MCM arrangement valid while tracking the expanded catalog', () => {
    const envelope = createSampleProject()
    const additions = [['CHR-SCA-01', 700, 2300, 3], ['SFT-SCA-01', 3250, 800, 0], ['MED-SCA-01', 2000, 3300, 2], ['BKC-SCA-01', 160, 800, 3], ['LMP-SCA-01', 3300, 2000, 0]] as const
    for (const [conceptId, centerXMm, centerZMm, quarterTurn] of additions) envelope.project.instances.push({ id: crypto.randomUUID(), conceptId, centerXMm, centerZMm, quarterTurn, finishes: defaultFinishes(getConcept(2, conceptId)!) })
    const mcm = mcmStudy().project.instances.map((item): FurnitureInstance => ({ ...item, centerXMm: item.centerXMm + 6000, centerZMm: item.centerZMm + 4000 }))
    envelope.project.room.widthMm = 12000
    envelope.project.room.depthMm = 10000
    envelope.project.instances.push(...mcm)
    expect(envelope.project.instances).toHaveLength(16)
    expect(validateStructure(envelope).success).toBe(true)
    expect(validateProjectSpatial(envelope.project)).toEqual([])
    expect(getAvailableConcepts().filter(c => c.style === 'SCA')).toHaveLength(10)
    expect(getAvailableConcepts().filter(c => c.style === 'MCM')).toHaveLength(15)
    expect(getAvailableConcepts().some(c => ['CON', 'IND', 'TRA'].includes(c.style))).toBe(false)
  })
})
