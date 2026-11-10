import { afterEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { createSampleProject } from '../domain/sample'
import { getWallConcept } from '../catalog/wall'
import { validateStructure } from '../validation/structural'
import { useEditor, validateDesign } from './store'
import { NookDatabase, readRecord, saveRecord } from '../persistence/db'
import { captureSnapshot } from '../exports/snapshot'
import { createPlan } from '../exports/export'

const object = () => ({id:crypto.randomUUID(),conceptId:'ART-FIL-01',wall:'N' as const,offsetMm:100,bottomMm:1200,finishes:{...getWallConcept('ART-FIL-01')!.defaults}})
afterEach(() => useEditor.setState({ envelope:createSampleProject(), past:[], future:[], token:0, savedToken:null, session:0, selectedId:null, recordVersion:null }))

describe('wall project compatibility', () => {
  it('accepts legacy data unchanged, and forbids wall data in legacy format', () => {
    const original=createSampleProject()
    expect(validateStructure(original).success).toBe(true)
    original.project.wallObjects=[object()]
    expect(validateStructure(original).success).toBe(false)
    original.formatVersion=2
    expect(validateStructure(original).success).toBe(true)
  })
  it('checks the aggregate 24 cap, IDs, finishes and window style', () => {
    const data=createSampleProject();data.formatVersion=2
    const first=object();data.project.wallObjects=[first,{...first}]
    expect(validateStructure(data).success).toBe(false)
    data.project.wallObjects=[{...first,finishes:{Frame:'CHA'}}]
    expect(validateStructure(data).success).toBe(false)
    data.project.wallObjects=Array.from({length:22},()=>object())
    expect(validateStructure(data).success).toBe(false)
    data.project.wallObjects=[]
    data.project.room.openings=[{id:crypto.randomUUID(),type:'window',wall:'N',offsetMm:0,widthMm:1200,heightMm:1200,sillMm:900,styleId:'UNKNOWN'}]
    expect(validateStructure(data).success).toBe(false)
  })
  it('rejects attachments covering a window and invalidating room changes', () => {
    const data=createSampleProject();data.formatVersion=2;data.project.wallObjects=[object()]
    expect(validateDesign(data)).toBeNull()
    data.project.room.openings=[{id:crypto.randomUUID(),type:'window',wall:'N',offsetMm:0,widthMm:1200,heightMm:1200,sillMm:900,styleId:'WIN-GEN-01'}]
    expect(validateDesign(data)).toMatch(/opening/i)
    data.project.room.openings=[];data.project.wallObjects[0].offsetMm=3900
    expect(validateDesign(data)).toMatch(/wall/i)
  })
  it('undoes a wall addition as one change and preserves versioned round trips', async () => {
    const db = new NookDatabase(`walls-${crypto.randomUUID()}`)
    try {
      const legacy=createSampleProject();useEditor.setState({envelope:legacy,past:[],future:[],token:0,savedToken:null,session:0,selectedId:null,recordVersion:null})
      const legacyVersion=await saveRecord(db,legacy,null)
      const old=await readRecord(db,legacy.project.id)
      expect(old.envelope.formatVersion).toBe(1)
      expect(useEditor.getState().commit((p)=>{p.wallObjects=[object()]})).toBe(true)
      const current=useEditor.getState().envelope
      expect(current.formatVersion).toBe(2)
      expect(await saveRecord(db,current,legacyVersion)).toBe(2)
      expect((await readRecord(db,legacy.project.id)).envelope).toEqual(current)
      useEditor.getState().undo();expect(useEditor.getState().envelope.formatVersion).toBe(1)
      useEditor.getState().redo();expect(useEditor.getState().envelope.project.wallObjects).toEqual(current.project.wallObjects)
    } finally {await db.delete()}
  })
  it('includes wall objects and window details in the same exported snapshot', () => {
    const data=createSampleProject();data.formatVersion=2;data.project.wallObjects=[object()]
    data.project.room.openings=[{id:crypto.randomUUID(),type:'window',wall:'E',offsetMm:0,widthMm:1200,heightMm:1200,sillMm:900,styleId:'WIN-GEN-01'}]
    const snapshot=captureSnapshot(data),svg=createPlan(snapshot)
    data.project.wallObjects[0].offsetMm=1000
    expect(svg).toContain(snapshot.id)
    expect(svg).toContain('Warm Abstract Print')
    expect(svg).toContain('Fixed Glazed Window')
    expect(svg).toContain('offset 100 mm')
    expect(snapshot.envelope.project.wallObjects?.[0].offsetMm).toBe(100)
  })

})
