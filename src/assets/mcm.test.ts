import { describe, expect, it, beforeAll } from 'vitest'
import * as THREE from 'three'
import { getConcept,defaultFinishes } from '../catalog'
import { KIDNEY_CONTOUR } from '../catalog/mcm'
import { buildFurniture,disposeFurniture,prepareFurniture } from './models'

beforeAll(()=>prepareFurniture(['SOF-SCA-01','SOF-MCM-01']))
const checks:Record<string,{size:[number,number,number];regions:string[];budget:number}>={
 'SOF-MCM-01':{size:[2.1,.78,.86],regions:['Upholstery','Frame'],budget:1996},'CHR-MCM-01':{size:[.78,.8,.86],regions:['Upholstery','Frame'],budget:336},'CFT-MCM-01':{size:[1.12,.4,.62],regions:['Top','Frame'],budget:96},'SFT-MCM-01':{size:[.46,.51,.46],regions:['Top','Frame'],budget:448},'MED-MCM-01':{size:[1.7,.55,.42],regions:['Body','Fronts','Frame'],budget:752},'BKC-MCM-01':{size:[.9,1.55,.34],regions:['Body','Frame'],budget:236},'RUG-MCM-01':{size:[2.3,.01,1.6],regions:['Textile'],budget:44},'LMP-MCM-01':{size:[.55,1.55,.55],regions:['Frame','Metalwork','Shade'],budget:508},
}
const instance=(id:string)=>({id,conceptId:id,centerXMm:2000,centerZMm:1500,quarterTurn:0 as const,finishes:defaultFinishes(getConcept(2,id)!)})
describe('MCM authored furniture',()=>{
 for(const [id,expected] of Object.entries(checks)) it(`builds ${id} with finite geometry, authored bounds and budget`,()=>{
  const model=buildFurniture(instance(id));try{
   expect(model.children.map(o=>o.name)).toEqual(expected.regions)
   let triangles=0;model.traverse(o=>{if(o instanceof THREE.Mesh){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++)expect([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite)).toBe(true);triangles+=(o.geometry.index?.count??p.count)/3}})
   console.log(`${id}: ${triangles} triangles / ${model.children.length} meshes`)
   expect(triangles).toBeLessThanOrEqual(expected.budget)
   const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());expect(size.x).toBeCloseTo(expected.size[0],5);expect(size.y).toBeCloseTo(expected.size[1],5);expect(size.z).toBeCloseTo(expected.size[2],5);expect(bounds.min.y).toBeCloseTo(0,5)
   model.rotation.y=-Math.PI/2;const rotated=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());expect(rotated.x).toBeCloseTo(expected.size[2],5);expect(rotated.z).toBeCloseTo(expected.size[0],5)
  }finally{disposeFurniture(model)}
 })
 it('uses exactly the shared kidney perimeter for both caps',()=>{const model=buildFurniture(instance('CFT-MCM-01'));try{const top=model.getObjectByName('Top') as THREE.Mesh,p=top.geometry.getAttribute('position');for(const [x,z] of KIDNEY_CONTOUR){expect(Array.from({length:p.count},(_,i)=>i).some(i=>Math.abs(p.getX(i)-x/1000)<1e-6&&Math.abs(p.getZ(i)-z/1000)<1e-6&&Math.abs(p.getY(i)-.4)<1e-6)).toBe(true)}}finally{disposeFurniture(model)}})
 it('shares one material across both rug patterns and paired finish orders',()=>{
  const models=['RUG-SCA-01','RUG-MCM-01'].flatMap(id=>[false,true].map(swap=>{const item=instance(id);if(swap)item.finishes={TextileGround:'RBL',TextileMotif:'OAT'};return buildFurniture(item)}))
  try {
   const meshes=models.map(m=>m.children[0] as THREE.Mesh),material=meshes[0].material as THREE.MeshStandardMaterial
   expect(meshes.every(m=>m.material===material)).toBe(true)
   for(let i=0;i<meshes.length;i++){
    const g=meshes[i].geometry,p=g.getAttribute('position'),normal=g.getAttribute('normal'),pattern=g.getAttribute('rugPatternId'),swap=g.getAttribute('rugSwap')
    expect(p.count).toBe(24);expect(g.index?.count).toBe(132);expect(normal.count).toBe(p.count)
    for(let j=0;j<p.count;j++){expect(pattern.getX(j)).toBe(i<2?0:1);expect(swap.getX(j)).toBe(i%2)}
    if(i%2){const previous=meshes[i-1].geometry;expect(Array.from(p.array)).toEqual(Array.from(previous.getAttribute('position').array));expect(Array.from(normal.array)).toEqual(Array.from(previous.getAttribute('normal').array));expect(Array.from(g.index!.array)).toEqual(Array.from(previous.index!.array))}
   }
   expect(material.customProgramCacheKey()).toBe('nook-rug-procedural-shapes-v2')
   const shader={uniforms:{} as Record<string,unknown>,vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'}
   material.onBeforeCompile(shader as never,{} as never)
   expect(shader.vertexShader).toContain('attribute vec3 rugGroundColor');expect(shader.vertexShader).toContain('attribute vec3 rugMotifColor')
   expect(shader.fragmentShader).toContain('vRugPatternId < 0.5');expect(shader.fragmentShader).toContain('vRugGroundColor');expect(shader.fragmentShader).toContain('vRugMotifColor')
  } finally {models.forEach(disposeFurniture)}
 })
})

