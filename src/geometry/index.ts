import type { FurnitureInstance, Footprint, Opening, Project, Room, Wall, WallObject } from '../domain/types'
import { getConcept } from '../catalog'
import { getWallConcept } from '../catalog/wall'
import { getDoorStyle } from '../catalog/doors'
import { MAX_DOORWAYS, MAX_OPENINGS, MAX_WINDOWS } from '../domain/constants'
import { wallAttachmentPose } from './wallAttachment'

export type SpatialIssue = { severity: 'hard' | 'advisory'; code: string; message: string; instanceIds?: string[]; openingIds?: string[] }
export type Point = { x: number; z: number }
export type WallBand = { xMm: number; zMm: number; widthMm: number; depthMm: number }
export type WallSegment = { wall: Wall; start: number; end: number; bottom: number; top: number }
const lNotchWidth = (room: Room) => Math.max(100, Math.min(room.widthMm - 100, Math.round(room.widthMm * 0.55 / 100) * 100))
const lNotchDepth = (room: Room) => Math.max(100, Math.min(room.depthMm - 100, Math.round(room.depthMm * 0.5 / 100) * 100))
const dRadius = (room: Room) => room.widthMm / 2
const dCenterZ = (room: Room) => room.depthMm - dRadius(room)
const dCurvePoints = (room: Room): Point[] => Array.from({ length: 65 }, (_, index) => {
  const angle = Math.PI * index / 64
  const radius = dRadius(room)
  return { x: room.widthMm / 2 + radius * Math.cos(angle), z: dCenterZ(room) + radius * Math.sin(angle) }
})
export function getRoomCurvedWall(room: Room): Point[] { return room.shape === 'd-shape' ? dCurvePoints(room) : [] }
export function getRoomOutline(room: Room): Point[] {
  const { widthMm: width, depthMm: depth } = room
  if (room.shape === 'd-shape') return [{ x: 0, z: 0 }, { x: width, z: 0 }, ...dCurvePoints(room)]
  if (room.shape === 'l-shape') {
    const notchX = lNotchWidth(room), notchZ = lNotchDepth(room)
    return [{x:0,z:0},{x:width,z:0},{x:width,z:notchZ},{x:notchX,z:notchZ},{x:notchX,z:depth},{x:0,z:depth}]
  }
  return [{x:0,z:0},{x:width,z:0},{x:width,z:depth},{x:0,z:depth}]
}
/** Outer edge of the floor slab, including the wall thickness beyond the room's inner boundary. */
export function getRoomSlabOutline(room: Room, wallThicknessMm = 100): Point[] {
  const outline = getRoomOutline(room)
  if (wallThicknessMm <= 0 || outline.length < 3) return outline

  const signedArea = outline.reduce((area, point, index) => {
    const next = outline[(index + 1) % outline.length]
    return area + point.x * next.z - next.x * point.z
  }, 0)
  const orientation = signedArea >= 0 ? 1 : -1
  const normals = outline.map((point, index) => {
    const next = outline[(index + 1) % outline.length]
    const dx = next.x - point.x, dz = next.z - point.z
    const length = Math.hypot(dx, dz) || 1
    return { x: orientation * dz / length, z: orientation * -dx / length }
  })

  return outline.map((point, index) => {
    const previous = normals[(index + outline.length - 1) % outline.length]
    const next = normals[index]
    const denominator = Math.max(0.0001, 1 + previous.x * next.x + previous.z * next.z)
    const scale = wallThicknessMm / denominator
    return {
      x: point.x + (previous.x + next.x) * scale,
      z: point.z + (previous.z + next.z) * scale,
    }
  })
}
export function getRoomInnerWallBands(room: Room): WallBand[] {
  if (room.shape !== 'l-shape') return []
  const notchX = lNotchWidth(room), notchZ = lNotchDepth(room)
  return [
    {xMm:notchX,zMm:notchZ,widthMm:room.widthMm-notchX,depthMm:100},
    {xMm:notchX,zMm:notchZ,widthMm:100,depthMm:room.depthMm-notchZ},
  ]
}
type FurnitureTransform = Pick<FurnitureInstance, 'centerXMm' | 'centerZMm' | 'quarterTurn'> & Partial<Pick<FurnitureInstance, 'rotationDegrees' | 'flipHorizontal' | 'flipVertical'>>
export function transformPoint(x: number, z: number, item: FurnitureTransform): Point {
  const localX=x*(item.flipHorizontal?-1:1),localZ=z*(item.flipVertical?-1:1),degrees=item.rotationDegrees??item.quarterTurn*90
  const quarter=degrees%90===0?((Math.round(degrees/90)%4)+4)%4:null
  const [dx,dz]=quarter===null?(()=>{const angle=degrees*Math.PI/180;return[localX*Math.cos(angle)-localZ*Math.sin(angle),localX*Math.sin(angle)+localZ*Math.cos(angle)] as const})():[[localX,localZ],[-localZ,localX],[-localX,-localZ],[localZ,-localX]][quarter]
  return { x: item.centerXMm + dx, z: item.centerZMm + dz }
}
export function openingBasis(room: Room, wall: Wall) {
  const dStraightSide = Math.max(0, room.depthMm - dRadius(room))
  const eLength = room.shape === 'l-shape' ? lNotchDepth(room) : room.shape === 'd-shape' ? dStraightSide : room.depthMm
  const sLength = room.shape === 'l-shape' ? lNotchWidth(room) : room.shape === 'd-shape' ? 0 : room.widthMm
  const wLength = room.shape === 'd-shape' ? dStraightSide : room.depthMm
  return ({ N: { x:0,z:0,tx:1,tz:0,ix:0,iz:1,length:room.widthMm }, E: { x:room.widthMm,z:0,tx:0,tz:1,ix:-1,iz:0,length:eLength }, S: { x:0,z:room.depthMm,tx:1,tz:0,ix:0,iz:-1,length:sLength }, W: { x:0,z:0,tx:0,tz:1,ix:1,iz:0,length:wLength } })[wall]
}
export function openingPoints(room: Room, opening: Opening) {
  const b=openingBasis(room,opening.wall), a={x:b.x+b.tx*opening.offsetMm,z:b.z+b.tz*opening.offsetMm}, end={x:a.x+b.tx*opening.widthMm,z:a.z+b.tz*opening.widthMm}
  return { a, end, basis:b }
}
type WallCutout = { wall: Wall; offsetMm: number; widthMm: number; heightMm: number; sillMm: number }
function wallCutouts(room: Room, wallObjects: readonly WallObject[] = []): WallCutout[] {
  return [
    ...room.openings.map(({ wall, offsetMm, widthMm, heightMm, sillMm }) => ({ wall, offsetMm, widthMm, heightMm, sillMm })),
    ...wallObjects.flatMap((item) => {
      const opening = getWallConcept(item.conceptId)?.throughOpening
      return opening ? [{ wall: item.wall, offsetMm: item.offsetMm + opening.offsetMm, widthMm: opening.widthMm, heightMm: opening.heightMm, sillMm: item.bottomMm + opening.bottomMm }] : []
    }),
  ]
}
export function wallSegments(room: Room, wallObjects: readonly WallObject[] = []): WallSegment[] {
  const cutouts = wallCutouts(room, wallObjects)
  const result:WallSegment[]=[]
  for (const wall of ['N','E','S','W'] as Wall[]) {
    const len=openingBasis(room,wall).length, os=cutouts.filter(o=>o.wall===wall), cuts=[...new Set([0,len,...os.flatMap(o=>[o.offsetMm,o.offsetMm+o.widthMm])])].sort((a,b)=>a-b)
    for(let i=0;i<cuts.length-1;i++) { const start=cuts[i],end=cuts[i+1]; if(end<=start) continue; const o=os.find(v=>v.offsetMm<=start && v.offsetMm+v.widthMm>=end); if(!o) result.push({wall,start,end,bottom:0,top:room.heightMm}); else { if(o.sillMm>0) result.push({wall,start,end,bottom:0,top:o.sillMm}); if(o.sillMm+o.heightMm<room.heightMm) result.push({wall,start,end,bottom:o.sillMm+o.heightMm,top:room.heightMm}) } }
  }
  return result
}
function localPath(item:FurnitureInstance): string {
  const c=getConcept(2,item.conceptId); if(!c || !c.footprint) return ''
  const {widthMm:w,depthMm:d}=c.dimensions, x=-w/2,z=-d/2
  if(c.footprint.kind==='rectangle') {
    const base=`M ${x} ${z} h ${w} v ${d} h ${-w} Z`
    if(item.conceptId==='SOF-SCA-01') return `${base} M -780 -440 V 440 M 780 -440 V 440 M -780 -320 H 780 M -780 400 H 780 M 0 -290 V 400`
    if(item.conceptId==='CHR-SCA-01') return `${base} M -320 -410 V 410 M 320 -410 V 410 M -320 410 H 320 M -300 -310 H 300`
    if(item.conceptId==='MED-SCA-01') return `${base} M -780 200 H 780 M -250 180 V 200 M 250 180 V 200`
    if(item.conceptId==='BKC-SCA-01') return `${base} M -376 -148 H 376`
    if(item.conceptId==='SOF-MCM-01')return `${base} M -970 -430 V 430 M 970 -430 V 430 M -970 -330 H 970 M -325 -330 V 370 M 325 -330 V 370`
    if(item.conceptId==='MED-MCM-01')return `${base} M -830 210 H 50 M -50 196 H 830`
    if(item.conceptId==='BKC-MCM-01')return `${base} M -426 -158 H 426 M -110 -158 V 170`
    if(item.conceptId==='SOF-FIL-01')return `${base} M -890 -425 V 425 M 890 -425 V 425 M -890 -365 H 890 M 0 -295 V 395`
    if(item.conceptId==='MED-FIL-01')return `${base} M -780 210 H 780 M -250 190 V 210 M 250 190 V 210`
    if(item.conceptId==='BKC-FIL-01')return `${base} M -376 -158 H 376`
    return base
  }
  if(c.footprint.kind==='polygon') { const path=polygonPath(c.footprint.vertices); if(item.conceptId==='CHR-MCM-01')return `${path} M -300 330 H 300 M -300 -300 H 300`;if(item.conceptId==='CHR-FIL-01')return `${path} M -295 -260 H 295 A 25 25 0 0 1 320 -235 V 335 A 25 25 0 0 1 295 360 H -295 A 25 25 0 0 1 -320 335 V -235 A 25 25 0 0 1 -295 -260 Z M -300 -320 H 300`;if(item.conceptId==='LMP-MCM-01')return `${path} ${circlePath(235)}`;return path }
  if(c.footprint.kind==='circle') return `${circlePath(c.footprint.radiusMm)}${item.conceptId==='LMP-SCA-01' ? ` ${circlePath(140)}` : item.conceptId==='LMP-FIL-01' ? ` ${circlePath(150)}` : ''}`
  const r=c.footprint.radiusMm
  const path=`M ${x+r} ${z} H ${-x-r} A ${r} ${r} 0 0 1 ${-x} ${z+r} V ${-z-r} A ${r} ${r} 0 0 1 ${-x-r} ${-z} H ${x+r} A ${r} ${r} 0 0 1 ${x} ${-z-r} V ${z+r} A ${r} ${r} 0 0 1 ${x+r} ${z} Z`
  if(item.conceptId==='CFT-FIL-01')return `${path} M -420 -240 V 240 M 420 -240 V 240`
  if(item.conceptId==='SFT-FIL-01')return `${path} M -153 -165 H 153 A 12 12 0 0 1 165 -153 V 153 A 12 12 0 0 1 153 165 H -153 A 12 12 0 0 1 -165 153 V -153 A 12 12 0 0 1 -153 -165 Z`
  return path
}
export function circlePath(radiusMm:number):string { return `M ${-radiusMm} 0 A ${radiusMm} ${radiusMm} 0 1 0 ${radiusMm} 0 A ${radiusMm} ${radiusMm} 0 1 0 ${-radiusMm} 0 Z` }
export function conservativeFootprintPolygon(footprint:Footprint,w:number,d:number,item:FurnitureTransform):Point[] {
  if(footprint.kind==='polygon') return footprint.vertices.map(p=>transformPoint(p.xMm,p.zMm,item))
  const r=footprint.kind==='rectangle'?0:footprint.radiusMm
  if(!r)return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>transformPoint(x,z,item))
  // Tangent polygon conservatively bounds each rounded corner by less than 1 mm.
  const count=Math.max(2,Math.ceil(Math.PI/4/Math.acos(r/(r+0.5))))
  const pts:Point[]=[]
  for(const [sx,sz,start] of [[1,1,0],[-1,1,Math.PI/2],[-1,-1,Math.PI],[1,-1,3*Math.PI/2]]) {
    const cx=sx*(w/2-r),cz=sz*(d/2-r),step=Math.PI/2/count
    pts.push(transformPoint(cx+r*Math.cos(start),cz+r*Math.sin(start),item))
    for(let j=0;j<count;j++){const a=start+(j+0.5)*step,rr=r/Math.cos(step/2);pts.push(transformPoint(cx+rr*Math.cos(a),cz+rr*Math.sin(a),item))}
    pts.push(transformPoint(cx+r*Math.cos(start+Math.PI/2),cz+r*Math.sin(start+Math.PI/2),item))
  }
  return pts
}
function shapePolygon(item:FurnitureInstance):Point[] {
  const c=getConcept(2,item.conceptId); if(!c?.footprint)return []
  const {widthMm:w,depthMm:d}=c.dimensions
  return conservativeFootprintPolygon(c.footprint,w,d,item)
}
// The last edge closes the ring; do not repeat the first vertex in stored data.
type LocalVertex = { xMm:number; zMm:number }
export function polygonPath(vertices:readonly LocalVertex[]):string {
  return vertices.length ? `M ${vertices.map(p=>`${p.xMm} ${p.zMm}`).join(' L ')} Z` : ''
}
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x)
const EPS=1e-9
function onSegment(a:Point,b:Point,p:Point):boolean {
  return Math.abs(cross(a,b,p))<=EPS && p.x>=Math.min(a.x,b.x)-EPS && p.x<=Math.max(a.x,b.x)+EPS && p.z>=Math.min(a.z,b.z)-EPS && p.z<=Math.max(a.z,b.z)+EPS
}
function edgesMeet(a:Point,b:Point,c:Point,d:Point):boolean {
  const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b)
  if(((abC>EPS&&abD< -EPS)||(abC< -EPS&&abD>EPS))&&((cdA>EPS&&cdB< -EPS)||(cdA< -EPS&&cdB>EPS)))return true
  return onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b)
}
function pointWithinPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[j],b=polygon[i]
    if(onSegment(a,b,point))return true
    if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside
  }
  return inside
}
function properEdgesCross(a:Point,b:Point,c:Point,d:Point):boolean {
  const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b)
  return ((abC>EPS&&abD< -EPS)||(abC< -EPS&&abD>EPS))&&((cdA>EPS&&cdB< -EPS)||(cdA< -EPS&&cdB>EPS))
}
function polygonWithinPolygon(subject:Point[],boundary:Point[]):boolean {
  if(subject.length<3||boundary.length<3||!subject.every(point=>pointWithinPolygon(point,boundary)))return false
  for(let i=0;i<subject.length;i++)for(let j=0;j<boundary.length;j++)if(properEdgesCross(subject[i],subject[(i+1)%subject.length],boundary[j],boundary[(j+1)%boundary.length]))return false
  return true
}
export function validatePolygonFootprint(vertices:readonly LocalVertex[],widthMm:number,depthMm:number):string|null {
  if(!Number.isFinite(widthMm)||!Number.isFinite(depthMm)||widthMm<=0||depthMm<=0)return 'Invalid declared dimensions.'
  if(vertices.length<3||vertices.length>128)return 'A polygon needs 3 to 128 vertices.'
  if(vertices.some(p=>!Number.isFinite(p.xMm)||!Number.isFinite(p.zMm)||Math.abs(p.xMm)>widthMm/2||Math.abs(p.zMm)>depthMm/2))return 'Polygon coordinates must be finite and inside its declared bounds.'
  const points=vertices.map(p=>({x:p.xMm,z:p.zMm})),n=points.length
  for(let i=0;i<n;i++){const a=points[i],b=points[(i+1)%n];if(a.x===b.x&&a.z===b.z)return 'Consecutive vertices must differ; closure is implicit.'}
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    if(j===i+1||(i===0&&j===n-1))continue
    if(edgesMeet(points[i],points[(i+1)%n],points[j],points[(j+1)%n]))return 'Polygon edges must not intersect or touch.'
  }
  const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%n];return sum+p.x*q.z-q.x*p.z},0)
  if(Math.abs(area)<=EPS)return 'Polygon area must be nonzero.'
  // Adjacent collinear edges may continue straight but must not double back.
  for(let i=0;i<n;i++){const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n];if(Math.abs(cross(a,b,c))<=EPS&&(a.x-b.x)*(c.x-b.x)+(a.z-b.z)*(c.z-b.z)>EPS)return 'Polygon edges must not double back.'}
  return null
}
function signedArea(points:Point[]):number {return points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.z-q.x*p.z},0)}
function convexOverlap(a:Point[],b:Point[]):boolean {
  for(const p of [a,b])for(let i=0;i<p.length;i++){const v=p[i],n=p[(i+1)%p.length],axis={x:-(n.z-v.z),z:n.x-v.x};if(Math.abs(axis.x)+Math.abs(axis.z)<1e-9)continue;const aa=a.map(q=>q.x*axis.x+q.z*axis.z),bb=b.map(q=>q.x*axis.x+q.z*axis.z);if(Math.max(...aa)<=Math.min(...bb)+1e-7||Math.max(...bb)<=Math.min(...aa)+1e-7)return false}
  return true
}
function triangulate(input:Point[]):Point[][] {
  // Remove redundant collinear points, including tangencies in curved outlines.
  const p=input.filter((v,i)=>{const prev=input[(i+input.length-1)%input.length];return Math.hypot(v.x-prev.x,v.z-prev.z)>EPS})
  let changed=true
  while(changed&&p.length>3){changed=false;for(let i=0;i<p.length;i++){const prev=p[(i+p.length-1)%p.length],cur=p[i],next=p[(i+1)%p.length];if(Math.abs(cross(prev,cur,next))<=EPS&&onSegment(prev,next,cur)){p.splice(i,1);changed=true;break}}}
  if(p.length<3||Math.abs(signedArea(p))<=EPS)return []
  const orientation=signedArea(p)>0?1:-1, indices=p.map((_,i)=>i),result:Point[][]=[]
  while(indices.length>3){let clipped=false
    for(let k=0;k<indices.length;k++){
      const ia=indices[(k+indices.length-1)%indices.length],ib=indices[k],ic=indices[(k+1)%indices.length],a=p[ia],b=p[ib],c=p[ic]
      if(orientation*cross(a,b,c)<=EPS)continue
      const occupied=indices.some(i=>i!==ia&&i!==ib&&i!==ic&&orientation*cross(a,b,p[i])>=-EPS&&orientation*cross(b,c,p[i])>=-EPS&&orientation*cross(c,a,p[i])>=-EPS)
      if(occupied)continue
      result.push([a,b,c]);indices.splice(k,1);clipped=true;break
    }
    if(!clipped)return []
  }
  result.push(indices.map(i=>p[i]));return result
}
export function polygonsOverlap(a:Point[],b:Point[]):boolean {
  if(a.length<3||b.length<3)return false
  // Keep existing convex outlines on the direct SAT path; only split concave rings.
  const convex=(p:Point[])=>{let sign=0;for(let i=0;i<p.length;i++){const value=cross(p[i],p[(i+1)%p.length],p[(i+2)%p.length]);if(Math.abs(value)>EPS){const next=Math.sign(value);if(sign&&sign!==next)return false;sign=next}}return sign!==0}
  const ta=convex(a)?[a]:triangulate(a),tb=convex(b)?[b]:triangulate(b)
  return ta.some(x=>tb.some(y=>convexOverlap(x,y)))
}
const intersects=polygonsOverlap

