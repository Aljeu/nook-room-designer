import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { defaultFinishes, getConcept } from '../catalog'
import { FIL_CHAIR_CONTOUR } from '../catalog/filipino'
import { createSampleProject } from '../domain/sample'
import { getPlanPrimitives, polygonPath, validatePolygonFootprint,validateProjectSpatial } from '../geometry'
import { buildFurniture,createFamilyPreparer,disposeFurniture,prepareFurniture } from './models'

const item=()=>({id:'fil-chair',conceptId:'CHR-FIL-01',centerXMm:1200,centerZMm:1200,quarterTurn:0 as const,finishes:defaultFinishes(getConcept(2,'CHR-FIL-01')!)})
beforeAll(()=>prepareFurniture(['CHR-FIL-01']))
describe('Filipino pilot',()=>{
 it('loads the FIL family independently, only when requested',async()=>{
  const dummy={buildFamily:()=>new THREE.Group()},sca=vi.fn().mockResolvedValue(dummy),mcm=vi.fn().mockResolvedValue(dummy),fil=vi.fn().mockResolvedValue(dummy),loader=createFamilyPreparer({SCA:sca,MCM:mcm,FIL:fil,PLT:vi.fn().mockResolvedValue(dummy)})
  await loader.prepare('SCA');expect(fil).not.toHaveBeenCalled();await loader.prepare('FIL');expect(fil).toHaveBeenCalledTimes(1);expect(mcm).not.toHaveBeenCalled()
 })
 it('builds exact bounds, three regions, finite geometry and open grounded frames',()=>{
  const model=buildFurniture(item());try{
   expect(model.children.map(c=>c.name)).toEqual(['Upholstery','Frame','Weave']);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());expect(size.x).toBeCloseTo(.78,5);expect(size.y).toBeCloseTo(.82,5);expect(size.z).toBeCloseTo(.85,5);expect(bounds.min.y).toBeCloseTo(0,6)
   let tris=0;model.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.getAttribute('position'),norm=o.geometry.getAttribute('normal');for(let i=0;i<p.count;i++)expect([p.getX(i),p.getY(i),p.getZ(i),norm.getX(i),norm.getY(i),norm.getZ(i)].every(Number.isFinite)).toBe(true);tris+=(o.geometry.index?.count??p.count)/3});expect(tris).toBe(668)
   const frame=(model.getObjectByName('Frame') as THREE.Mesh).geometry.getAttribute('position');for(const x of [-.39,-.33,.33,.39])for(const z of [-.305,.305])expect(Array.from({length:frame.count},(_,i)=>i).some(i=>Math.abs(frame.getX(i)-x)<1e-6&&Math.abs(frame.getY(i))<1e-6&&Math.abs(frame.getZ(i)-z)<1e-6)).toBe(true)
   model.position.set(0,0,0);model.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(-1,.24,0),new THREE.Vector3(1,0,0));expect(ray.intersectObject(model,true)).toHaveLength(0)
   const rotated=buildFurniture({...item(),rotationDegrees:105,flipHorizontal:true,elevationMm:120});try{expect(rotated.scale.x).toBe(-1);expect(rotated.rotation.y).toBeCloseTo(-105*Math.PI/180);expect(rotated.position.y).toBeCloseTo(.12)}finally{disposeFurniture(rotated)}
  }finally{disposeFurniture(model)}
 })
 it('has outward geometry and one opaque shared texture-free cane appearance',()=>{
  const a=buildFurniture(item()),b=buildFurniture(item());try{
   const weave=a.getObjectByName('Weave') as THREE.Mesh,other=b.getObjectByName('Weave') as THREE.Mesh,mat=weave.material as THREE.MeshStandardMaterial
   expect(mat).toBe(other.material);expect(mat.color.getHexString()).toBe('c7a675');expect(mat.roughness).toBe(.9);expect(mat.opacity).toBe(1);expect(mat.transparent).toBe(false);expect(mat.map).toBeNull();expect(mat.alphaMap).toBeNull()
   for(const child of a.children){const g=(child as THREE.Mesh).geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),index=g.index,count=index?.count??p.count;for(let i=0;i<count;i+=3){const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2;const v=new THREE.Vector3().fromBufferAttribute(p,ia),cross=new THREE.Vector3().fromBufferAttribute(p,ib).sub(v).cross(new THREE.Vector3().fromBufferAttribute(p,ic).sub(v));if(cross.lengthSq()<1e-16)continue;const normal=new THREE.Vector3().fromBufferAttribute(n,ia).add(new THREE.Vector3().fromBufferAttribute(n,ib)).add(new THREE.Vector3().fromBufferAttribute(n,ic));expect(cross.dot(normal)).toBeGreaterThan(-1e-10)}}
   expect(mat.customProgramCacheKey()).toBe('nook-opaque-cane-v1')
   const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};mat.onBeforeCompile(shader as never,{} as never);expect(shader.fragmentShader).toContain('vCanePatternEnabled>0.5');expect(shader.fragmentShader).toContain('fwidth(coord)');expect(shader.fragmentShader).toContain('floor(u/60.0)+floor(v/60.0)')
   let lights=0;a.traverse(o=>{if(o instanceof THREE.Light)lights++});expect(lights).toBe(0)
  }finally{disposeFurniture(a);disposeFurniture(b)}
 })
 it('shares the authored concave plan, dimensions and containment',()=>{
  const p=createSampleProject((()=>{let n=0;return()=>String(++n)})()).project,chair=item(),concept=getConcept(2,chair.conceptId)!;p.instances=[chair]
  expect(concept.footprint?.kind).toBe('polygon');if(concept.footprint?.kind!=='polygon')return
  expect(concept.footprint.vertices).toEqual(FIL_CHAIR_CONTOUR.map(([xMm,zMm])=>({xMm,zMm})));expect(validatePolygonFootprint(concept.footprint.vertices,780,850)).toBeNull()
  const path=getPlanPrimitives(p).items[0].pathD;expect(path).toContain(polygonPath(concept.footprint.vertices));expect(path).toContain('M -300 -320 H 300');expect(validateProjectSpatial(p).filter(i=>i.severity==='hard')).toEqual([])
 })
})
