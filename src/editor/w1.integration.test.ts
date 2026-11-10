import { afterEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { defaultFinishes, getAvailableConcepts, getConcept } from '../catalog'
import { createSampleProject } from '../domain/sample'
import { validateStructure } from '../validation/structural'
import { getPlanPrimitives, validateProjectSpatial } from '../geometry'
import { captureSnapshot } from '../exports/snapshot'
import { createPlan } from '../exports/export'
import { NookDatabase, readRecord, saveRecord } from '../persistence/db'

const databases: NookDatabase[] = []
afterEach(async () => { for (const database of databases.splice(0)) await database.delete() })

describe('W1 catalog integration', () => {
  it('round trips the W1 baseline set with its authored finishes, placement and plan', async () => {
    const envelope = createSampleProject()
    envelope.project.name = 'Eight-piece Scandinavian study'
    const placements = [
      ['CHR-SCA-01', 700, 2300, 3],
      ['SFT-SCA-01', 3250, 800, 0],
      ['MED-SCA-01', 2000, 3300, 2],
      ['BKC-SCA-01', 160, 800, 3],
      ['LMP-SCA-01', 3300, 2000, 0],
    ] as const
    for (const [conceptId, centerXMm, centerZMm, quarterTurn] of placements) {
      const concept = getConcept(2, conceptId)!
      envelope.project.instances.push({ id: crypto.randomUUID(), conceptId, centerXMm, centerZMm, quarterTurn, finishes: defaultFinishes(concept) })
    }
    expect(getAvailableConcepts()).toHaveLength(46)
    expect(validateStructure(envelope).success).toBe(true)
    expect(validateProjectSpatial(envelope.project)).toEqual([])
    const database = new NookDatabase(`nook-w1-${crypto.randomUUID()}`)
    databases.push(database)
    const version = await saveRecord(database, envelope, null)
    const reopened = await readRecord(database, envelope.project.id)
    expect(version).toBe(1)
    expect(reopened.envelope).toEqual(envelope)
    const snapshot = captureSnapshot(reopened.envelope)
    const svg = createPlan(snapshot)
    const plan = getPlanPrimitives(snapshot.envelope.project)
    expect(plan.items).toHaveLength(8)
    for (const item of plan.items) {
      expect(item.pathD.length).toBeGreaterThan(0)
      expect(svg).toContain(item.pathD)
      expect(svg).toContain(getConcept(2, item.conceptId)!.name)
    }
    envelope.project.instances[3].centerXMm = 0
    expect(snapshot.envelope.project.instances[3].centerXMm).toBe(700)
  })
})