/** Center electronics over a compatible surface when the pointer is over it. */
export function snapElectronicToSurface(project: Project, item: FurnitureInstance, x: number, z: number): FurnitureInstance {
  const allowed = item.conceptId === 'ELC-ELC-01' ? ['MED'] : item.conceptId === 'ELC-ELC-02' ? ['MED','CFT','SFT','NST'] : []
  if (!allowed.length) return item
  const surfaces = project.instances.filter(surface => surface.id !== item.id && allowed.includes(getConcept(2, surface.conceptId)?.category ?? '') && pointWithinPolygon({x,z}, shapePolygon(surface)))
  surfaces.sort((a,b) => ((b.elevationMm ?? 0) + (getConcept(2,b.conceptId)?.dimensions.heightMm ?? 0)) - ((a.elevationMm ?? 0) + (getConcept(2,a.conceptId)?.dimensions.heightMm ?? 0)))
  for (const surface of surfaces) {
    const concept = getConcept(2,surface.conceptId)!
    const candidate: FurnitureInstance = {...item, centerXMm:surface.centerXMm, centerZMm:surface.centerZMm, elevationMm:(surface.elevationMm ?? 0)+concept.dimensions.heightMm, quarterTurn:surface.quarterTurn, rotationDegrees:surface.rotationDegrees}
    if (polygonWithinPolygon(shapePolygon(candidate),shapePolygon(surface))) return candidate
  }
  return item
}