describe('W2 construction details',()=>{
 it('retains three recessed sofa tuft centers without a flat cap over them',()=>{
  const model=buildFurniture(instance('SOF-MCM-01'));try{
   const p=((model.getObjectByName('Upholstery') as THREE.Mesh).geometry).getAttribute('position')
   for(const x of [-.65,0,.65]){
    let recess=false,covered=false
    for(let i=0;i<p.count;i+=3){const a=new THREE.Vector2(p.getX(i),p.getZ(i)),b=new THREE.Vector2(p.getX(i+1),p.getZ(i+1)),c=new THREE.Vector2(p.getX(i+2),p.getZ(i+2));const sign=(u:THREE.Vector2,v:THREE.Vector2)=>(v.x-u.x)*(.02-u.y)-(v.y-u.y)*(x-u.x);const signs=[sign(a,b),sign(b,c),sign(c,a)];if(signs.every(s=>s>=-1e-9)||signs.every(s=>s<=1e-9)){if([i,i+1,i+2].every(j=>Math.abs(p.getY(j)-.43)<1e-6))covered=true;if([i,i+1,i+2].every(j=>Math.abs(p.getY(j)-.428)<1e-6))recess=true}}
    expect(recess).toBe(true);expect(covered).toBe(false)
   }
  }finally{disposeFurniture(model)}
 })
 it('keeps the hollow conical shade faces aligned with their normals',()=>{
  const model=buildFurniture(instance('LMP-MCM-01'));try{const g=(model.getObjectByName('Shade') as THREE.Mesh).geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),idx=g.index!;for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2),va=new THREE.Vector3().fromBufferAttribute(p,a),vb=new THREE.Vector3().fromBufferAttribute(p,b),vc=new THREE.Vector3().fromBufferAttribute(p,c),face=vb.sub(va).cross(vc.sub(va)),normal=new THREE.Vector3().fromBufferAttribute(n,a);expect(face.dot(normal)).toBeGreaterThan(0)}}finally{disposeFurniture(model)}
 })
})

it('keeps chair grid and kidney cap winding consistent with their normals',()=>{
 for(const id of ['CHR-MCM-01','CFT-MCM-01']){
  const model=buildFurniture(instance(id));try{model.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const g=o.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),idx=g.index,count=idx?.count??p.count;for(let i=0;i<count;i+=3){const ia=idx?idx.getX(i):i,ib=idx?idx.getX(i+1):i+1,ic=idx?idx.getX(i+2):i+2;const a=new THREE.Vector3().fromBufferAttribute(p,ia),b=new THREE.Vector3().fromBufferAttribute(p,ib),c=new THREE.Vector3().fromBufferAttribute(p,ic),face=b.sub(a).cross(c.sub(a));if(face.lengthSq()<1e-16)continue;const normal=new THREE.Vector3().fromBufferAttribute(n,ia).add(new THREE.Vector3().fromBufferAttribute(n,ib)).add(new THREE.Vector3().fromBufferAttribute(n,ic));expect(face.dot(normal),`${id} ${o.name} triangle ${i/3}`).toBeGreaterThan(-1e-10)}})}finally{disposeFurniture(model)}
 }
})

it('leaves the kidney notch uncovered by the rendered top cap',()=>{
 const model=buildFurniture(instance('CFT-MCM-01'));try{const g=(model.getObjectByName('Top') as THREE.Mesh).geometry,p=g.getAttribute('position');let covered=false
  for(let i=0;i<p.count;i+=3){if(![i,i+1,i+2].every(j=>Math.abs(p.getY(j)-.4)<1e-6))continue;const a=new THREE.Vector2(p.getX(i),p.getZ(i)),b=new THREE.Vector2(p.getX(i+1),p.getZ(i+1)),c=new THREE.Vector2(p.getX(i+2),p.getZ(i+2));const sign=(u:THREE.Vector2,v:THREE.Vector2)=>(v.x-u.x)*(.13-u.y)-(v.y-u.y)*(-.30-u.x),values=[sign(a,b),sign(b,c),sign(c,a)];if(values.every(v=>v>=0)||values.every(v=>v<=0))covered=true}
  expect(covered).toBe(false)
 }finally{disposeFurniture(model)}
})

it('preserves arbitrary rotation, both flips and elevation in the model root',()=>{
 const model=buildFurniture({...instance('CHR-MCM-01'),rotationDegrees:105,flipHorizontal:true,flipVertical:true,elevationMm:120});try{expect(model.rotation.y).toBeCloseTo(-105*Math.PI/180);expect(model.scale.toArray()).toEqual([-1,1,-1]);expect(model.position.y).toBeCloseTo(.12)}finally{disposeFurniture(model)}
})
