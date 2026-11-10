import { create } from 'zustand'
import { createEmptyProject } from '../domain/sample'
import type { Project, ProjectEnvelope } from '../domain/types'
import { validateStructure } from '../validation/structural'
import { conservativeFootprintPolygon, validateProjectSpatial } from '../geometry'
import { validateWallAttachment, wallAttachmentMayOverlap, wallAttachmentPose } from '../geometry/wallAttachment'
import { getWallConcept } from '../catalog/wall'
import { getConcept } from '../catalog'

export type FeedbackKind = 'info' | 'success' | 'warning' | 'error'
type State = {
  envelope: ProjectEnvelope; selectedId: string | null; past: ProjectEnvelope[]; future: ProjectEnvelope[];
  session: number; token: number; savedToken: number | null; recordVersion: number | null; message: string; messageKind: FeedbackKind;
  select: (id: string | null) => void; report: (message: string, kind?: FeedbackKind) => void;
  commit: (update: (project: Project) => void) => boolean;
  undo: () => void; redo: () => void; open: (envelope: ProjectEnvelope, version: number) => void;
  saved: (id: string, session: number, token: number, version: number) => void;
}
export function validateDesign(envelope: ProjectEnvelope): string | null {
  const structural = validateStructure(envelope)
  if (!structural.success) return structural.error.issues[0]?.message ?? 'Invalid design'
  const spatial = validateProjectSpatial(envelope.project, envelope.catalogRevision).find((issue) => issue.severity === 'hard')
  if (spatial) return spatial.message
  for (const item of envelope.project.wallObjects ?? []) {
    const concept = getWallConcept(item.conceptId)
    if (!concept) return 'Unknown wall design'
    const issue = validateWallAttachment(envelope.project.room, { ...item, widthMm: concept.widthMm, heightMm: concept.heightMm, depthMm: concept.depthMm })[0]
    if (issue) return issue.message
  }
  return null
}
const activeProjectKey = 'nook-active-project-v1'
type ActiveProjectSnapshot = { version: 1; envelope: ProjectEnvelope; token: number; savedToken: number | null; recordVersion: number | null }
function restoreActiveProject(): ActiveProjectSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(activeProjectKey)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const candidate = value as Partial<ActiveProjectSnapshot>
    const validCounter = (counter: unknown) => counter === null || Number.isInteger(counter) && (counter as number) >= 0
    if (candidate.version !== 1 || !candidate.envelope || !Number.isInteger(candidate.token) || (candidate.token as number) < 0 || !validCounter(candidate.savedToken) || !validCounter(candidate.recordVersion) || validateDesign(candidate.envelope) !== null) {
      window.sessionStorage.removeItem(activeProjectKey)
      return null
    }
    return candidate as ActiveProjectSnapshot
  } catch { return null }
}
function persistActiveProject(state: State) {
  if (typeof window === 'undefined') return
  const snapshot: ActiveProjectSnapshot = { version: 1, envelope: state.envelope, token: state.token, savedToken: state.savedToken, recordVersion: state.recordVersion }
  try { window.sessionStorage.setItem(activeProjectKey, JSON.stringify(snapshot)) } catch { /* Session recovery is best-effort when browser storage is unavailable. */ }
}
function wallFurnitureOverlapGeometry(project: Project): Map<string, string> {
  const overlaps = new Map<string, string>()
  for (const wallItem of project.wallObjects ?? []) {
    const wallConcept = getWallConcept(wallItem.conceptId)
    if (!wallConcept) continue
    const pose = wallAttachmentPose(project.room, { ...wallItem, widthMm: wallConcept.widthMm, heightMm: wallConcept.heightMm, depthMm: wallConcept.depthMm })
    for (const item of project.instances) {
      const concept = getConcept(2, item.conceptId)
      if (!concept?.footprint || concept.category === 'RUG') continue
      const minYmm = item.elevationMm ?? 0
      const plan = conservativeFootprintPolygon(concept.footprint, concept.dimensions.widthMm, concept.dimensions.depthMm, item)
      if (!wallAttachmentMayOverlap(pose, { plan, minYmm, maxYmm: minYmm + concept.dimensions.heightMm })) continue
      const pair = `${wallItem.id}\u0000${item.id}`
      // Track just collision geometry. Finish, color, and other appearance edits
      // should not re-report an overlap that was already present.
      overlaps.set(pair, JSON.stringify({ pose, plan, minYmm, maxYmm: minYmm + concept.dimensions.heightMm }))
    }
  }
  return overlaps
}
const restoredActiveProject = restoreActiveProject()
export const useEditor = create<State>((set, get) => ({
  envelope: restoredActiveProject?.envelope ?? createEmptyProject(), selectedId: null, past: [], future: [], session: 0, token: restoredActiveProject?.token ?? 0, savedToken: restoredActiveProject?.savedToken ?? null, recordVersion: restoredActiveProject?.recordVersion ?? null,
  message: 'Choose an object to add, or select one in your room.', messageKind: 'info',
  select: (selectedId) => set({ selectedId }), report: (message, messageKind = 'info') => set({ message, messageKind }),
  commit: (update) => {
    const state = get(); const next = structuredClone(state.envelope); update(next.project)
    const hasVersionThreeDoorways = next.project.room.openings.some((opening) => opening.type === 'archway' || opening.type === 'door' && (opening.styleId !== undefined || opening.finish !== undefined))
    const hasVersionTwoAttributes = next.project.room.openings.some((opening) => opening.type === 'window' && (opening.styleId !== undefined || opening.treatment !== undefined || opening.treatmentColor !== undefined || opening.breezeEnabled !== undefined)) || next.project.instances.some((item) => item.breezeEnabled !== undefined || item.lampOn !== undefined || item.lampLight !== undefined || item.lampIntensity !== undefined) || (next.project.wallObjects ?? []).some((item) => item.lampOn !== undefined || item.lampLight !== undefined || item.lampIntensity !== undefined)
    if (next.project.wallObjects !== undefined || hasVersionTwoAttributes || (next.project.room.shape !== undefined && next.project.room.shape !== 'rectangle')) next.formatVersion = Math.max(next.formatVersion, 2) as ProjectEnvelope['formatVersion']
    if (hasVersionThreeDoorways) next.formatVersion = 3
    const error = validateDesign(next)
    if (error) { set({ message: error, messageKind: 'error' }); return false }
    if (JSON.stringify(next) === JSON.stringify(state.envelope)) return true
    const advisory = validateProjectSpatial(next.project, 2).find((issue) => issue.severity === 'advisory')
    const previousWallOverlaps = wallFurnitureOverlapGeometry(state.envelope.project)
    const nextWallOverlaps = wallFurnitureOverlapGeometry(next.project)
    const wallOverlap = [...nextWallOverlaps].some(([pair, geometry]) => previousWallOverlaps.get(pair) !== geometry)
    set({ envelope: next, past: [...state.past, state.envelope].slice(-100), future: [], token: state.token + 1, message: advisory?.message ?? (wallOverlap ? 'A wall object may overlap furniture.' : 'Change applied.'), messageKind: advisory || wallOverlap ? 'warning' : 'success' })
    return true
  },
  undo: () => { const s = get(); const previous = s.past.at(-1); if (previous) set({ envelope: previous, past: s.past.slice(0, -1), future: [s.envelope, ...s.future], token: s.token + 1, selectedId: [...previous.project.instances, ...(previous.project.wallObjects ?? []), ...previous.project.room.openings].some((i) => i.id === s.selectedId) ? s.selectedId : null, message: 'Change undone.', messageKind: 'info' }) },
  redo: () => { const s = get(); const next = s.future[0]; if (next) set({ envelope: next, past: [...s.past, s.envelope], future: s.future.slice(1), token: s.token + 1, selectedId: [...next.project.instances, ...(next.project.wallObjects ?? []), ...next.project.room.openings].some((i) => i.id === s.selectedId) ? s.selectedId : null, message: 'Change restored.', messageKind: 'info' }) },
  open: (envelope, version) => { const session = get().session + 1; const token = get().token + 1; set({ envelope, session, recordVersion: version, token, savedToken: token, selectedId: null, past: [], future: [], message: 'Saved option opened.', messageKind: 'success' }) },
  saved: (id, session, token, version) => { const s = get(); if (s.session === session && s.envelope.project.id === id) set({ recordVersion: version, savedToken: token === s.token ? token : s.savedToken, message: token === s.token ? 'Saved on this device.' : 'Earlier changes saved; newer changes are not saved.', messageKind: token === s.token ? 'success' : 'warning' }) },
}))
let activeProjectWriteTimer: ReturnType<typeof setTimeout> | undefined
function flushActiveProject() {
  if (activeProjectWriteTimer) clearTimeout(activeProjectWriteTimer)
  activeProjectWriteTimer = undefined
  persistActiveProject(useEditor.getState())
}
useEditor.subscribe((state, previous) => {
  if (state.envelope === previous.envelope && state.token === previous.token && state.savedToken === previous.savedToken && state.recordVersion === previous.recordVersion) return
  if (activeProjectWriteTimer) clearTimeout(activeProjectWriteTimer)
  activeProjectWriteTimer = setTimeout(flushActiveProject, 150)
})
if (typeof window !== 'undefined') window.addEventListener('pagehide', flushActiveProject)
