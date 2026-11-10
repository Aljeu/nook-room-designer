import { describe, expect, it } from 'vitest'
import { createSampleProject } from '../domain/sample'
import { furniturePlacementIssue } from './index'

function sample() { let id=0;return createSampleProject(()=>String(++id)).project }

describe('furniture placement', () => {
  it('allows wall contact but rejects crossing the wall', () => {
    const project=sample(),sofa=project.instances[0]
    project.instances=[sofa]
    expect(furniturePlacementIssue(project,{...sofa,centerXMm:900,centerZMm:440})).toBeNull()
    expect(furniturePlacementIssue(project,{...sofa,centerXMm:899,centerZMm:440})).toMatch(/wall/)
  })
  it('rejects furniture overlap but allows furniture over a rug', () => {
    const project=sample(),sofa=project.instances[0],rug=project.instances[2]
    expect(furniturePlacementIssue(project,{...sofa,centerXMm:2000,centerZMm:1900})).toMatch(/overlaps/)
    project.instances=[rug]
    expect(furniturePlacementIssue(project,{...sofa,centerXMm:2000,centerZMm:1650})).toBeNull()
  })
  it('checks the proposed object without rejecting unrelated existing overlaps', () => {
    const project=sample(),before=structuredClone(project)
    const lamp={...project.instances[0],id:'new-lamp',conceptId:'LMP-SCA-01',centerXMm:3700,centerZMm:3100}
    expect(furniturePlacementIssue(project,lamp)).toBeNull()
    expect(project).toEqual(before)
  })
})
