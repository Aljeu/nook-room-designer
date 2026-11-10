import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { defaultFinishes,getConcept } from '../catalog'
import { buildFurniture,disposeFurniture,prepareFurniture } from './models'

const specs:Record<string,{size:[number,number,number];regions:string[];tris:number}>={
 'SOF-FIL-01':{size:[1.9,.82,.85],regions:['Upholstery','Frame','Weave'],tris:896},
 'CFT-FIL-01':{size:[1.1,.4,.6],regions:['Top','Frame'],tris:320},
 'SFT-FIL-01':{size:[.45,.52,.45],regions:['Frame','Weave'],tris:344},
 'MED-FIL-01':{size:[1.6,.5,.42],regions:['Body','Frame','Weave'],tris:252},
 'BKC-FIL-01':{size:[.8,1.6,.34],regions:['Body','Weave'],tris:200},
 'RUG-FIL-01':{size:[2.3,.01,1.6],regions:['Textile'],tris:44},
 'LMP-FIL-01':{size:[.45,1.5,.45],regions:['Frame','Metalwork','Weave'],tris:616},
}
const item=(id:string)=>({id,conceptId:id,centerXMm:2000,centerZMm:1500,quarterTurn:0 as const,finishes:defaultFinishes(getConcept(2,id)!)})
beforeAll(()=>prepareFurniture(['CHR-FIL-01','SOF-SCA-01','SOF-MCM-01']))
describe('core Filipino assets',()=>{
 for(const [id,spec] of Object.entries(specs))it(`constructs ${id} with exact bounds, regions and triangles`,()=>{
  const model=buildFurniture(item(id));try{
   expect(model.children.map(c=>c.name)).toEqual(spec.regions);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());expect(size.x).toBeCloseTo(spec.size[0],5);expect(size.y).toBeCloseTo(spec.size[1],5);expect(size.z).toBeCloseTo(spec.size[2],5);expect(bounds.min.y).toBeCloseTo(0,6)
   let count=0;for(const c of model.children){const g=(c as THREE.Mesh).geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),idx=g.index,num=idx?.count??p.count;count+=num/3;for(let i=0;i<num;i+=3){const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,d=idx?idx.getX(i+2):i+2;const va=new THREE.Vector3().fromBufferAttribute(p,a),face=new THREE.Vector3().fromBufferAttribute(p,b).sub(va).cross(new THREE.Vector3().fromBufferAttribute(p,d).sub(va));const normal=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).add(new THREE.Vector3().fromBufferAttribute(n,d));expect([va.x,va.y,va.z,normal.x,normal.y,normal.z].every(Number.isFinite)).toBe(true);if(face.lengthSq()>1e-16)expect(face.dot(normal),`${id} ${(c as THREE.Mesh).name} triangle ${i/3}`).toBeGreaterThan(-1e-10)}}
   console.log(`${id}: ${count} triangles/${model.children.length} regions`);expect(count).toBe(spec.tris)
   model.rotation.y=-Math.PI/2;const rotated=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());expect(rotated.x).toBeCloseTo(spec.size[2],5);expect(rotated.z).toBeCloseTo(spec.size[0],5)
  }finally{disposeFurniture(model)}
 })
 it('keeps trestle holes open and the side-table inset supported',()=>{
  const table=buildFurniture(item('CFT-FIL-01'));try{table.position.set(0,0,0);table.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(-1,.2,0),new THREE.Vector3(1,0,0));expect(ray.intersectObject(table,true)).toHaveLength(0)}finally{disposeFurniture(table)}
  const side=buildFurniture(item('SFT-FIL-01'));try{side.position.set(0,0,0);side.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)),hits=ray.intersectObject(side,true);expect(hits[0].object.name).toBe('Weave');expect(hits.some(h=>h.object.name==='Frame')).toBe(true)}finally{disposeFurniture(side)}
 })
 it('uses shared CAN material with geometry-owned coordinates for all orientations and seam',()=>{
  const models=['CHR-FIL-01','SOF-FIL-01','SFT-FIL-01','MED-FIL-01','BKC-FIL-01','LMP-FIL-01'].map(id=>buildFurniture(item(id)));try{
   const meshes=models.map(m=>m.getObjectByName('Weave') as THREE.Mesh),material=meshes[0].material;expect(meshes.every(m=>m.material===material)).toBe(true)
   for(const mesh of meshes){const g=mesh.geometry,p=g.getAttribute('position'),uv=g.getAttribute('caneCoordMm'),enabled=g.getAttribute('canePatternEnabled');expect(uv.count).toBe(p.count);expect(enabled.count).toBe(p.count);expect(Array.from(enabled.array)).toContain(1);expect(Array.from(enabled.array)).toContain(0)}
   const lamp=meshes[5].geometry,uv=lamp.getAttribute('caneCoordMm'),enabled=lamp.getAttribute('canePatternEnabled');expect(uv.getX(0)).toBeCloseTo(0);expect(uv.getX(40*8)).toBeCloseTo(1440);expect(enabled.getX(0)).toBe(1);expect(enabled.getX(4)).toBe(0)
  }finally{models.forEach(disposeFurniture)}
 })
 it('shares the rug shader across all three styles and both finish orders',()=>{
  const ids=['RUG-SCA-01','RUG-MCM-01','RUG-FIL-01'],models=ids.flatMap(id=>[false,true].map(swap=>{const data=item(id);if(swap)data.finishes={TextileGround:'RBL',TextileMotif:'OAT'};return buildFurniture(data)}));try{const mats=models.map(m=>(m.children[0] as THREE.Mesh).material);expect(mats.every(m=>m===mats[0])).toBe(true);models.forEach((m,i)=>{const g=(m.children[0] as THREE.Mesh).geometry;expect(g.getAttribute('rugPatternId').getX(0)).toBe(Math.floor(i/2));expect(g.getAttribute('rugSwap').getX(0)).toBe(i%2)})}finally{models.forEach(disposeFurniture)}
 })
})

