import { prepareFurniture } from '../assets/models'
import { describe, expect, it, beforeAll } from 'vitest'
import { canonicalPose, clampZoom, gestureOwner, nearWalls, orbitPose } from './camera'
import { createSampleProject } from '../domain/sample'
import { createWorld } from './world'

beforeAll(()=>prepareFurniture(['SOF-SCA-01']))
describe('camera interaction policy',()=>{
 it('routes furniture, background, right drag and touch without conflicting gestures',()=>{
  expect(gestureOwner(0,'mouse',true,false,'isometric')).toBe('furniture')
  expect(gestureOwner(0,'mouse',false,false,'isometric')).toBe('orbit')
  expect(gestureOwner(2,'mouse',true,false,'isometric')).toBe('orbit')
  expect(gestureOwner(0,'touch',true,false,'isometric')).toBe('touch')
  expect(gestureOwner(0,'mouse',true,true,'isometric')).toBe('furniture')
  expect(gestureOwner(2,'mouse',true,true,'isometric')).toBe('none')
  expect(gestureOwner(0,'mouse',false,false,'top')).toBe('none')
 })
 it('limits tilt and zoom and gives a fresh canonical reset',()=>{
  expect(orbitPose(canonicalPose(),0,1e5).elevation).toBeCloseTo(Math.PI/2-.0001)
  expect(orbitPose(canonicalPose(),0,-1e5).elevation).toBeCloseTo(0)
  expect(clampZoom(9)).toBe(3);expect(clampZoom(.1)).toBe(.75)
  const first=canonicalPose();first.azimuth=4;expect(canonicalPose().azimuth).toBeCloseTo(Math.PI/4)
 })
 it('allows orbiting away from front and top presets while preserving pan',()=>{
  const front=orbitPose({azimuth:0,elevation:0,panX:1,panY:2},20,20)
  expect(front.azimuth).not.toBe(0);expect(front.elevation).toBeGreaterThan(0);expect(front.panX).toBe(1)
  expect(orbitPose({azimuth:0,elevation:Math.PI/2-.0001},0,-20).elevation).toBeLessThan(Math.PI/2-.0001)
 })
 it('hides the facing walls and retains the previous quadrant at axis jitter',()=>{
  expect([...nearWalls(canonicalPose())].sort()).toEqual(['E','S'])
  expect([...nearWalls({azimuth:Math.PI*1.25,elevation:1})].sort()).toEqual(['N','W'])
  expect([...nearWalls({azimuth:.001,elevation:1},new Set(['W','S']))].sort()).toEqual(['S','W'])
 })
 it('keeps the chosen pose on refit while a fresh capture world starts canonical',()=>{
  const p=createSampleProject((()=>{let i=0;return()=>String(++i)})()).project
  const pose=orbitPose(canonicalPose(),100,20), world=createWorld(p,'isometric',1,800,600,null,pose)
  const before=world.camera.position.clone();world.setCamera(pose,1,1200,600);expect(world.camera.position.distanceTo(before)).toBeLessThan(1e-8)
  const capture=createWorld(p,'isometric',1,800,600);expect(capture.camera.position.x).not.toBeCloseTo(before.x)
  world.dispose();capture.dispose()
 })
})
