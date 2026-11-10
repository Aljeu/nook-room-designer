import type { Wall } from '../domain/types'
export type CameraPose = { azimuth: number; elevation: number; panX?: number; panY?: number }
export const CANONICAL_POSE: Readonly<CameraPose> = Object.freeze({azimuth:Math.PI/4,elevation:Math.asin(1/Math.sqrt(3))})
export const DEFAULT_VIEW_ZOOM = 0.8
export const canonicalPose=():CameraPose=>({...CANONICAL_POSE})
export const MIN_ORBIT_ELEVATION = 0
export const MAX_ORBIT_ELEVATION = Math.PI / 2 - .0001
const clampElevation=(elevation:number)=>Math.max(MIN_ORBIT_ELEVATION,Math.min(MAX_ORBIT_ELEVATION,elevation))
export type CameraCommand = { token: number } & ({ turnDegrees: number; tiltDegrees: number } | { pose: CameraPose })
export function stepPose(pose: CameraPose, turnDegrees: number, tiltDegrees: number): CameraPose {
 return { ...pose, azimuth: pose.azimuth + turnDegrees * Math.PI / 180, elevation: clampElevation(pose.elevation + tiltDegrees * Math.PI / 180) }
}
export function orbitPose(pose:CameraPose,dx:number,dy:number):CameraPose {return {...pose,azimuth:pose.azimuth-dx*.008,elevation:clampElevation(pose.elevation+dy*.008)}}
export const clampZoom=(zoom:number)=>Math.max(.75,Math.min(3,zoom))
export function nearWalls(pose:CameraPose,previous?:ReadonlySet<Wall>):Set<Wall>{
 const x=Math.sin(pose.azimuth),z=Math.cos(pose.azimuth),threshold=.04
 const xWall=x>threshold?'E':x< -threshold?'W':previous?.has('W')?'W':'E'
 const zWall=z>threshold?'S':z< -threshold?'N':previous?.has('N')?'N':'S'
 return new Set<Wall>([xWall,zWall])
}
export type GestureOwner='furniture'|'orbit'|'touch'|'none'
export function gestureOwner(button:number,pointerType:string,hitFurniture:boolean,locked:boolean,view:'isometric'|'top'):GestureOwner {
 if(pointerType==='touch')return locked?'none':'touch'
 if(button===2)return !locked&&view==='isometric'?'orbit':'none'
 if(button!==0)return 'none'
 if(hitFurniture)return 'furniture'
 return !locked&&view==='isometric'?'orbit':'none'
}