it('maps authored CAN coordinates on vertical and horizontal broad faces',()=>{
 const sofa=buildFurniture(item('SOF-FIL-01')),side=buildFurniture(item('SFT-FIL-01')),chair=buildFurniture(item('CHR-FIL-01'))
 try{
  let xy=0,zy=0,xz=0
  for(const model of [chair,sofa,side]){
   const g=(model.getObjectByName('Weave') as THREE.Mesh).geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('caneCoordMm'),enabled=g.getAttribute('canePatternEnabled')
   for(let i=0;i<p.count;i++)if(enabled.getX(i)>.5){
    if(model===chair){expect(uv.getX(i)).toBeCloseTo(p.getX(i)*1000+300,3);expect(uv.getY(i)).toBeCloseTo(p.getY(i)*1000-430,3)}
    else if(model===sofa&&Math.abs(n.getZ(i))>.5){xy++;expect(uv.getX(i)).toBeCloseTo(p.getX(i)*1000+890,3);expect(uv.getY(i)).toBeCloseTo(p.getY(i)*1000-530,3)}
    else if(model===sofa&&Math.abs(n.getX(i))>.5){zy++;expect(uv.getX(i)).toBeCloseTo(p.getZ(i)*1000+365,3);expect(uv.getY(i)).toBeCloseTo(p.getY(i)*1000-330,3)}
    else if(model===side){xz++;expect(Math.abs(n.getY(i))).toBeGreaterThan(.99);expect(uv.getX(i)).toBeCloseTo(p.getX(i)*1000+165,3);expect(uv.getY(i)).toBeCloseTo(p.getZ(i)*1000+165,3)}
   }
  }
  expect(xy).toBeGreaterThan(0);expect(zy).toBeGreaterThan(0);expect(xz).toBeGreaterThan(0)
 }finally{[sofa,side,chair].forEach(disposeFurniture)}
})

it('keeps procedural rug masks and uses per-vertex finish colors',()=>{
 const model=buildFurniture(item('RUG-FIL-01'));try{const mat=(model.children[0] as THREE.Mesh).material as THREE.Material,shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};mat.onBeforeCompile(shader as never,{} as never);expect(shader.fragmentShader).toContain('vRugPatternId < 0.5');expect(shader.fragmentShader).toContain('vRugPatternId < 1.5 ? block');expect(shader.fragmentShader).toContain('filOuter && !filInner');expect(shader.fragmentShader).toContain('vRugGroundColor');expect(shader.fragmentShader).toContain('vRugMotifColor');expect(shader.fragmentShader).toContain('diffuseColor.rgb = motif ? vRugMotifColor : vRugGroundColor;')}finally{disposeFurniture(model)}
})
