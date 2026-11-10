import type { Room, Wall } from '../domain/types'
import { openingBasis, polygonsOverlap, type Point } from './index'

/** In-memory geometry input only; the application owns the eventual saved-data contract. */
export type WallAttachmentGeometry = {
  wall: Wall
  /** Minimum edge, measured in the same direction as an opening offset. */
  offsetMm: number
  bottomMm: number
  widthMm: number
  heightMm: number
  /** Full projection from the interior wall plane into the room. */
  depthMm: number
}
export type WallAttachmentPose = {
  originMm: { x: number; y: number; z: number }
  tangent: { x: number; z: number }
  inward: { x: number; z: number }
  /** Corners of the full depth-bearing projection, in room X/Z millimeters. */
  plan: Point[]
  minYmm: number
  maxYmm: number
}
export type WallAttachmentIssue = { code: 'invalid_geometry' | 'outside_wall' | 'outside_room' | 'opening_conflict'; message: string; openingIds?: string[] }
export type ProjectedVolume = { plan: Point[]; minYmm: number; maxYmm: number }

/** Wall-local coordinates are along-wall from the minimum edge, up from the bottom, and inward from the wall. */
export function wallAttachmentPoint(room:Room, attachment:WallAttachmentGeometry, alongMm:number, upMm:number, inwardMm:number) {
  const basis=openingBasis(room,attachment.wall)
  return {
    x:basis.x+basis.tx*(attachment.offsetMm+alongMm)+basis.ix*inwardMm,
    y:attachment.bottomMm+upMm,
    z:basis.z+basis.tz*(attachment.offsetMm+alongMm)+basis.iz*inwardMm,
  }
}

/** Full model-space extent; the model's wall-facing back is local depth zero. */
export function wallAttachmentPose(room:Room, attachment:WallAttachmentGeometry):WallAttachmentPose {
  const basis=openingBasis(room,attachment.wall)
  const originMm=wallAttachmentPoint(room,attachment,attachment.widthMm/2,0,0)
  const corners=[[0,0],[attachment.widthMm,0],[attachment.widthMm,attachment.depthMm],[0,attachment.depthMm]] as const
  return {
    originMm,tangent:{x:basis.tx,z:basis.tz},inward:{x:basis.ix,z:basis.iz},
    plan:corners.map(([u,d])=>{const p=wallAttachmentPoint(room,attachment,u,0,d);return{x:p.x,z:p.z}}),
    minYmm:attachment.bottomMm,maxYmm:attachment.bottomMm+attachment.heightMm,
  }
}
const positiveOverlap=(minA:number,maxA:number,minB:number,maxB:number)=>minA<maxB&&minB<maxA

/** Candidate policy: flush edges are valid; positive-area coverage of an aperture is invalid. */
export function validateWallAttachment(room:Room, attachment:WallAttachmentGeometry):WallAttachmentIssue[] {
  const {offsetMm,bottomMm,widthMm,heightMm,depthMm}=attachment
  if(!['N','E','S','W'].includes(attachment.wall)||![offsetMm,bottomMm,widthMm,heightMm,depthMm].every(Number.isInteger)||widthMm<=0||heightMm<=0||depthMm<=0){
    return [{code:'invalid_geometry',message:'Attachment dimensions and placement must be valid whole millimeters.'}]
  }
  const basis=openingBasis(room,attachment.wall),issues:WallAttachmentIssue[]=[]
  if(offsetMm<0||bottomMm<0||offsetMm+widthMm>basis.length||bottomMm+heightMm>room.heightMm)issues.push({code:'outside_wall',message:'The attachment must fit on its supporting wall.'})
  const roomDepth=attachment.wall==='N'||attachment.wall==='S'?room.depthMm:room.widthMm
  if(depthMm>roomDepth)issues.push({code:'outside_room',message:'The attachment projects beyond the room.'})
  const conflicts=room.openings.filter(o=>o.wall===attachment.wall&&positiveOverlap(offsetMm,offsetMm+widthMm,o.offsetMm,o.offsetMm+o.widthMm)&&positiveOverlap(bottomMm,bottomMm+heightMm,o.sillMm,o.sillMm+o.heightMm)).map(o=>o.id)
  if(conflicts.length)issues.push({code:'opening_conflict',message:'The attachment cannot cover an opening.',openingIds:conflicts})
  return issues
}

/** Positive projected and vertical intersection is a possible conflict, not a solid-collision claim. */
export function wallAttachmentMayOverlap(pose:WallAttachmentPose, other:ProjectedVolume):boolean {
  return positiveOverlap(pose.minYmm,pose.maxYmm,other.minYmm,other.maxYmm)&&polygonsOverlap(pose.plan,other.plan)
}