/** Validate only the object being placed, so existing saved overlaps remain editable. */
export function furniturePlacementIssue(project: Project, item: FurnitureInstance): string | null {
  const issue = validateProjectSpatial({ ...project, instances: [item] }).find(entry => entry.severity === 'hard')
  if (issue) return issue.code === 'containment' ? 'Furniture must fit inside the room without crossing a wall.' : issue.message
  const isRug = (instance: FurnitureInstance) => instance.conceptId.startsWith('RUG-')
  if (!isRug(item)) {
    const shape = shapePolygon(item)
    const itemBottom = item.elevationMm ?? 0
    const itemTop = itemBottom + (getConcept(2, item.conceptId)?.dimensions.heightMm ?? 0)
    if (project.instances.some(other => {
      if (other.id === item.id || isRug(other) || !intersects(shape, shapePolygon(other))) return false
      const otherBottom = other.elevationMm ?? 0
      const otherTop = otherBottom + (getConcept(2, other.conceptId)?.dimensions.heightMm ?? 0)
      return itemBottom < otherTop && otherBottom < itemTop
    })) return 'Furniture overlaps another object. Choose an open space.'
  }
  return null
}

export function validateProjectSpatial(project:Project,catalogRevision:2=2):SpatialIssue[] {
  const issues:SpatialIssue[]=[], {room,instances}=project, hard=(code:string,message:string,ids:Partial<SpatialIssue>={})=>issues.push({severity:'hard',code,message,...ids}), advisory=(code:string,message:string,ids:Partial<SpatialIssue>)=>issues.push({severity:'advisory',code,message,...ids})
  for(const [name,value,min,max] of [['width',room.widthMm,1000,12000],['depth',room.depthMm,1000,12000],['height',room.heightMm,2000,5000]] as const) if(!Number.isInteger(value)||value<min||value>max)hard('room_dimensions',`Room ${name} is outside the supported range.`)
  if(instances.length>24)hard('capacity','A room can contain at most 24 items.')
  const doorways=room.openings.filter(o=>o.type==='door'||o.type==='archway').length,windows=room.openings.filter(o=>o.type==='window').length
  if(doorways>MAX_DOORWAYS||windows>MAX_WINDOWS||room.openings.length>MAX_OPENINGS)hard('opening_capacity',`At most ${MAX_DOORWAYS} doors or archways and ${MAX_WINDOWS} windows are supported.`)
  for(const o of room.openings){const b=openingBasis(room,o.wall);const valid=[o.offsetMm,o.widthMm,o.heightMm,o.sillMm].every(Number.isInteger)&&o.offsetMm>=0&&o.sillMm>=0&&o.offsetMm+o.widthMm<=b.length&&o.sillMm+o.heightMm<=room.heightMm&&(o.type==='door'?o.widthMm>=400&&o.widthMm<=2000&&o.heightMm>=1000&&o.heightMm<=3000&&o.sillMm===0:o.type==='archway'?o.widthMm>=500&&o.widthMm<=3000&&o.heightMm>=1000&&o.heightMm<=3000&&o.sillMm===0:o.widthMm>=300&&o.widthMm<=3000&&o.heightMm>=300&&o.heightMm<=2500);if(!valid)hard('opening_invalid','Opening dimensions or position are outside the wall.',{openingIds:[o.id]})}
  for(let i=0;i<room.openings.length;i++)for(let j=i+1;j<room.openings.length;j++){const a=room.openings[i],b=room.openings[j];if(a.wall===b.wall&&a.offsetMm<=b.offsetMm+b.widthMm&&b.offsetMm<=a.offsetMm+a.widthMm)hard('opening_overlap','Openings on the same wall must have at least a 1 mm gap.',{openingIds:[a.id,b.id]})}
  for(const item of instances){const c=getConcept(catalogRevision,item.conceptId);if(!c?.available||!c.footprint){hard('unavailable','Furniture design is unavailable.',{instanceIds:[item.id]});continue}const {widthMm:w,depthMm:d,heightMm:h}=c.dimensions;if(c.footprint.kind==='polygon'){const error=validatePolygonFootprint(c.footprint.vertices,w,d);if(error){hard('footprint_invalid',error,{instanceIds:[item.id]});continue}}const lift=item.elevationMm??0,polygon=shapePolygon(item),minX=Math.min(...polygon.map(p=>p.x)),maxX=Math.max(...polygon.map(p=>p.x)),minZ=Math.min(...polygon.map(p=>p.z)),maxZ=Math.max(...polygon.map(p=>p.z));if(!Number.isInteger(item.centerXMm)||!Number.isInteger(item.centerZMm)||minX<0||maxX>room.widthMm||minZ<0||maxZ>room.depthMm||!polygonWithinPolygon(polygon,getRoomOutline(room))||lift<0||lift+h>room.heightMm)hard('containment','Furniture must fit inside the room.',{instanceIds:[item.id]})}
  for(let i=0;i<instances.length;i++)for(let j=i+1;j<instances.length;j++){const a=instances[i],b=instances[j];if(a.conceptId.startsWith('RUG-')||b.conceptId.startsWith('RUG-'))continue;const aBottom=a.elevationMm??0,bBottom=b.elevationMm??0,aTop=aBottom+(getConcept(catalogRevision,a.conceptId)?.dimensions.heightMm??0),bTop=bBottom+(getConcept(catalogRevision,b.conceptId)?.dimensions.heightMm??0);if(aBottom<bTop&&bBottom<aTop&&intersects(shapePolygon(a),shapePolygon(b)))advisory('furniture_overlap','Possible furniture overlap; projected shapes overlap.',{instanceIds:[a.id,b.id]})}
  for(const o of room.openings){const {a,basis}=openingPoints(room,o);for(const item of instances){if(item.conceptId.startsWith('RUG-'))continue;const poly=shapePolygon(item);const concept=getConcept(catalogRevision,item.conceptId);const atBoundary=poly.some(p=>Math.abs((p.x-a.x)*basis.ix+(p.z-a.z)*basis.iz)<1e-6);const along=poly.map(p=>(p.x-a.x)*basis.tx+(p.z-a.z)*basis.tz);if(concept && concept.dimensions.heightMm>o.sillMm && atBoundary && Math.max(...along)>0 && Math.min(...along)<o.widthMm)advisory('opening_obstruction','Furniture may obstruct an opening.',{instanceIds:[item.id],openingIds:[o.id]});if(o.type==='door'){const style=o.styleId?getDoorStyle(o.styleId):undefined,sidelight=style?.sidelightMm??0,leafWidth=o.widthMm-2*sidelight;const leaves=style?.leafCount===2?[{offset:0,width:o.widthMm/2,hinge:'min' as const},{offset:o.widthMm/2,width:o.widthMm/2,hinge:'max' as const}]:[{offset:sidelight,width:leafWidth,hinge:o.hinge}];for(const leaf of leaves){const hingeOffset=leaf.offset+(leaf.hinge==='min'?0:leaf.width),closedOffset=leaf.offset+(leaf.hinge==='min'?leaf.width:0),hinge={x:a.x+basis.tx*hingeOffset,z:a.z+basis.tz*hingeOffset},closed={x:a.x+basis.tx*closedOffset,z:a.z+basis.tz*closedOffset},theta0=Math.atan2(closed.z-hinge.z,closed.x-hinge.x),theta1=Math.atan2(basis.iz,basis.ix);let delta=theta1-theta0;while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;const sector=[hinge,...Array.from({length:17},(_,i)=>({x:hinge.x+leaf.width*Math.cos(theta0+delta*i/16),z:hinge.z+leaf.width*Math.sin(theta0+delta*i/16)}))];for(let k=1;k<sector.length-1;k++)if(intersects(poly,[hinge,sector[k],sector[k+1]])){advisory('door_swing','Furniture may obstruct the door swing.',{instanceIds:[item.id],openingIds:[o.id]});break}}}else { /* Opening approach is advisory, not an invented clearance. */ }} }
  return issues
}
export function getPlanPrimitives(project:Project) {
  const {room}=project,walls:WallBand[]=[]
  const cutouts=wallCutouts(room,project.wallObjects??[])
  for(const wall of ['N','E','S','W'] as Wall[]){const b=openingBasis(room,wall),os=cutouts.filter(o=>o.wall===wall).sort((a,c)=>a.offsetMm-c.offsetMm);let start=0;for(const o of [...os,undefined]){const end=o?.offsetMm??b.length;if(end>start){const x=b.x+b.tx*start+Math.min(0,-b.ix*100),z=b.z+b.tz*start+Math.min(0,-b.iz*100);walls.push({xMm:x,zMm:z,widthMm:b.tx?end-start:100,depthMm:b.tz?end-start:100})}if(o)start=o.offsetMm+o.widthMm}}
  walls.push(...getRoomInnerWallBands(room))
  const items=project.instances.map(item=>({id:item.id,conceptId:item.conceptId,pathD:localPath(item),svgTransform:`translate(${item.centerXMm} ${item.centerZMm}) rotate(${item.rotationDegrees??item.quarterTurn*90}) scale(${item.flipHorizontal?-1:1} ${item.flipVertical?-1:1})`,centerXMm:item.centerXMm,centerZMm:item.centerZMm,isRug:item.conceptId.startsWith('RUG-')}))
  const openings=room.openings.map((opening)=>{
    const {a,end,basis}=openingPoints(room,opening)
    if(opening.type==='window'){
      const dx=basis.ix*20,dz=basis.iz*20
      return{id:opening.id,type:opening.type,pathD:`M ${a.x+dx} ${a.z+dz} L ${end.x+dx} ${end.z+dz} M ${a.x-dx} ${a.z-dz} L ${end.x-dx} ${end.z-dz}`}
    }
    if(opening.type==='archway'){
      const inset=100,ax=a.x+basis.ix*inset,az=a.z+basis.iz*inset,bx=end.x+basis.ix*inset,bz=end.z+basis.iz*inset
      return{id:opening.id,type:opening.type,pathD:`M ${a.x} ${a.z} L ${ax} ${az} M ${end.x} ${end.z} L ${bx} ${bz}`}
    }
    const style=opening.styleId?getDoorStyle(opening.styleId):undefined,sidelight=style?.sidelightMm??0,leafWidth=opening.widthMm-2*sidelight
    const leaves=style?.leafCount===2?[{offset:0,width:opening.widthMm/2,hinge:'min' as const},{offset:opening.widthMm/2,width:opening.widthMm/2,hinge:'max' as const}]:[{offset:sidelight,width:leafWidth,hinge:opening.hinge}]
    const paths:string[]=[]
    if(sidelight){
      const start=a.x+basis.tx*sidelight,sz=a.z+basis.tz*sidelight,finish=end.x-basis.tx*sidelight,fz=end.z-basis.tz*sidelight
      paths.push(`M ${a.x} ${a.z} L ${start} ${sz}`,`M ${finish} ${fz} L ${end.x} ${end.z}`)
    }
    for(const leaf of leaves){
      const hingeOffset=leaf.offset+(leaf.hinge==='min'?0:leaf.width),closedOffset=leaf.offset+(leaf.hinge==='min'?leaf.width:0)
      const hinge={x:a.x+basis.tx*hingeOffset,z:a.z+basis.tz*hingeOffset},closed={x:a.x+basis.tx*closedOffset,z:a.z+basis.tz*closedOffset},open={x:hinge.x+basis.ix*leaf.width,z:hinge.z+basis.iz*leaf.width}
      const cross=(closed.x-hinge.x)*(open.z-hinge.z)-(closed.z-hinge.z)*(open.x-hinge.x)
      paths.push(`M ${hinge.x} ${hinge.z} L ${closed.x} ${closed.z}`,`M ${hinge.x} ${hinge.z} L ${open.x} ${open.z}`,`M ${closed.x} ${closed.z} A ${leaf.width} ${leaf.width} 0 0 ${cross>0?1:0} ${open.x} ${open.z}`)
    }
    return{id:opening.id,type:opening.type,pathD:paths.join(' ')}
  })
  const wallObjects=(project.wallObjects??[]).flatMap(item=>{
    const c=getWallConcept(item.conceptId);if(!c)return []
    const pose=wallAttachmentPose(room,{wall:item.wall,offsetMm:item.offsetMm,bottomMm:item.bottomMm,widthMm:c.widthMm,heightMm:c.heightMm,depthMm:c.depthMm})
    const pathD=`M ${pose.plan.map(p=>`${p.x} ${p.z}`).join(' L ')} Z`
    return [{id:item.id,conceptId:item.conceptId,wall:item.wall,pathD,minYmm:pose.minYmm,maxYmm:pose.maxYmm}]
  })
  const curvedWall = getRoomCurvedWall(room)
  const curvedWallPathD = curvedWall.length ? `M ${curvedWall.map(({x,z})=>`${x} ${z}`).join(' L ')}` : ''
  return {walls,items,openings,wallObjects,roomPathD:polygonPath(getRoomOutline(room).map(({x,z})=>({xMm:x,zMm:z}))),curvedWallPathD}
}
