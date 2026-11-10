import { describe, expect, it } from 'vitest'
import { createSampleProject } from '../domain/sample'
import { validateProjectSpatial } from './index'

describe('rotated exact-boundary containment',()=>{
 for (const q of [0,1,2,3] as const) it(`accepts flush quarter turn ${q} and rejects each 1 mm breach`,()=>{
  const project=createSampleProject((()=>{let id=0;return()=>String(++id)})()).project
  const source=project.instances[0],hx=q%2?440:900,hz=q%2?900:440
  const item={...source,quarterTurn:q,flipHorizontal:true,flipVertical:true,centerXMm:hx,centerZMm:hz}
  project.instances=[item]
  const invalid=()=>validateProjectSpatial(project).some(issue=>issue.code==='containment')
  expect(invalid()).toBe(false)
  item.centerXMm=hx-1;expect(invalid()).toBe(true);item.centerXMm=hx
  item.centerZMm=hz-1;expect(invalid()).toBe(true);item.centerZMm=hz
  item.centerXMm=project.room.widthMm-hx;item.centerZMm=project.room.depthMm-hz;expect(invalid()).toBe(false)
  item.centerXMm++;expect(invalid()).toBe(true);item.centerXMm--
  item.centerZMm++;expect(invalid()).toBe(true)
 })
 it('does not snap a genuinely non-quarter angle to the quarter-turn boundary',()=>{
  const project=createSampleProject((()=>{let id=0;return()=>String(++id)})()).project
  const item={...project.instances[0],quarterTurn:1 as const,rotationDegrees:90.000001,centerXMm:440,centerZMm:1200}
  project.instances=[item]
  expect(validateProjectSpatial(project).some(issue=>issue.code==='containment')).toBe(true)
  item.centerXMm=441
  expect(validateProjectSpatial(project).some(issue=>issue.code==='containment')).toBe(false)
 })
})

import { defaultFinishes, getConcept } from '../catalog'
describe('curved footprints at arbitrary angles',()=>{
 it('keeps an angled circular side table flush at its true radius',()=>{
  const project=createSampleProject((()=>{let id=0;return()=>String(++id)})()).project
  project.instances=[{id:'table',conceptId:'SFT-MCM-01',centerXMm:250,centerZMm:1000,quarterTurn:0,rotationDegrees:45,finishes:defaultFinishes(getConcept(2,'SFT-MCM-01')!)}]
  expect(validateProjectSpatial(project).some(i=>i.code==='containment')).toBe(false)
  project.instances[0].centerXMm=229
  expect(validateProjectSpatial(project).some(i=>i.code==='containment')).toBe(true)
 })
 it('uses rounded-rectangle support at a non-quarter angle',()=>{
  const project=createSampleProject((()=>{let id=0;return()=>String(++id)})()).project
  const item={...project.instances[1],centerXMm:570,centerZMm:1000,rotationDegrees:45}
  project.instances=[item]
  expect(validateProjectSpatial(project).some(i=>i.code==='containment')).toBe(false)
  item.centerXMm=569
  expect(validateProjectSpatial(project).some(i=>i.code==='containment')).toBe(true)
 })
})
