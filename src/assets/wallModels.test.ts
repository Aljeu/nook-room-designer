import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { WALL_CONCEPTS, WINDOW_STYLES } from '../catalog/wall'
import { buildWallPreview,buildWindowPreview,disposeWallModel,disposeWindowModel,prepareWallModels } from './wallModels'
beforeAll(()=>prepareWallModels())
describe('wall model families',()=>{
 for(const c of WALL_CONCEPTS)it(`constructs ${c.id} in its declared wall-local bounds`,()=>{const group=buildWallPreview(c.id,{...c.defaults});try{
  expect(group.children.length).toBeLessThanOrEqual(3)
  const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),halfWidth=c.widthMm/2000,outside=c.outsideProjectionMm??0
  expect(size.x).toBeCloseTo(c.widthMm/1000,4);expect(size.y).toBeCloseTo(c.heightMm/1000,4)
  expect(bounds.min.x).toBeCloseTo(-halfWidth,4);expect(bounds.max.x).toBeCloseTo(halfWidth,4)
  expect(bounds.min.y).toBeCloseTo(0,5);expect(bounds.max.y).toBeCloseTo(c.heightMm/1000,4)
  expect(bounds.min.z).toBeCloseTo(-outside/1000,4);expect(bounds.max.z).toBeCloseTo(c.depthMm/1000,4)
  expect(size.z).toBeCloseTo((c.depthMm+outside)/1000,4)
  let triangles=0,lights=0;group.traverse(o=>{if(o instanceof THREE.Light)lights++;if(o instanceof THREE.Mesh){const p=o.geometry.getAttribute('position');triangles+=(o.geometry.index?.count??p.count)/3;for(let i=0;i<p.count;i++)expect([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite)).toBe(true)}});expect(lights).toBe(0);expect(triangles).toBeLessThanOrEqual(3000)
 }finally{disposeWallModel(group)}})
 for(const style of WINDOW_STYLES)it(`builds ${style.id} around the opening dimensions`,()=>{const group=buildWindowPreview({id:'window',type:'window',wall:'N',offsetMm:0,widthMm:style.widthMm,heightMm:style.heightMm,sillMm:style.sillMm,styleId:style.id});try{const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());expect(size.x).toBeCloseTo(style.widthMm/1000,4);expect(size.y).toBeCloseTo(style.heightMm/1000,4);expect(group.children.map(o=>o.name)).toEqual(['Frame','Glazing'])}finally{disposeWindowModel(group)}})
 it('shares immutable geometry while previews and instances are in use',()=>{const a=buildWallPreview('PAN-FIL-01',{Frame:'OAK',Weave:'CAN'}),b=buildWallPreview('PAN-FIL-01',{Frame:'WAL',Weave:'CAN'});try{expect((a.children[0] as THREE.Mesh).geometry).toBe((b.children[0] as THREE.Mesh).geometry);expect((a.children[1] as THREE.Mesh).material).toBe((b.children[1] as THREE.Mesh).material)}finally{disposeWallModel(a);disposeWallModel(b)}})
})
