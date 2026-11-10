import { defaultFinishes, getConcept } from '../catalog'
import { DEFAULT_ROOM } from './constants'
import type { FurnitureInstance, ProjectEnvelope } from './types'

/** A fresh blank room used whenever the editor starts a new session. */
export function createEmptyProject(id: () => string = () => crypto.randomUUID()): ProjectEnvelope {
  return {
    format: 'nook-project', formatVersion: 1, catalogRevision: 2,
    project: {
      id: id(), name: 'Room 1',
      room: { id: id(), ...DEFAULT_ROOM, openings: [] },
      instances: [],
    },
  }
}

/** A new identity for every sample object; crypto.randomUUID produces UUID v4. */
export function createSampleProject(id: () => string = () => crypto.randomUUID()): ProjectEnvelope {
  const furniture = (conceptId: string, centerXMm: number, centerZMm: number): FurnitureInstance => {
    const concept = getConcept(2, conceptId)
    if (!concept) throw new Error(`Missing sample concept ${conceptId}`)
    return { id: id(), conceptId, centerXMm, centerZMm, quarterTurn: 0, finishes: defaultFinishes(concept) }
  }
  return {
    format: 'nook-project', formatVersion: 1, catalogRevision: 2,
    project: {
      id: id(), name: 'Room 1',
      room: { id: id(), ...DEFAULT_ROOM, openings: [] },
      instances: [furniture('SOF-SCA-01', 2000, 800), furniture('CFT-SCA-01', 2000, 1900), furniture('RUG-SCA-01', 2000, 1650)],
    },
  }
}
