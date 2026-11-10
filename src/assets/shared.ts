import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { FINISH_COLORS } from '../catalog'
import { organicRugOutline } from '../catalog/rugShapes'
import { createWallArtTexture } from './wallArt'

const color=(code:string)=>FINISH_COLORS[code as keyof typeof FINISH_COLORS] ?? '#cccccc'
const materials=new Map<string,THREE.Material>()
export function material(code:string):THREE.Material {
	const curtainMaterial=code==='CURTAIN'||code.startsWith('CURTAIN:'),baseCode=curtainMaterial&&code!=='CURTAIN'?code.slice('CURTAIN:'.length):code
	const breezeMaterial=code.startsWith('PLANT_LEAF')||curtainMaterial
	const key=code.startsWith('ARTWORK:')?`artwork:${code}`:code==='CAN'?'weave:CAN':code==='GLASS'?'glass:window':code==='MIRROR'?'glass:mirror':breezeMaterial?`breeze:${code}`:color(code),cached=materials.get(key);if(cached)return cached
 if(code==='MIRROR'){
  const mirror=new THREE.MeshBasicMaterial({color:'#c9e1f8',side:THREE.DoubleSide})
  materials.set(key,mirror);return mirror
 }
 let m:THREE.MeshStandardMaterial
 if(code==='GLASS'){
  m=new THREE.MeshStandardMaterial({color:'#c9e1f8',roughness:.24,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide})
  materials.set(key,m);return m
 }
	if(code.startsWith('ARTWORK:')){
	 const texture=createWallArtTexture(code.slice('ARTWORK:'.length))
	 const artwork=new THREE.MeshBasicMaterial({color:texture?'#ffffff':'#e9e2d5',map:texture??null,side:THREE.DoubleSide,toneMapped:false})
	 materials.set(key,artwork);return artwork
	}
	m=new THREE.MeshStandardMaterial({color:color(baseCode),roughness:baseCode==='CAN' ? 0.9 : code.startsWith('PLANT_LEAF') ? 0.52 : curtainMaterial ? 0.92 : 0.86,metalness:0,side:code.startsWith('PLANT_LEAF')||curtainMaterial ? THREE.DoubleSide : THREE.FrontSide})
	if(breezeMaterial){
	 m.userData.breezeAmplitude=curtainMaterial ? 0.038 : 0.058
	 m.userData.breezeAnimated=true
	 m.onBeforeCompile=shader=>{
	  shader.uniforms.uBreezeTime={value:0};shader.uniforms.uBreezeAmount={value:0};m.userData.breezeUniforms=shader.uniforms
	  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute float breezeWeight;
uniform float uBreezeTime;
uniform float uBreezeAmount;`).replace('#include <begin_vertex>',`#include <begin_vertex>
float breezePhase=uBreezeTime*1.28+position.y*2.7+position.x*1.8;
float breezeWave=sin(breezePhase)+sin(breezePhase*.54+position.x*2.4)*.2;
transformed.x+=breezeWave*uBreezeAmount*breezeWeight;
transformed.z+=cos(breezePhase*.72+position.x)*uBreezeAmount*.24*breezeWeight;`)
	 }
	 m.customProgramCacheKey=()=>`nook-breeze-v1:${code}`
	}
 if(code==='CAN'){
  m.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute vec2 caneCoordMm;
attribute float canePatternEnabled;
varying vec2 vCaneCoordMm;
varying float vCanePatternEnabled;`).replace('#include <begin_vertex>',`#include <begin_vertex>
vCaneCoordMm=caneCoordMm;
vCanePatternEnabled=canePatternEnabled;`)
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec2 vCaneCoordMm;
varying float vCanePatternEnabled;
float caneBand(float coord){float t=mod(coord,60.0);float aa=max(fwidth(coord),0.001);return smoothstep(0.0,aa,t)*(1.0-smoothstep(14.0-aa,14.0+aa,t));}`).replace('#include <color_fragment>',`#include <color_fragment>
if(vCanePatternEnabled>0.5){
 float u=vCaneCoordMm.x,v=vCaneCoordMm.y;
 float horizontal=caneBand(v),vertical=caneBand(u);
 float parity=mod(floor(u/60.0)+floor(v/60.0),2.0);
 float crossing=mix(1.05,0.92,parity);
 float plain=mix(0.90,1.05,horizontal);
 float withVertical=mix(0.98,crossing,horizontal);
 diffuseColor.rgb*=mix(plain,withVertical,vertical);
}`)
  }
  m.customProgramCacheKey=()=> 'nook-opaque-cane-v1'
 }
 materials.set(key,m);return m
}
export function allocatedFurnitureMaterialCount(){return materials.size+(sharedRugMaterial?1:0)}
export function merge(parts:THREE.BufferGeometry[],preserveCane=false,preserveBreeze=false) { const normalized=parts.map(g=>g.index?g.toNonIndexed():g);for(const g of normalized)for(const name of Object.keys(g.attributes))if(name!=='position'&&name!=='normal'&&!(preserveCane&&(name==='caneCoordMm'||name==='canePatternEnabled'))&&!(preserveBreeze&&name==='breezeWeight'))g.deleteAttribute(name);const merged=mergeGeometries(normalized);parts.forEach(g=>g.dispose());normalized.forEach(g=>{if(!parts.includes(g))g.dispose()});if(!merged)throw new Error('Could not merge furniture geometry');return merged }
export function connectBreezeAnimation(group:THREE.Group){
 group.traverse((object)=>{
  if(!(object instanceof THREE.Mesh))return
  const materials=Array.isArray(object.material)?object.material:[object.material]
  if(!materials.some((entry)=>entry.userData.breezeAnimated))return
  object.onBeforeRender=(_renderer,_scene,_camera,_geometry,activeMaterial)=>{
   if(!activeMaterial.userData.breezeAnimated)return
   const uniforms=activeMaterial.userData.breezeUniforms as {uBreezeTime?:{value:number};uBreezeAmount?:{value:number}}|undefined
   if(!uniforms?.uBreezeTime||!uniforms.uBreezeAmount)return
   let root:THREE.Object3D|null=object
   while(root&&typeof root.userData.breezeEnabled!=='boolean')root=root.parent
   let scene:THREE.Object3D|null=root
   while(scene&&!(scene instanceof THREE.Scene))scene=scene.parent
   const reduced=typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches
   uniforms.uBreezeTime.value=performance.now()/1000
   uniforms.uBreezeAmount.value=!reduced&&scene?.userData.animationsEnabled!==false&&root?.userData.breezeEnabled?Number(object.userData.breezeAmplitude??activeMaterial.userData.breezeAmplitude??.014):0
  }
 })
}
export function box(w:number,h:number,d:number,x:number,y:number,z:number,r=0){const g=r?new RoundedBoxGeometry(w,h,d,2,r):new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);return g}
export function frustum(x:number,z:number,h:number,top:number,bottom:number){const g=ringsGeometry([{y:0,points:quad(bottom,bottom)},{y:h,points:quad(top,top)}]);g.translate(x,0,z);return g}
export function ringsGeometry(rings:{y:number;points:[number,number][]}[]) {const vertices:number[]=[],indices:number[]=[];const n=rings[0].points.length;for(const ring of rings)for(const [x,z] of ring.points)vertices.push(x,ring.y,z);for(let k=0;k<rings.length-1;k++)for(let i=0;i<n;i++){const j=(i+1)%n,a=k*n+i,b=k*n+j,c=(k+1)*n+j,d=(k+1)*n+i;indices.push(a,d,b,b,d,c)}for(let i=1;i<n-1;i++){indices.push(0,i,i+1);const a=(rings.length-1)*n;indices.push(a,a+i+1,a+i)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g}
export function roundPoints(w:number,d:number,r:number,segments:number):[number,number][] {const points:[number,number][]=[];for(const [cx,cz,start] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let i=0;i<=segments;i++){const a=start+i*Math.PI/2/segments;points.push([cx+r*Math.cos(a),cz+r*Math.sin(a)])}return points}
export function quad(w:number,d:number):[number,number][]{return [[w/2,d/2],[-w/2,d/2],[-w/2,-d/2],[w/2,-d/2]]}
export function board(w:number,h:number,d:number,y:number){return ringsGeometry([{y:y-h/2,points:quad(w-.004,d-.004)},{y:y-h/2+.002,points:quad(w,d)},{y:y+h/2-.002,points:quad(w,d)},{y:y+h/2,points:quad(w-.004,d-.004)}])}
// Extrude a simple Y/Z perimeter, retaining its authored profile and flat outward faces.
export function profile(xMin:number,xMax:number,points:[number,number][]) {
 const vertices:number[]=[],faces:number[]=[]
 for(const x of [xMin,xMax])for(const [y,z] of points)vertices.push(x,y,z)
 const n=points.length, area=points.reduce((sum,[y,z],i)=>{const [ny,nz]=points[(i+1)%n];return sum+y*nz-ny*z},0)
 for(const t of THREE.ShapeUtils.triangulateShape(points.map(([y,z])=>new THREE.Vector2(y,z)),[])){
  const [a,b,c]=t;const cross=(points[b][0]-points[a][0])*(points[c][1]-points[a][1])-(points[b][1]-points[a][1])*(points[c][0]-points[a][0]);
  if(cross>0)faces.push(a,c,b,n+a,n+b,n+c);else faces.push(a,b,c,n+a,n+c,n+b)
 }
 for(let i=0;i<n;i++){const j=(i+1)%n;if(area>0)faces.push(i,j,n+i,j,n+j,n+i);else faces.push(i,n+i,j,j,n+i,n+j)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(faces);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat
}
export function cylinder(radius:number,height:number,segments:number,y:number){const g=new THREE.CylinderGeometry(radius,radius,height,segments,1);g.translate(0,y,0);return g}
export function drum(){
 const positions:number[]=[],normals:number[]=[],indices:number[]=[];const segments=40,outer=.21,inner=.206,bottom=1.18,top=1.5
 const vertex=(x:number,y:number,z:number,nx:number,ny:number,nz:number)=>{positions.push(x,y,z);normals.push(nx,ny,nz)}
 for(let i=0;i<=segments;i++){const a=i*Math.PI*2/segments,c=Math.cos(a),s=Math.sin(a);vertex(outer*c,bottom,outer*s,c,0,s);vertex(outer*c,top,outer*s,c,0,s);vertex(inner*c,bottom,inner*s,-c,0,-s);vertex(inner*c,top,inner*s,-c,0,-s);vertex(outer*c,top,outer*s,0,1,0);vertex(inner*c,top,inner*s,0,1,0);vertex(outer*c,bottom,outer*s,0,-1,0);vertex(inner*c,bottom,inner*s,0,-1,0)}
 for(let i=0;i<segments;i++){const a=i*8,b=(i+1)*8;indices.push(a,b,a+1,b,b+1,a+1,a+2,a+3,b+2,b+2,a+3,b+3,a+4,b+4,a+5,b+4,b+5,a+5,a+6,a+7,b+6,b+6,a+7,b+7)}
 for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setIndex(indices);return g
}

export function loft(bottom:[number,number][],top:[number,number][],height:number){return ringsGeometry([{y:0,points:bottom},{y:height,points:top}])}
export function splay(bx:number,bz:number,tx:number,tz:number,height:number,bottom:number,top:number){const indexed=loft(quad(bottom,bottom).map(([x,z])=>[x+bx,z+bz]),quad(top,top).map(([x,z])=>[x+tx,z+tz]),height),flat=indexed.toNonIndexed();indexed.dispose();flat.computeVertexNormals();return flat}
export function circlePoints(radius:number,n:number,cx=0,cz=0):[number,number][]{return Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n;return [cx+radius*Math.cos(a),cz+radius*Math.sin(a)]})}
export function slabPolygon(points:readonly (readonly [number,number])[],bottom:number,top:number){
 const p=points.map(([x,z])=>new THREE.Vector2(x/1000,z/1000));const n=p.length, positions:number[]=[],indices:number[]=[]
 for(const y of [bottom,top])for(const v of p)positions.push(v.x,y,v.y)
 const area=THREE.ShapeUtils.area(p)
 for(let i=0;i<n;i++){const j=(i+1)%n;if(area>0)indices.push(i,j,n+i,j,n+j,n+i);else indices.push(i,n+i,j,j,n+i,n+j)}
 for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(p,[])){const cross=(p[b].x-p[a].x)*(p[c].y-p[a].y)-(p[b].y-p[a].y)*(p[c].x-p[a].x);if(cross>0)indices.push(a,b,c,n+a,n+c,n+b);else indices.push(a,c,b,n+a,n+b,n+c)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat
}
// Closed two-sided grid: upper and lower point arrays are in row-major order.
export function gridVolume(upper:THREE.Vector3[],lower:THREE.Vector3[],cols:number,rows:number){
 const positions:number[]=[],indices:number[]=[];for(const p of [...upper,...lower])positions.push(p.x,p.y,p.z);const offset=upper.length
 for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){const a=r*cols+c,b=a+1,d=(r+1)*cols+c,e=d+1;indices.push(a,b,d,b,e,d,offset+a,offset+d,offset+b,offset+b,offset+d,offset+e)}
 const perimeter:number[]=[];for(let c=0;c<cols;c++)perimeter.push(c);for(let r=1;r<rows;r++)perimeter.push(r*cols+cols-1);for(let c=cols-2;c>=0;c--)perimeter.push((rows-1)*cols+c);for(let r=rows-2;r>0;r--)perimeter.push(r*cols)
 const surfaces=new THREE.BufferGeometry();surfaces.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));surfaces.setIndex(indices);surfaces.computeVertexNormals()
 const sidePositions:number[]=[];for(let i=0;i<perimeter.length;i++){const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];for(const point of [upper[a],lower[a],upper[b],upper[b],lower[a],lower[b]])sidePositions.push(point.x,point.y,point.z)}
 const sides=new THREE.BufferGeometry();sides.setAttribute('position',new THREE.Float32BufferAttribute(sidePositions,3));sides.computeVertexNormals();return merge([surfaces,sides])
}
export function coneShade(){
 const positions:number[]=[],normals:number[]=[],indices:number[]=[],n=40, slope=(.235-.145)/.36,normalFactor=1/Math.hypot(1,slope)
 const v=(r:number,y:number,c:number,s:number,nx:number,ny:number,nz:number)=>{positions.push(r*c,y,r*s);normals.push(nx,ny,nz)}
 for(let i=0;i<=n;i++){const a=i*2*Math.PI/n,c=Math.cos(a),s=Math.sin(a);v(.235,1.19,c,s,c*normalFactor,slope*normalFactor,s*normalFactor);v(.145,1.55,c,s,c*normalFactor,slope*normalFactor,s*normalFactor);v(.231,1.19,c,s,-c*normalFactor,-slope*normalFactor,-s*normalFactor);v(.141,1.55,c,s,-c*normalFactor,-slope*normalFactor,-s*normalFactor);v(.145,1.55,c,s,0,1,0);v(.141,1.55,c,s,0,1,0);v(.235,1.19,c,s,0,-1,0);v(.231,1.19,c,s,0,-1,0)}
 for(let i=0;i<n;i++){const a=i*8,b=(i+1)*8;indices.push(a,a+1,b,b,a+1,b+1,a+2,b+2,a+3,b+2,b+3,a+3,a+4,a+5,b+4,b+4,a+5,b+5,a+6,b+6,a+7,b+6,b+7,a+7)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setIndex(indices);return g
}
export function tuftedSeat(x:number){
 const source=box(.64,.13,.7,x,.365,.02,.03),g=source.index?source.toNonIndexed():source,p=g.getAttribute('position'),n=g.getAttribute('normal'),positions:number[]=[],normals:number[]=[]
 for(let i=0;i<p.count;i+=3){if([i,i+1,i+2].every(j=>Math.abs(p.getY(j)-.43)<1e-6))continue;for(let j=i;j<i+3;j++){positions.push(p.getX(j),p.getY(j),p.getZ(j));normals.push(n.getX(j),n.getY(j),n.getZ(j))}}
 const shape=new THREE.Shape();shape.moveTo(-.29,-.30);shape.lineTo(.29,-.30);shape.lineTo(.29,.34);shape.lineTo(-.29,.34);shape.closePath();const hole=new THREE.Path();hole.moveTo(-.016,.004);hole.lineTo(-.016,.036);hole.lineTo(.016,.036);hole.lineTo(.016,.004);hole.closePath();shape.holes.push(hole)
 const contours=shape.extractPoints(1);const tri=THREE.ShapeUtils.triangulateShape(contours.shape,contours.holes),all=[...contours.shape,...contours.holes[0]]
 const push=(v:THREE.Vector2,y:number,nx=0,ny=1,nz=0)=>{positions.push(v.x+x,y,v.y);normals.push(nx,ny,nz)}
 for(const [a,b,c] of tri){const va=all[a],vb=all[b],vc=all[c];const cr=(vb.x-va.x)*(vc.y-va.y)-(vb.y-va.y)*(vc.x-va.x);if(cr>0){push(va,.43);push(vc,.43);push(vb,.43)}else{push(va,.43);push(vb,.43);push(vc,.43)}}
 const outer=[[-.016,.004],[.016,.004],[.016,.036],[-.016,.036]],inner=[[-.006,.014],[.006,.014],[.006,.026],[-.006,.026]]
 const append=(a:number[],b:number[],c:number[])=>{const va=new THREE.Vector3(a[0]+x,a[1],a[2]),vb=new THREE.Vector3(b[0]+x,b[1],b[2]),vc=new THREE.Vector3(c[0]+x,c[1],c[2]),normal=vb.clone().sub(va).cross(vc.clone().sub(va)).normalize();for(const v of [va,vb,vc]){positions.push(v.x,v.y,v.z);normals.push(normal.x,normal.y,normal.z)}}
 for(let i=0;i<4;i++){const j=(i+1)%4,a=[outer[i][0],.43,outer[i][1]],b=[outer[j][0],.43,outer[j][1]],c=[inner[j][0],.428,inner[j][1]],d=[inner[i][0],.428,inner[i][1]];append(a,c,b);append(a,d,c)}append([inner[0][0],.428,inner[0][1]],[inner[2][0],.428,inner[2][1]],[inner[1][0],.428,inner[1][1]]);append([inner[0][0],.428,inner[0][1]],[inner[3][0],.428,inner[3][1]],[inner[2][0],.428,inner[2][1]])
 if(g!==source)source.dispose();g.dispose();const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));return result
}
export function mesh(geometry:THREE.BufferGeometry,mat:THREE.Material){const m=new THREE.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;return m}
let sharedRugMaterial:THREE.MeshStandardMaterial | undefined
export function rugMaterial(){
 if(sharedRugMaterial)return sharedRugMaterial
 const mat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
 mat.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute float rugPatternId;
attribute float rugSwap;
attribute vec2 rugSize;
attribute vec3 rugGroundColor;
attribute vec3 rugMotifColor;
varying vec3 rugPosition;
varying vec3 rugNormal;
varying float vRugPatternId;
varying float vRugSwap;
varying vec2 vRugSize;
varying vec3 vRugGroundColor;
varying vec3 vRugMotifColor;`).replace('#include <begin_vertex>',`#include <begin_vertex>
rugPosition = position;
rugNormal = normal;
vRugPatternId = rugPatternId;
vRugSwap = rugSwap;
vRugSize = rugSize;
vRugGroundColor = rugGroundColor;
vRugMotifColor = rugMotifColor;`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 rugPosition;
varying vec3 rugNormal;
varying float vRugPatternId;
varying float vRugSwap;
varying vec2 vRugSize;
varying vec3 vRugGroundColor;
varying vec3 vRugMotifColor;
float rr(vec2 p, vec2 b, float r) { vec2 q=abs(p)-(b-vec2(r)); return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }`).replace('#include <color_fragment>',`#include <color_fragment>
float outer=rr(rugPosition.xz,vec2(1.16,0.81),0.024);
float inner=rr(rugPosition.xz,vec2(1.14,0.79),0.004);
vec2 p=rugPosition.xz;
bool block=(p.x>=-0.9 && p.x<=-0.3 && p.y>=-0.6 && p.y<=0.0)||(p.x>=-0.3 && p.x<=0.3 && p.y>=-0.3 && p.y<=0.3)||(p.x>=0.3 && p.x<=0.9 && p.y>=0.0 && p.y<=0.6);
vec2 a=abs(p);
bool filOuter=(a.x<=1.04 && a.y<=0.73)||(a.x<=1.08 && a.y<=0.65);
bool filInner=(a.x<=0.98 && a.y<=0.67)||(a.x<=1.02 && a.y<=0.59);
vec2 rugUV=p/max(vRugSize*0.5,vec2(0.001));
float radial=length(rugUV);
float angle=atan(rugUV.y,rugUV.x);
float organicEdge=1.0+0.055*sin(7.0*angle+0.7)+0.025*cos(4.0*angle-0.5);
float organicRadius=radial/organicEdge;
float circleWave=rugUV.y-(0.20*sin(2.6*rugUV.x)+0.15*rugUV.x);
bool circlePattern=radial>0.945||circleWave<-.34||(circleWave>.34&&rugUV.x>.05);
bool blobPattern=organicRadius>.91;
float diamondA=abs(fract((rugUV.x+rugUV.y)*3.5)-0.5);
float diamondB=abs(fract((rugUV.x-rugUV.y)*3.5)-0.5);
bool squarePattern=max(abs(rugUV.x),abs(rugUV.y))>.94||min(diamondA,diamondB)<.028;
float rugRow=floor((rugUV.y+1.0)*7.0);
float rugColumn=floor((rugUV.x+1.0)*8.0+mod(rugRow,2.0)*0.5);
bool broadBlock=mod(rugRow+rugColumn,2.0)<1.0;
float weaveLine=abs(fract((rugUV.x+1.0)*14.0+mod(rugRow,2.0)*0.5)-0.5);
bool fineWeave=weaveLine<0.065&&mod(rugRow,2.0)<1.0;
bool graphicPattern=max(abs(rugUV.x),abs(rugUV.y))>.95||(broadBlock&&abs(rugUV.x)<.88&&abs(rugUV.y)<.88)||fineWeave;
bool motif = rugNormal.y > 0.5 && (vRugPatternId < 0.5 ? (outer <= 0.0 && inner >= 0.0) : (vRugPatternId < 1.5 ? block : (vRugPatternId < 2.5 ? (filOuter && !filInner) : (vRugPatternId < 3.5 ? circlePattern : (vRugPatternId < 4.5 ? blobPattern : (vRugPatternId < 5.5 ? squarePattern : graphicPattern))))));
diffuseColor.rgb = motif ? vRugMotifColor : vRugGroundColor;`)
 }
 mat.customProgramCacheKey=()=> 'nook-rug-procedural-shapes-v2'
 sharedRugMaterial=mat
 return mat
}
export type RugShape = 'rectangle' | 'circle' | 'organic' | 'square'
export function rugGeometry(width:number,depth:number,patternId:number,ground:string,motif='RBL',shape:RugShape='rectangle'){
 const pts: [number,number][]=shape==='circle'?circlePoints(Math.min(width,depth)/2,96):shape==='organic'?organicRugOutline(Math.round(width*1000),Math.round(depth*1000)).map(({xMm,zMm})=>[xMm/1000,zMm/1000]):roundPoints(width,depth,shape==='square' ? .008 : .012,shape==='square'?3:2)
 const g=ringsGeometry([{y:0,points:pts},{y:.01,points:pts}]),count=g.getAttribute('position').count
 g.setAttribute('rugPatternId',new THREE.Float32BufferAttribute(new Float32Array(count).fill(patternId),1))
 g.setAttribute('rugSwap',new THREE.Float32BufferAttribute(new Float32Array(count).fill(ground==='RBL'?1:0),1))
 const size=new Float32Array(count*2);for(let index=0;index<count;index++){size[index*2]=width;size[index*2+1]=depth}g.setAttribute('rugSize',new THREE.Float32BufferAttribute(size,2))
 const attributeColor=(code:string)=>{const value=new THREE.Color(color(code)),rgb=new Float32Array(count*3);for(let index=0;index<count;index++){rgb[index*3]=value.r;rgb[index*3+1]=value.g;rgb[index*3+2]=value.b}return new THREE.Float32BufferAttribute(rgb,3)}
 g.setAttribute('rugGroundColor',attributeColor(ground))
 g.setAttribute('rugMotifColor',attributeColor(motif))
 return g
}

