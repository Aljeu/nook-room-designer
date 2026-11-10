import Dexie, { type Table } from 'dexie'
import type { ProjectEnvelope } from '../domain/types'
import { validateDesign } from '../editor/store'

export type SavedRecord = { id: string; envelope: ProjectEnvelope; recordVersion: number; pinned?: boolean }
export class NookDatabase extends Dexie {
  projects!: Table<SavedRecord, string>
  constructor(name = 'nook') { super(name); this.version(1).stores({ projects: 'id' }) }
}
export const db = new NookDatabase()
export async function saveRecord(database: NookDatabase, envelope: ProjectEnvelope, expectedVersion: number | null): Promise<number> {
  const copy = structuredClone(envelope)
  const invalid = validateDesign(copy)
  if (invalid) throw new Error(invalid)
  return database.transaction('rw', database.projects, async () => {
    const id = copy.project.id
    const current = await database.projects.get(id)
    if ((current?.recordVersion ?? null) !== expectedVersion) throw new Error('This option changed in another session. Open it again or save a separate option.')
    const recordVersion = (current?.recordVersion ?? 0) + 1
    const record = { id, envelope: copy, recordVersion, pinned: current?.pinned ?? false }
    if (current) await database.projects.put(record)
    else await database.projects.add(record)
    return recordVersion
  })
}
export async function readRecord(database: NookDatabase, id: string): Promise<SavedRecord> {
  const record = await database.projects.get(id)
  if (!record || record.id !== record.envelope.project.id) throw new Error('This saved option could not be read.')
  const invalid = validateDesign(record.envelope)
  if (invalid) throw new Error(`Cannot open this option: ${invalid}`)
  return record
}
