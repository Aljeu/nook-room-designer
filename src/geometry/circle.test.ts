import { describe, expect, it } from 'vitest'
import { circlePath, conservativeFootprintPolygon } from './index'

describe('circular furniture footprints',()=>{
 it('represents the 420 mm lamp with an analytic circular SVG path',()=>{
  expect(circlePath(210)).toBe('M -210 0 A 210 210 0 1 0 210 0 A 210 210 0 1 0 -210 0 Z')
 })
 it('uses an outward conservative tangent polygon with less than one millimeter radial excess',()=>{
  for(const quarterTurn of [0,1,2,3] as const){
   const points=conservativeFootprintPolygon({kind:'circle',radiusMm:210},420,420,{centerXMm:1000,centerZMm:1000,quarterTurn})
   expect(points.length).toBeGreaterThan(16)
   for(const p of points){const distance=Math.hypot(p.x-1000,p.z-1000);expect(distance).toBeGreaterThanOrEqual(210-1e-8);expect(distance).toBeLessThan(211)}
  }
 })
})

import { createSampleProject } from '../domain/sample'
import { defaultFinishes, getConcept } from '../catalog'
import { getPlanPrimitives, validateProjectSpatial } from './index'

describe('lamp placement and plan',()=>{
 it('uses a circular outline and base cue and accepts a flush wall placement',()=>{
  const p=createSampleProject((()=>{let n=0;return()=>String(++n)})()).project
  const lamp={id:'lamp',conceptId:'LMP-SCA-01',centerXMm:210,centerZMm:210,quarterTurn:1 as const,finishes:defaultFinishes(getConcept(2,'LMP-SCA-01')!)}
  p.instances=[lamp]
  expect(validateProjectSpatial(p).filter(i=>i.severity==='hard')).toEqual([])
  const symbol=getPlanPrimitives(p).items[0]
  expect(symbol.pathD).toContain(circlePath(210));expect(symbol.pathD).toContain(circlePath(140));expect(symbol.svgTransform).toContain('rotate(90)')
  p.instances[0].centerXMm=209
  expect(validateProjectSpatial(p).some(i=>i.code==='containment')).toBe(true)
 })
 it('does not warn when circular projections do not intersect despite overlapping boxes',()=>{
  const p=createSampleProject((()=>{let n=0;return()=>String(++n)})()).project
  const lamp={id:'a',conceptId:'LMP-SCA-01',centerXMm:1000,centerZMm:1000,quarterTurn:0 as const,finishes:defaultFinishes(getConcept(2,'LMP-SCA-01')!)}
  p.instances=[lamp,{...lamp,id:'b',centerXMm:1410,centerZMm:1410}]
  expect(validateProjectSpatial(p).some(i=>i.code==='furniture_overlap')).toBe(false)
  p.instances[1].centerXMm=1300;p.instances[1].centerZMm=1000
  expect(validateProjectSpatial(p).some(i=>i.code==='furniture_overlap')).toBe(true)
 })
})
