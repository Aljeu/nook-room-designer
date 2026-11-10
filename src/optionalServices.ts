import type { ProjectEnvelope } from './domain/types'
import { captureSnapshot, type Snapshot } from './exports/snapshot'

type SaveOperation = (envelope: ProjectEnvelope, version: number | null) => Promise<number>
type ExportOperations = { createPlan: (snapshot: Snapshot) => string; createPng: (snapshot: Snapshot) => Promise<Blob> }
const loadSave = async (): Promise<SaveOperation> => {
  const { db, saveRecord } = await import('./persistence/db')
  return (envelope, version) => saveRecord(db, envelope, version)
}
const loadExport = async (): Promise<ExportOperations> => import('./exports/export')

/** Snapshot before module loading; the caller tracks its session and change token. */
export async function saveCapturedProject(envelope: ProjectEnvelope, version: number | null, load: () => Promise<SaveOperation> = loadSave): Promise<number> {
  const captured = structuredClone(envelope)
  return (await load())(captured, version)
}
export async function prepareCapturedExport(envelope: ProjectEnvelope, load: () => Promise<ExportOperations> = loadExport) {
  const snapshot = captureSnapshot(envelope)
  const { createPlan, createPng } = await load()
  const svg = new Blob([createPlan(snapshot)], { type: 'image/svg+xml' })
  const png = await createPng(snapshot)
  return { snapshot, svg, png }
}
