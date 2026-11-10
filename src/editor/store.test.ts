import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { createSampleProject } from '../domain/sample'
import { useEditor } from './store'
import { NookDatabase, readRecord, saveRecord } from '../persistence/db'
import { captureSnapshot } from '../exports/snapshot'

beforeEach(() => { useEditor.setState({ envelope: createSampleProject(), selectedId: null, past: [], future: [], session: 0, token: 0, savedToken: null, recordVersion: null }) })
describe('editor foundation', () => {
  it('rejects the sample sofa quarter-turn beyond the wall and preserves the arrangement', () => {
    const before = structuredClone(useEditor.getState().envelope)
    const result = useEditor.getState().commit((p) => { p.instances[0].quarterTurn = 1 })
    expect(result).toBe(false)
    expect(useEditor.getState().envelope).toEqual(before)
    expect(useEditor.getState().past).toHaveLength(0)
  })
  it('undoes and redoes one committed finish change', () => {
    useEditor.getState().commit((p) => { p.instances[0].finishes.Upholstery = 'BLU' })
    expect(useEditor.getState().envelope.project.instances[0].finishes.Upholstery).toBe('BLU')
    useEditor.getState().undo()
    expect(useEditor.getState().envelope.project.instances[0].finishes.Upholstery).toBe('LIN')
    useEditor.getState().redo()
    expect(useEditor.getState().envelope.project.instances[0].finishes.Upholstery).toBe('BLU')
  })
  it('captures an independent snapshot of unsaved edits', () => {
    const snapshot = captureSnapshot(useEditor.getState().envelope)
    useEditor.getState().commit((p) => { p.instances[0].finishes.Upholstery = 'BLU' })
    expect(snapshot.envelope.project.instances[0].finishes.Upholstery).toBe('LIN')
  })
  it('round trips a rug material and rejects stale writes without damaging the saved record', async () => {
    const db = new NookDatabase(`test-${crypto.randomUUID()}`)
    try {
      const initial = structuredClone(useEditor.getState().envelope)
      initial.project.instances[2].finishes = { TextileGround: 'RBL', TextileMotif: 'OAT' }
      expect(await saveRecord(db, initial, null)).toBe(1)
      const opened = await readRecord(db, initial.project.id)
      expect(opened.envelope.project.instances[2].finishes).toEqual({ TextileGround: 'RBL', TextileMotif: 'OAT' })
      expect(await saveRecord(db, initial, 1)).toBe(2)
      await expect(saveRecord(db, initial, 1)).rejects.toThrow('another session')
      expect((await readRecord(db, initial.project.id)).recordVersion).toBe(2)
    } finally { await db.delete() }
  })
  it('keeps newer edits dirty when a previous save completes', () => {
    const s = useEditor.getState(); const id = s.envelope.project.id; const token = s.token
    s.commit((p) => { p.instances[0].finishes.Upholstery = 'BLU' })
    useEditor.getState().saved(id, s.session, token, 1)
    expect(useEditor.getState().savedToken).not.toBe(useEditor.getState().token)
    expect(useEditor.getState().recordVersion).toBe(1)
  })
  it('ignores a late save after reopening the same project in a new session', () => {
    const initial = useEditor.getState()
    const projectId = initial.envelope.project.id
    const capturedSession = initial.session
    const capturedToken = initial.token
    const olderCopy = structuredClone(initial.envelope)
    initial.open(olderCopy, 3)
    const reopened = useEditor.getState()
    expect(reopened.session).not.toBe(capturedSession)
    const before = { envelope: reopened.envelope, session: reopened.session, token: reopened.token, savedToken: reopened.savedToken, recordVersion: reopened.recordVersion, message: reopened.message }
    reopened.saved(projectId, capturedSession, capturedToken, 4)
    const after = useEditor.getState()
    expect({ envelope: after.envelope, session: after.session, token: after.token, savedToken: after.savedToken, recordVersion: after.recordVersion, message: after.message }).toEqual(before)
    expect(after.recordVersion).toBe(3)
    expect(after.savedToken === after.token).toBe(true)
  })

})
