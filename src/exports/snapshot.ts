import type { ProjectEnvelope } from '../domain/types'
import { validateDesign } from '../editor/store'
export type Snapshot = { id: string; label: string; envelope: ProjectEnvelope }
export function captureSnapshot(envelope: ProjectEnvelope): Snapshot {
  const copy = structuredClone(envelope)
  const error = validateDesign(copy)
  if (error) throw new Error(error)
  const id = crypto.randomUUID()
  return { id, label: id.slice(0, 8), envelope: copy }
}
