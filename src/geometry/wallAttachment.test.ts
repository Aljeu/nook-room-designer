import { describe, expect, it } from 'vitest'
import type { Room, Wall } from '../domain/types'
import { validateWallAttachment,wallAttachmentMayOverlap,wallAttachmentPoint,wallAttachmentPose,type WallAttachmentGeometry } from './wallAttachment'
const room:Room={id:'room',widthMm:4000,depthMm:3500,heightMm:2700,openings:[{id:'window',type:'window',wall:'N',offsetMm:500,widthMm:1000,sillMm:900,heightMm:1000}]}
const attachment=(wall:Wall):WallAttachmentGeometry=>({wall,offsetMm:200,bottomMm:1000,widthMm:400,heightMm:500,depthMm:30})
describe('wall attachment geometry',()=>{
 it.each([['N',200,0,1],['E',4000,200,-1],['S',200,3500,-1],['W',0,200,1]] as const)('maps wall %s using existing wall direction and inward normal',(wall,x,z,normal)=>{
  const a=attachment(wall),p=wallAttachmentPoint(room,a,0,0,0),front=wallAttachmentPoint(room,a,0,0,30)
  expect(p).toEqual({x,y:1000,z});if(wall==='N'||wall==='S')expect(front.z-z).toBe(normal*30);else expect(front.x-x).toBe(normal*30)
  expect(wallAttachmentPose(room,a).plan).toHaveLength(4)
 })
 it('permits exact wall edges and rejects a 1 mm horizontal, vertical, or depth breach',()=>{
  const a={...attachment('E'),offsetMm:3100,bottomMm:2200,depthMm:4000}
  expect(validateWallAttachment(room,a)).toEqual([])
  expect(validateWallAttachment(room,{...a,offsetMm:3101}).some(i=>i.code==='outside_wall')).toBe(true)
  expect(validateWallAttachment(room,{...a,bottomMm:2201}).some(i=>i.code==='outside_wall')).toBe(true)
  expect(validateWallAttachment(room,{...a,depthMm:4001}).some(i=>i.code==='outside_room')).toBe(true)
 })
 it('rejects covering an opening but permits touching its edge or being vertically clear',()=>{
  const a={...attachment('N'),offsetMm:100,widthMm:400,bottomMm:1000}
  expect(validateWallAttachment(room,a)).toEqual([])
  expect(validateWallAttachment(room,{...a,offsetMm:101})[0].code).toBe('opening_conflict')
  expect(validateWallAttachment(room,{...a,offsetMm:600,bottomMm:1900})).toEqual([])
 })
 it('warns only when both vertical and horizontal projections overlap',()=>{
  const pose=wallAttachmentPose(room,attachment('W')),floorTable={plan:[{x:0,z:250},{x:300,z:250},{x:300,z:450},{x:0,z:450}],minYmm:0,maxYmm:800}
  expect(wallAttachmentMayOverlap(pose,floorTable)).toBe(false)
  expect(wallAttachmentMayOverlap(pose,{...floorTable,maxYmm:1200})).toBe(true)
  expect(wallAttachmentMayOverlap(pose,{...floorTable,minYmm:1500,maxYmm:2000})).toBe(false)
 })
})
