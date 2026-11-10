import { describe, expect, it } from 'vitest'
import { createSampleProject } from '../domain/sample'
import { defaultFinishes, getConcept } from '../catalog'
import type { FurnitureInstance } from '../domain/types'
import { furniturePlacementIssue, snapElectronicToSurface, validateProjectSpatial } from './index'

function item(id:string, x=2000, z=2000):FurnitureInstance {
  return {id,conceptId:id,centerXMm:x,centerZMm:z,quarterTurn:0,finishes:defaultFinishes(getConcept(2,id)!)}
}
describe('electronic surface placement', () => {
  it('centers and aligns a TV on an elevated, rotated media console', () => {
    const project=createSampleProject(()=>crypto.randomUUID()).project
    const console={...item('MED-SCA-01'),quarterTurn:1 as const,elevationMm:100}
    project.instances=[console]
    const tv=item('ELC-ELC-01',2100,2000)
    const placed=snapElectronicToSurface(project,tv,2100,2000)
    expect([placed.centerXMm,placed.centerZMm,placed.elevationMm,placed.quarterTurn]).toEqual([2000,2000,100+getConcept(2,console.conceptId)!.dimensions.heightMm,1])
    expect(furniturePlacementIssue(project,placed)).toBeNull()
    expect(validateProjectSpatial({...project,instances:[console,placed]}).some(issue=>issue.code==='furniture_overlap')).toBe(false)
    project.instances.push({...placed,id:'occupied'})
    expect(furniturePlacementIssue(project,placed)).toMatch(/overlaps/)
  })
  it('accepts the laptop on tables and nightstands but keeps the TV off them', () => {
    const project=createSampleProject(()=>crypto.randomUUID()).project
    for(const id of ['CFT-SCA-01','SFT-SCA-01','NST-NSD-01','MED-SCA-01']) {
      project.instances=[item(id)]
      expect(snapElectronicToSurface(project,item('ELC-ELC-02'),2000,2000).elevationMm).toBe(getConcept(2,id)!.dimensions.heightMm)
      if(id!=='MED-SCA-01')expect(snapElectronicToSurface(project,item('ELC-ELC-01'),2000,2000).elevationMm).toBeUndefined()
    }
  })
})
