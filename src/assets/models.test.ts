import { describe, it, expect, beforeAll } from 'vitest'
import * as THREE from 'three'
import { createSampleProject } from '../domain/sample'
import { defaultFinishes, getConcept } from '../catalog'
import { buildFurniture, disposeFurniture, prepareFurniture } from './models'

beforeAll(()=>prepareFurniture(['SOF-SCA-01']))
const project=createSampleProject((()=>{let i=0;return()=>String(++i)})()).project
const dimensions:Record<string,[number,number,number]>={'SOF-SCA-01':[1.8,.8,.88],'CFT-SCA-01':[1.1,.38,.58],'RUG-SCA-01':[2.4,.01,1.7],'CHR-SCA-01':[.76,.78,.82],'SFT-SCA-01':[.42,.52,.42],'MED-SCA-01':[1.6,.48,.4],'BKC-SCA-01':[.8,1.6,.32],'LMP-SCA-01':[.42,1.5,.42]}
const regions:Record<string,string[]>={'SOF-SCA-01':['Upholstery','Frame'],'CFT-SCA-01':['Top','Frame'],'RUG-SCA-01':['Textile'],'CHR-SCA-01':['Upholstery','Frame'],'SFT-SCA-01':['Top','Frame'],'MED-SCA-01':['Body','Fronts','Frame'],'BKC-SCA-01':['Body'],'LMP-SCA-01':['Metalwork','Shade']}
describe('proof furniture geometry',()=>{
 const w1=['CHR-SCA-01','SFT-SCA-01','MED-SCA-01','BKC-SCA-01','LMP-SCA-01'].map(conceptId=>{const concept=getConcept(2,conceptId)!;return {id:conceptId,conceptId,centerXMm:2000,centerZMm:1500,quarterTurn:0 as const,finishes:defaultFinishes(concept)}})
 for(const item of [...project.instances,...w1]) it(`constructs ${item.conceptId} with correct bounds and region budgets`,()=>{
  const model=buildFurniture(item)
  try {
   expect(model.name).toBe(item.conceptId)
   expect(model.userData.instanceId).toBe(item.id)
   expect(model.children.map(c=>c.name)).toEqual(regions[item.conceptId])
   expect(model.children.length).toBeLessThanOrEqual(3)
   let triangles=0
   model.traverse(object=>{if(object instanceof THREE.Mesh){const position=object.geometry.getAttribute('position');expect(position.count).toBeGreaterThan(0);for(let i=0;i<position.count;i++)expect([position.getX(i),position.getY(i),position.getZ(i)].every(Number.isFinite)).toBe(true);triangles+=(object.geometry.index?.count??position.count)/3}})
   expect(triangles).toBeLessThanOrEqual(({'SOF-SCA-01':2128,'CFT-SCA-01':204,'RUG-SCA-01':44,'CHR-SCA-01':1048,'SFT-SCA-01':252,'MED-SCA-01':764,'BKC-SCA-01':176,'LMP-SCA-01':520} as Record<string,number>)[item.conceptId])
   const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()),want=dimensions[item.conceptId]
   expect(size.x).toBeCloseTo(want[0],5);expect(size.y).toBeCloseTo(want[1],5);expect(size.z).toBeCloseTo(want[2],5)
   const bound=new THREE.Box3().setFromObject(model);expect(bound.min.y).toBeCloseTo(0,5)
   model.rotation.y=-Math.PI/2;const rotated=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());expect(rotated.x).toBeCloseTo(want[2],5);expect(rotated.y).toBeCloseTo(want[1],5);expect(rotated.z).toBeCloseTo(want[0],5)
  } finally {disposeFurniture(model)}
 })
 it('builds a hollow lamp shade with triangle winding aligned to its normals',()=>{
  const concept=getConcept(2,'LMP-SCA-01')!
  const model=buildFurniture({id:'lamp',conceptId:concept.id,centerXMm:0,centerZMm:0,quarterTurn:0,finishes:defaultFinishes(concept)})
  try {const shade=model.getObjectByName('Shade') as THREE.Mesh;const geometry=shade.geometry,index=geometry.index!,position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal')
   for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);const va=new THREE.Vector3().fromBufferAttribute(position,a),vb=new THREE.Vector3().fromBufferAttribute(position,b),vc=new THREE.Vector3().fromBufferAttribute(position,c);const face=vb.sub(va).cross(vc.sub(va));const n=new THREE.Vector3().fromBufferAttribute(normal,a);expect(face.dot(n)).toBeGreaterThan(0)}
   expect(position.count).toBe(41*8)
  } finally {disposeFurniture(model)}
 })

})
